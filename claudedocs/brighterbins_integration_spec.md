# Especificação: Integração BrighterBins Vision API — Módulo de Entradas

> **Contexto:** Integração da BrighterBins Vision API no módulo de Entradas do Bee2Waste (Next.js + Tailwind + Supabase). O objetivo é enriquecer os registos de pesagem com dados automáticos de classificação de resíduos por visão computacional — captura de imagem no momento em que a viatura está sobre a balança, classificação pelo servidor BrighterBins e sincronização com o Bee2Waste.

---

## Índice

1. [Visão Geral do Fluxo](#1-visão-geral-do-fluxo)
2. [Estrutura da Base de Dados (Supabase)](#2-estrutura-da-base-de-dados-supabase)
3. [Configuração e Variáveis de Ambiente](#3-configuração-e-variáveis-de-ambiente)
4. [Camada de Serviço — BrighterBins Client](#4-camada-de-serviço--brighterbins-client)
5. [Server Actions / API Routes (Next.js)](#5-server-actions--api-routes-nextjs)
6. [Sincronização Automática](#6-sincronização-automática)
7. [Componentes de UI](#7-componentes-de-ui)
8. [Página de Entradas](#8-página-de-entradas)
9. [Tipos TypeScript](#9-tipos-typescript)
10. [Notas de Implementação](#10-notas-de-implementação)

---

## 1. Visão Geral do Fluxo

```
Viatura entra na instalação
        │
        ▼
Câmara captura imagem (viatura sobre balança)
        │
        ▼
Servidor BrighterBins processa e classifica resíduo
        │
        ▼
Bee2Waste faz polling via Time Series API
  [usa última data de sincronização guardada]
        │
        ▼
Novos registos guardados no Supabase
  [tabela: entrada_vision_readings]
        │
        ▼
Frontend mostra KPIs + lista/cartões com fotografias
```

### Regras de Negócio

- A sincronização **sempre usa a última data registada** (`last_sync_at`) para pedir apenas registos novos, evitando duplicados.
- Cada leitura BrighterBins é associada a uma `entrada_id` com base na correspondência temporal (timestamp da pesagem ± tolerância configurável).
- O `fill_level` e os campos de contaminação só têm valor se a IA estiver ativa no dispositivo BrighterBins.
- Imagens são guardadas como URL (não são descarregadas para o Supabase Storage).

---

## 2. Estrutura da Base de Dados (Supabase)

### 2.1 Tabela: `brighterbins_sync_state`

Guarda o estado da última sincronização por dispositivo.

```sql
create table brighterbins_sync_state (
  id              uuid primary key default gen_random_uuid(),
  device_id       text not null unique,          -- variant_id do dispositivo BrighterBins
  device_name     text,
  last_sync_at    timestamptz,                   -- última data de sincronização bem-sucedida
  last_uplink_ts  bigint,                        -- último uplink_time recebido (ms epoch)
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
```

### 2.2 Tabela: `entrada_vision_readings`

Cada linha representa uma leitura/uplink da câmara BrighterBins.

```sql
create table entrada_vision_readings (
  id                   uuid primary key default gen_random_uuid(),
  entrada_id           uuid references entradas(id) on delete set null,  -- ligação à entrada (pode ser null se não houver correspondência)

  -- Identificação BrighterBins
  device_id            text not null,             -- variant_id do dispositivo
  device_name          text,
  bin_id               text,

  -- Dados do uplink
  uplink_time          timestamptz not null,       -- convertido de ms epoch
  uplink_time_ms       bigint not null,            -- original em ms (para paginação)

  -- Imagens
  image_url            text,                       -- imagem original
  annotated_img_url    text,                       -- imagem com contaminação destacada

  -- Classificação de resíduos
  fill_level           numeric(5,2),               -- percentagem (pode > 100% em overflow)
  contamination        text[],                     -- array de categorias: ['plastic', 'glass', ...]
  contamination_count  integer default 0,

  -- Estado do dispositivo no momento
  battery_level        integer,
  battery_type         text,
  temperature          numeric(5,2),
  flash_on             boolean,
  orientation          text,
  image_quality        text,
  image_resolution     text,

  -- Metadados de sincronização
  synced_at            timestamptz default now(),

  created_at           timestamptz default now()
);

-- Índices
create index idx_vision_readings_entrada_id on entrada_vision_readings(entrada_id);
create index idx_vision_readings_device_id  on entrada_vision_readings(device_id);
create index idx_vision_readings_uplink_time on entrada_vision_readings(uplink_time desc);
create index idx_vision_readings_contamination on entrada_vision_readings using gin(contamination);
```

### 2.3 RLS (Row Level Security)

```sql
-- Leituras visíveis apenas para utilizadores autenticados da mesma organização
alter table entrada_vision_readings enable row level security;
alter table brighterbins_sync_state  enable row level security;

create policy "Leituras visíveis para utilizadores autenticados"
  on entrada_vision_readings for select
  using (auth.role() = 'authenticated');

create policy "Sync state visível para utilizadores autenticados"
  on brighterbins_sync_state for select
  using (auth.role() = 'authenticated');

-- Service role tem acesso total (para o cron/sync)
create policy "Service role acesso total readings"
  on entrada_vision_readings for all
  using (auth.role() = 'service_role');

create policy "Service role acesso total sync state"
  on brighterbins_sync_state for all
  using (auth.role() = 'service_role');
```

---

## 3. Configuração e Variáveis de Ambiente

```bash
# .env.local

# BrighterBins
BRIGHTERBINS_API_URL=https://api.brighterbins.com
BRIGHTERBINS_EMAIL=utilizador@empresa.com
BRIGHTERBINS_PASSWORD=palavra-passe-segura

# Tolerância em minutos para associar uma leitura a uma entrada (pesagem)
BRIGHTERBINS_MATCH_TOLERANCE_MINUTES=10

# Tamanho de página para paginação da Time Series API
BRIGHTERBINS_PAGE_SIZE=100
```

---

## 4. Camada de Serviço — BrighterBins Client

### `lib/brighterbins/client.ts`

```typescript
import type { BrighterBinsDevice, TimeSeriesResponse, LoginResponse } from '@/types/brighterbins'

const BASE_URL = process.env.BRIGHTERBINS_API_URL!

let cachedToken: string | null = null
let tokenExpiry: number | null = null

/**
 * Autentica e retorna o Bearer Token.
 * Faz cache do token enquanto não expirar (estimado 1h).
 */
export async function getBrighterBinsToken(): Promise<string> {
  const now = Date.now()
  if (cachedToken && tokenExpiry && now < tokenExpiry) {
    return cachedToken
  }

  const res = await fetch(`${BASE_URL}/auth/sign_in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.BRIGHTERBINS_EMAIL,
      password: process.env.BRIGHTERBINS_PASSWORD,
      remember_me: true,
    }),
  })

  if (!res.ok) throw new Error(`BrighterBins auth failed: ${res.status}`)

  const data: LoginResponse = await res.json()
  if (!data.success || !data.token) throw new Error('BrighterBins: token não recebido')

  cachedToken = data.token
  tokenExpiry = now + 55 * 60 * 1000 // 55 minutos (margem de segurança)
  return cachedToken
}

/**
 * Lista todos os dispositivos Vision disponíveis.
 */
export async function listVisionDevices(): Promise<BrighterBinsDevice[]> {
  const token = await getBrighterBinsToken()
  const res = await fetch(`${BASE_URL}/vision/list`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`BrighterBins vision/list failed: ${res.status}`)
  const data = await res.json()
  return data.devices ?? []
}

/**
 * Obtém dados de série temporal de um dispositivo.
 * Suporta paginação automática — retorna TODOS os registos no intervalo.
 */
export async function fetchTimeSeriesAll(
  deviceId: string,
  fromMs: number,
  toMs: number
): Promise<TimeSeriesResponse['data']> {
  const token = await getBrighterBinsToken()
  const pageSize = parseInt(process.env.BRIGHTERBINS_PAGE_SIZE ?? '100')
  let pageNumber = 1
  let allData: TimeSeriesResponse['data'] = []
  let deviceDetail: TimeSeriesResponse['deviceDetail'] | null = null

  while (true) {
    const res = await fetch(`${BASE_URL}/vision/timeseries/v2`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: deviceId,
        from: fromMs,
        to: toMs,
        status: 'all',
        page_number: pageNumber,
        page_size: pageSize,
      }),
    })

    if (!res.ok) throw new Error(`BrighterBins timeseries failed: ${res.status}`)

    const json: TimeSeriesResponse = await res.json()
    deviceDetail = json.deviceDetail

    if (!json.data || json.data.length === 0) break
    allData = allData.concat(json.data)

    // Parar se já recebemos todos os registos
    if (allData.length >= json.total_records) break
    pageNumber++
  }

  return allData
}
```

---

## 5. Server Actions / API Routes (Next.js)

### `lib/brighterbins/sync.ts`

Função principal de sincronização — chamada pelo cron ou manualmente.

```typescript
import { createClient } from '@/lib/supabase/server'
import { listVisionDevices, fetchTimeSeriesAll } from './client'
import type { VisionReading } from '@/types/brighterbins'

const MATCH_TOLERANCE_MS =
  parseInt(process.env.BRIGHTERBINS_MATCH_TOLERANCE_MINUTES ?? '10') * 60 * 1000

/**
 * Sincroniza leituras BrighterBins para todos os dispositivos.
 * Usa a última data de sync guardada no Supabase.
 */
export async function syncBrighterBinsReadings(): Promise<{
  synced: number
  matched: number
  errors: string[]
}> {
  const supabase = createClient()
  const now = Date.now()
  const errors: string[] = []
  let totalSynced = 0
  let totalMatched = 0

  // 1. Obter lista de dispositivos
  const devices = await listVisionDevices()

  for (const device of devices) {
    try {
      // 2. Ler último estado de sincronização deste dispositivo
      const { data: syncState } = await supabase
        .from('brighterbins_sync_state')
        .select('*')
        .eq('device_id', device.variant_id)
        .single()

      // Se nunca sincronizou, começa das últimas 24h
      const fromMs = syncState?.last_uplink_ts
        ? syncState.last_uplink_ts + 1   // +1ms para evitar duplicado
        : now - 24 * 60 * 60 * 1000

      // 3. Ir buscar novos dados
      const readings = await fetchTimeSeriesAll(device.variant_id, fromMs, now)

      if (readings.length === 0) continue

      // 4. Para cada leitura, tentar associar a uma entrada
      const rowsToInsert: VisionReading[] = []

      for (const r of readings) {
        const uplinkTime = new Date(r.uplink_time)

        // Procurar entrada no intervalo de tolerância
        const { data: entrada } = await supabase
          .from('entradas')
          .select('id')
          .gte('data_entrada', new Date(r.uplink_time - MATCH_TOLERANCE_MS).toISOString())
          .lte('data_entrada', new Date(r.uplink_time + MATCH_TOLERANCE_MS).toISOString())
          .order('data_entrada', { ascending: false })
          .limit(1)
          .single()

        if (entrada) totalMatched++

        rowsToInsert.push({
          entrada_id:          entrada?.id ?? null,
          device_id:           device.variant_id,
          device_name:         r.deviceDetail?.name ?? device.variant,
          bin_id:              r.deviceDetail?.bin_id ?? null,
          uplink_time:         uplinkTime.toISOString(),
          uplink_time_ms:      r.uplink_time,
          image_url:           r.image_url ?? null,
          annotated_img_url:   r.annotated_img ?? null,
          fill_level:          r.fill_level ?? null,
          contamination:       r.contamination ?? [],
          contamination_count: r.contaminationCount ?? 0,
          battery_level:       r.battery_level ?? null,
          battery_type:        r.battery_type ?? null,
          temperature:         r.temperature ?? null,
          flash_on:            r.flash === 1,
          orientation:         r.orientation ?? null,
          image_quality:       r.image_quality ?? null,
          image_resolution:    r.image_resolution ?? null,
        })
      }

      // 5. Inserir no Supabase (ignorar duplicados por uplink_time + device_id)
      const { error: insertError } = await supabase
        .from('entrada_vision_readings')
        .upsert(rowsToInsert, {
          onConflict: 'device_id,uplink_time_ms',
          ignoreDuplicates: true,
        })

      if (insertError) {
        errors.push(`Device ${device.variant_id}: ${insertError.message}`)
        continue
      }

      totalSynced += rowsToInsert.length

      // 6. Atualizar estado de sincronização
      const lastUplinkTs = Math.max(...readings.map(r => r.uplink_time))
      await supabase
        .from('brighterbins_sync_state')
        .upsert({
          device_id:       device.variant_id,
          device_name:     device.variant,
          last_sync_at:    new Date().toISOString(),
          last_uplink_ts:  lastUplinkTs,
          updated_at:      new Date().toISOString(),
        }, { onConflict: 'device_id' })

    } catch (err) {
      errors.push(`Device ${device.variant_id}: ${String(err)}`)
    }
  }

  return { synced: totalSynced, matched: totalMatched, errors }
}
```

### `app/api/brighterbins/sync/route.ts`

Endpoint para sincronização manual ou via cron (ex: Vercel Cron, pg_cron).

```typescript
import { NextResponse } from 'next/server'
import { syncBrighterBinsReadings } from '@/lib/brighterbins/sync'

// Proteção por secret para chamadas de cron
export async function POST(req: Request) {
  const secret = req.headers.get('x-sync-secret')
  if (secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await syncBrighterBinsReadings()
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
```

### `app/api/brighterbins/sync/route.ts` — Vercel Cron

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/brighterbins/sync",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

---

## 6. Sincronização Automática

### Fluxo de Paginação com `last_uplink_ts`

```
1ª sincronização:
  fromMs = agora - 24h
  toMs   = agora
  → guarda last_uplink_ts = maior uplink_time recebido

2ª sincronização (15min depois):
  fromMs = last_uplink_ts + 1ms   ← evita duplicados
  toMs   = agora
  → guarda novo last_uplink_ts

Em caso de erro:
  → last_uplink_ts não é atualizado
  → próxima sync retoma do mesmo ponto
```

### Correspondência com Entradas (Matching)

```
Para cada leitura BrighterBins com uplink_time = T:
  Procurar em `entradas` onde:
    data_entrada ENTRE (T - tolerância) E (T + tolerância)
  
  Se encontrar → entrada_id = id da entrada mais próxima
  Se não encontrar → entrada_id = null (leitura guardada na mesma)
```

---

## 7. Componentes de UI

### 7.1 KPI Cards — `components/entradas/VisionKPICards.tsx`

```tsx
import { createClient } from '@/lib/supabase/server'

interface KPIData {
  totalReadings: number
  avgFillLevel: number | null
  contaminationRate: number   // % de entradas com contaminação
  topContaminants: { name: string; count: number }[]
  lastSyncAt: string | null
  devicesOnline: number
}

async function getVisionKPIs(): Promise<KPIData> {
  const supabase = createClient()

  // Total de leituras nos últimos 30 dias
  const { count: totalReadings } = await supabase
    .from('entrada_vision_readings')
    .select('*', { count: 'exact', head: true })
    .gte('uplink_time', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

  // Média de fill level
  const { data: fillData } = await supabase
    .from('entrada_vision_readings')
    .select('fill_level')
    .not('fill_level', 'is', null)
    .gte('uplink_time', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

  const avgFillLevel = fillData?.length
    ? Math.round(fillData.reduce((acc, r) => acc + (r.fill_level ?? 0), 0) / fillData.length)
    : null

  // Taxa de contaminação
  const { count: withContamination } = await supabase
    .from('entrada_vision_readings')
    .select('*', { count: 'exact', head: true })
    .gt('contamination_count', 0)
    .gte('uplink_time', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

  const contaminationRate = totalReadings
    ? Math.round(((withContamination ?? 0) / totalReadings) * 100)
    : 0

  // Top contaminantes (via função RPC ou processamento)
  const { data: contaminantData } = await supabase
    .rpc('get_top_contaminants', { days: 30 })

  // Última sync
  const { data: syncState } = await supabase
    .from('brighterbins_sync_state')
    .select('last_sync_at')
    .order('last_sync_at', { ascending: false })
    .limit(1)
    .single()

  return {
    totalReadings:     totalReadings ?? 0,
    avgFillLevel,
    contaminationRate,
    topContaminants:   contaminantData ?? [],
    lastSyncAt:        syncState?.last_sync_at ?? null,
    devicesOnline:     0, // preencher conforme necessário
  }
}

export async function VisionKPICards() {
  const kpis = await getVisionKPIs()

  const cards = [
    {
      label:    'Leituras (30 dias)',
      value:    kpis.totalReadings.toLocaleString('pt-PT'),
      icon:     '📷',
      color:    'bg-blue-50 border-blue-200',
    },
    {
      label:    'Nível Médio de Enchimento',
      value:    kpis.avgFillLevel !== null ? `${kpis.avgFillLevel}%` : '—',
      icon:     '📦',
      color:    'bg-emerald-50 border-emerald-200',
    },
    {
      label:    'Taxa de Contaminação',
      value:    `${kpis.contaminationRate}%`,
      icon:     '⚠️',
      color:    kpis.contaminationRate > 20
                  ? 'bg-red-50 border-red-200'
                  : 'bg-amber-50 border-amber-200',
    },
    {
      label:    'Última Sincronização',
      value:    kpis.lastSyncAt
                  ? new Intl.DateTimeFormat('pt-PT', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    }).format(new Date(kpis.lastSyncAt))
                  : 'Nunca',
      icon:     '🔄',
      color:    'bg-gray-50 border-gray-200',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-xl border p-4 ${card.color}`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {card.label}
              </p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {card.value}
              </p>
            </div>
            <span className="text-2xl">{card.icon}</span>
          </div>
        </div>
      ))}

      {/* Top Contaminantes */}
      {kpis.topContaminants.length > 0 && (
        <div className="col-span-2 lg:col-span-4 rounded-xl border border-orange-200 bg-orange-50 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            Top Contaminantes (30 dias)
          </p>
          <div className="flex flex-wrap gap-2">
            {kpis.topContaminants.slice(0, 8).map((c) => (
              <span
                key={c.name}
                className="inline-flex items-center gap-1 rounded-full bg-orange-100 border border-orange-300 px-3 py-1 text-sm font-medium text-orange-800"
              >
                {c.name}
                <span className="rounded-full bg-orange-200 px-1.5 text-xs">
                  {c.count}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

### 7.2 Lista de Leituras — `components/entradas/VisionReadingsList.tsx`

```tsx
'use client'

import { useState } from 'react'
import { VisionReadingCard } from './VisionReadingCard'
import { VisionReadingRow } from './VisionReadingRow'
import type { EntradaVisionReading } from '@/types/brighterbins'

type ViewMode = 'cards' | 'list'

interface Props {
  readings: EntradaVisionReading[]
  entradaId?: string  // se passado, filtra por esta entrada
}

export function VisionReadingsList({ readings, entradaId }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const [filter, setFilter] = useState<'all' | 'contaminated' | 'clean'>('all')

  const filtered = readings.filter((r) => {
    if (filter === 'contaminated') return (r.contamination_count ?? 0) > 0
    if (filter === 'clean')        return (r.contamination_count ?? 0) === 0
    return true
  })

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1 gap-1">
          {(['all', 'contaminated', 'clean'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f === 'all' && 'Todos'}
              {f === 'contaminated' && '⚠️ Com contaminação'}
              {f === 'clean' && '✅ Limpos'}
            </button>
          ))}
        </div>

        {/* Toggle vista */}
        <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1 gap-1">
          <button
            onClick={() => setViewMode('cards')}
            className={`rounded-md p-1.5 transition-colors ${
              viewMode === 'cards'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-400 hover:text-gray-600'
            }`}
            aria-label="Vista em cartões"
          >
            <GridIcon />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`rounded-md p-1.5 transition-colors ${
              viewMode === 'list'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-400 hover:text-gray-600'
            }`}
            aria-label="Vista em lista"
          >
            <ListIcon />
          </button>
        </div>
      </div>

      {/* Contagem */}
      <p className="text-sm text-gray-500">
        {filtered.length} leitura{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* Vista em cartões */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((reading) => (
            <VisionReadingCard key={reading.id} reading={reading} />
          ))}
        </div>
      )}

      {/* Vista em lista */}
      {viewMode === 'list' && (
        <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <span>Imagem</span>
            <span>Data/Hora</span>
            <span>Enchimento</span>
            <span>Contaminação</span>
            <span>Bateria</span>
            <span></span>
          </div>
          {filtered.map((reading) => (
            <VisionReadingRow key={reading.id} reading={reading} />
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="py-16 text-center text-gray-400">
          <p className="text-4xl mb-2">📷</p>
          <p className="font-medium">Sem leituras para mostrar</p>
        </div>
      )}
    </div>
  )
}

function GridIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  )
}
```

### 7.3 Cartão de Leitura — `components/entradas/VisionReadingCard.tsx`

```tsx
import Image from 'next/image'
import type { EntradaVisionReading } from '@/types/brighterbins'

interface Props {
  reading: EntradaVisionReading
}

export function VisionReadingCard({ reading }: Props) {
  const hasContamination = (reading.contamination_count ?? 0) > 0
  const imageUrl = reading.annotated_img_url ?? reading.image_url

  return (
    <div className="group rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
      {/* Imagem */}
      <div className="relative aspect-video bg-gray-100">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt="Leitura de visão"
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-300">
            <span className="text-4xl">📷</span>
          </div>
        )}

        {/* Badge contaminação */}
        {hasContamination && (
          <div className="absolute top-2 right-2 rounded-full bg-red-500 text-white text-xs font-bold px-2 py-0.5">
            ⚠️ {reading.contamination_count}
          </div>
        )}

        {/* Badge fill level */}
        {reading.fill_level !== null && (
          <div className="absolute bottom-2 left-2 rounded-full bg-black/60 text-white text-xs font-medium px-2 py-0.5">
            {Math.round(reading.fill_level ?? 0)}% cheio
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        {/* Data/Hora */}
        <p className="text-sm font-medium text-gray-900">
          {new Intl.DateTimeFormat('pt-PT', {
            dateStyle: 'short',
            timeStyle: 'short',
          }).format(new Date(reading.uplink_time))}
        </p>

        {/* Contaminantes */}
        {hasContamination && reading.contamination && reading.contamination.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {reading.contamination.slice(0, 3).map((c) => (
              <span
                key={c}
                className="rounded-full bg-red-50 border border-red-200 text-red-700 text-xs px-2 py-0.5"
              >
                {c}
              </span>
            ))}
            {reading.contamination.length > 3 && (
              <span className="text-xs text-gray-400">
                +{reading.contamination.length - 3}
              </span>
            )}
          </div>
        )}

        {!hasContamination && (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
            ✓ Sem contaminação
          </span>
        )}

        {/* Bateria */}
        {reading.battery_level !== null && (
          <div className="flex items-center gap-2">
            <BatteryIndicator level={reading.battery_level ?? 0} />
            <span className="text-xs text-gray-400">{reading.battery_level}%</span>
          </div>
        )}
      </div>
    </div>
  )
}

function BatteryIndicator({ level }: { level: number }) {
  const color =
    level > 50 ? 'bg-emerald-400' :
    level > 20 ? 'bg-amber-400' :
    'bg-red-400'

  return (
    <div className="flex h-3 w-6 items-center rounded-sm border border-gray-300 bg-gray-100 overflow-hidden">
      <div
        className={`h-full ${color} transition-all`}
        style={{ width: `${level}%` }}
      />
    </div>
  )
}
```

### 7.4 Linha de Lista — `components/entradas/VisionReadingRow.tsx`

```tsx
import Image from 'next/image'
import type { EntradaVisionReading } from '@/types/brighterbins'

interface Props {
  reading: EntradaVisionReading
}

export function VisionReadingRow({ reading }: Props) {
  const hasContamination = (reading.contamination_count ?? 0) > 0

  return (
    <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors">
      {/* Thumbnail */}
      <div className="relative h-12 w-16 overflow-hidden rounded-lg bg-gray-100 flex-shrink-0">
        {reading.image_url ? (
          <Image
            src={reading.annotated_img_url ?? reading.image_url}
            alt=""
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-300 text-lg">📷</div>
        )}
      </div>

      {/* Data */}
      <div>
        <p className="text-sm font-medium text-gray-900">
          {new Intl.DateTimeFormat('pt-PT', {
            dateStyle: 'short',
            timeStyle: 'short',
          }).format(new Date(reading.uplink_time))}
        </p>
        {reading.device_name && (
          <p className="text-xs text-gray-400">{reading.device_name}</p>
        )}
      </div>

      {/* Fill Level */}
      <div className="text-sm text-center">
        {reading.fill_level !== null ? (
          <span className="font-semibold text-gray-700">
            {Math.round(reading.fill_level ?? 0)}%
          </span>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </div>

      {/* Contaminação */}
      <div className="text-sm">
        {hasContamination ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs px-2 py-0.5">
            ⚠️ {reading.contamination_count}
          </span>
        ) : (
          <span className="text-xs text-emerald-600 font-medium">✓ Limpo</span>
        )}
      </div>

      {/* Bateria */}
      <div className="text-xs text-gray-400 text-center">
        {reading.battery_level !== null ? `${reading.battery_level}%` : '—'}
      </div>

      {/* Ações */}
      <div>
        {reading.image_url && (
          <a
            href={reading.image_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline"
          >
            Ver
          </a>
        )}
      </div>
    </div>
  )
}
```

---

## 8. Página de Entradas

### `app/(dashboard)/entradas/[id]/page.tsx` — Secção Vision

```tsx
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { VisionKPICards } from '@/components/entradas/VisionKPICards'
import { VisionReadingsList } from '@/components/entradas/VisionReadingsList'
import { SyncButton } from '@/components/entradas/SyncButton'

interface Props {
  params: { id: string }
}

async function getReadingsForEntrada(entradaId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('entrada_vision_readings')
    .select('*')
    .eq('entrada_id', entradaId)
    .order('uplink_time', { ascending: false })
  return data ?? []
}

export default async function EntradaPage({ params }: Props) {
  const readings = await getReadingsForEntrada(params.id)

  return (
    <div className="space-y-8">
      {/* ... outros campos da entrada ... */}

      {/* Secção Classificação de Resíduos */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Classificação de Resíduos
            </h2>
            <p className="text-sm text-gray-500">
              Dados automáticos de visão computacional
            </p>
          </div>
          <SyncButton />
        </div>

        <Suspense fallback={<KPISkeleton />}>
          <VisionKPICards />
        </Suspense>

        <div className="mt-6">
          <VisionReadingsList readings={readings} entradaId={params.id} />
        </div>
      </section>
    </div>
  )
}

function KPISkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
      ))}
    </div>
  )
}
```

### `components/entradas/SyncButton.tsx` — Botão de Sincronização Manual

```tsx
'use client'

import { useState } from 'react'

export function SyncButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function handleSync() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/brighterbins/sync', {
        method: 'POST',
        headers: { 'x-sync-secret': process.env.NEXT_PUBLIC_SYNC_SECRET ?? '' },
      })
      const data = await res.json()
      if (data.success) {
        setResult(`✓ ${data.synced} leituras sincronizadas`)
      } else {
        setResult(`Erro: ${data.error}`)
      }
    } catch {
      setResult('Erro de ligação')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {result && (
        <span className="text-sm text-gray-500">{result}</span>
      )}
      <button
        onClick={handleSync}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
      >
        <span className={loading ? 'animate-spin' : ''}>🔄</span>
        {loading ? 'A sincronizar...' : 'Sincronizar'}
      </button>
    </div>
  )
}
```

---

## 9. Tipos TypeScript

### `types/brighterbins.ts`

```typescript
// Resposta do Login
export interface LoginResponse {
  success: boolean
  message: string
  token: string
  refreshToken: string
  company: string
  name: string
  child_companies: { id: number; [key: string]: unknown }[]
}

// Dispositivo da lista
export interface BrighterBinsDevice {
  variant:    string
  variant_id: string
  status:     'Online' | 'Offline' | 'Low Battery' | 'Created'
}

// Detalhe do dispositivo na Time Series
export interface DeviceDetail {
  company_name:          string
  bin_id:                string
  name:                  string
  unique_random_number:  string
  variant:               string
  address:               string
  lat:                   string
  lng:                   string
  last_seen:             number
}

// Registo individual de uplink
export interface UplinkRecord {
  uplink_time:        number       // ms epoch
  image_url:          string | null
  orientation:        string | null
  battery_level:      number | null
  fill_level:         number | null
  contamination:      string[] | null
  contaminationCount: number | null
  annotated_img:      string | null
  image_quality:      string | null
  image_resolution:   string | null
  temperature:        number | null
  flash:              0 | 1
  battery_type:       'primary' | 'solar' | 'adapter' | 'backup battery' | null
  deviceDetail?:      DeviceDetail
}

// Resposta completa da Time Series API
export interface TimeSeriesResponse {
  deviceDetail:  DeviceDetail
  data:          UplinkRecord[]
  total_records: number
  page_number:   number
  page_size:     number
}

// Linha da tabela Supabase entrada_vision_readings
export interface EntradaVisionReading {
  id:                  string
  entrada_id:          string | null
  device_id:           string
  device_name:         string | null
  bin_id:              string | null
  uplink_time:         string        // ISO string
  uplink_time_ms:      number
  image_url:           string | null
  annotated_img_url:   string | null
  fill_level:          number | null
  contamination:       string[] | null
  contamination_count: number | null
  battery_level:       number | null
  battery_type:        string | null
  temperature:         number | null
  flash_on:            boolean | null
  orientation:         string | null
  image_quality:       string | null
  image_resolution:    string | null
  synced_at:           string
  created_at:          string
}

// Para inserção no Supabase (sem id/created_at)
export type VisionReading = Omit<EntradaVisionReading, 'id' | 'created_at' | 'synced_at'>
```

---

## 10. Notas de Implementação

### Correspondência Temporal (Matching)

A associação de uma leitura BrighterBins a uma entrada Bee2Waste é feita por proximidade temporal. A tolerância padrão é **10 minutos**, configurável via `BRIGHTERBINS_MATCH_TOLERANCE_MINUTES`. Recomenda-se ajustar este valor de acordo com o fluxo operacional da instalação.

### Paginação e Volume de Dados

A função `fetchTimeSeriesAll` itera automaticamente por todas as páginas. Com `page_size: 100`, para volumes elevados (ex: >1000 registos por sync), considerar aumentar `page_size` ou ajustar a frequência do cron para reduzir o volume por chamada.

### Imagens e `annotated_img`

A `annotated_img_url` só existe se a IA de contaminação estiver ativa no dispositivo. O componente de cartão usa `annotated_img_url ?? image_url`, mostrando sempre a melhor imagem disponível.

### Overflow no Fill Level

O `fill_level` pode ultrapassar 100% em situações de overflow do contentor. A UI deve tratar estes casos sem truncar o valor — por exemplo, mostrando `>100%` ou usando uma cor de alerta.

### Função RPC Supabase para Top Contaminantes

```sql
create or replace function get_top_contaminants(days int default 30)
returns table(name text, count bigint)
language sql stable as $$
  select
    unnest(contamination) as name,
    count(*) as count
  from entrada_vision_readings
  where
    uplink_time >= now() - (days || ' days')::interval
    and contamination is not null
    and array_length(contamination, 1) > 0
  group by 1
  order by 2 desc
  limit 10;
$$;
```

### Segurança

- O endpoint `/api/brighterbins/sync` deve ser protegido por `SYNC_SECRET` para evitar chamadas não autorizadas.
- As credenciais BrighterBins (`BRIGHTERBINS_EMAIL`, `BRIGHTERBINS_PASSWORD`) devem estar apenas em variáveis de ambiente do servidor — nunca expostas ao cliente.
- O token JWT BrighterBins está em cache em memória no servidor Next.js (não persistido). Reiniciar o servidor força nova autenticação.

### Estrutura de Ficheiros

```
├── app/
│   ├── api/
│   │   └── brighterbins/
│   │       └── sync/
│   │           └── route.ts
│   └── (dashboard)/
│       └── entradas/
│           └── [id]/
│               └── page.tsx
├── components/
│   └── entradas/
│       ├── VisionKPICards.tsx
│       ├── VisionReadingsList.tsx
│       ├── VisionReadingCard.tsx
│       ├── VisionReadingRow.tsx
│       └── SyncButton.tsx
├── lib/
│   └── brighterbins/
│       ├── client.ts
│       └── sync.ts
├── types/
│   └── brighterbins.ts
└── vercel.json
```
