# Especificação: Integração BrighterBins Vision API — Módulo de Entradas (v2)

> **Versão**: 2.0 — Incorpora esclarecimentos de arquitetura, park-scoping, associação de câmaras por parque e padrão Server Action.
>
> **Contexto**: Integração da BrighterBins Vision API no módulo de Entradas do Bee2Waste (Next.js 15 + Supabase). Enriquece registos de pesagem com dados automáticos de classificação de resíduos por visão computacional — captura de imagem no momento em que a viatura está sobre a balança, classificação pelo servidor BrighterBins e sincronização com o Bee2Waste.
>
> **Pressuposto de infraestrutura**: Uma única balança por parque. O matching temporal é suficiente para associar leituras a entradas.

---

## Índice

1. [Visão Geral do Fluxo](#1-visão-geral-do-fluxo)
2. [Estrutura da Base de Dados](#2-estrutura-da-base-de-dados)
3. [Configuração e Variáveis de Ambiente](#3-configuração-e-variáveis-de-ambiente)
4. [Camada de Serviço — BrighterBins Client](#4-camada-de-serviço--brighterbins-client)
5. [Sincronização — Função Principal](#5-sincronização--função-principal)
6. [Server Actions e Cron Route](#6-server-actions-e-cron-route)
7. [Configuração de Câmaras por Parque (Settings)](#7-configuração-de-câmaras-por-parque-settings)
8. [Componentes de UI](#8-componentes-de-ui)
9. [Integração na Página de Entradas](#9-integração-na-página-de-entradas)
10. [Tipos TypeScript](#10-tipos-typescript)
11. [Estrutura de Ficheiros](#11-estrutura-de-ficheiros)
12. [Migrações SQL](#12-migrações-sql)
13. [Notas de Implementação](#13-notas-de-implementação)
14. [Frontend Design — Secção na Página de Detalhe de Entrada](#14-frontend-design--secção-na-página-de-detalhe-de-entrada)
15. [Frontend Design — Página de Configuração de Câmaras (Settings)](#15-frontend-design--página-de-configuração-de-câmaras-settings)

---

## 1. Visão Geral do Fluxo

```
Viatura entra na instalação
        │
        ▼
Câmara BrighterBins captura imagem (viatura sobre a balança)
        │
        ▼
Servidor BrighterBins processa e classifica resíduo
        │
        ▼
Bee2Waste faz polling via Time Series API (cron cada 15 min)
  [usa last_uplink_ts guardado por dispositivo]
        │
        ▼
Para cada leitura: procura entrada em entries.created_at ± tolerância
  [single balança por parque → matching temporal simples]
        │
        ▼
Registos guardados em entrada_vision_readings com park_id
        │
        ▼
Frontend mostra KPIs + lista/cartões com fotografias (filtrado por parque)
```

### Regras de Negócio

- A sincronização **sempre usa o último `last_uplink_ts`** por dispositivo para pedir apenas registos novos — evita duplicados e é resiliente a falhas.
- Cada leitura é associada a uma `entry_id` com base em `entries.created_at ± tolerância` (campo `created_at` da tabela `entries`).
- Cada parque tem as suas câmaras associadas explicitamente em `park_brighterbins_devices`.
- O sync agrega apenas as câmaras associadas ao parque — sem mistura de dados entre parques.
- URLs das imagens são permanentes — guardadas como URL, sem download para Supabase Storage.
- A autenticação BrighterBins é feita a cada invocação do sync (ambiente serverless stateless — sem cache de token).

---

## 2. Estrutura da Base de Dados

### 2.1 Tabela: `park_brighterbins_devices`

Associa câmaras BrighterBins a parques. Gerida através da página de configurações.

```sql
CREATE TABLE park_brighterbins_devices (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  park_id      UUID NOT NULL REFERENCES parks(id) ON DELETE CASCADE,
  device_id    TEXT NOT NULL,   -- variant_id do dispositivo BrighterBins
  device_name  TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  added_at     TIMESTAMPTZ DEFAULT now(),
  added_by     UUID REFERENCES profiles(id),
  UNIQUE(park_id, device_id)
);

CREATE INDEX idx_park_bb_devices_park ON park_brighterbins_devices(park_id);
CREATE INDEX idx_park_bb_devices_active ON park_brighterbins_devices(park_id, is_active);
```

### 2.2 Tabela: `brighterbins_sync_state`

Estado da última sincronização por dispositivo (para paginação incremental).

```sql
CREATE TABLE brighterbins_sync_state (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id       TEXT NOT NULL UNIQUE,
  device_name     TEXT,
  last_sync_at    TIMESTAMPTZ,
  last_uplink_ts  BIGINT,        -- último uplink_time recebido (ms epoch)
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
```

### 2.3 Tabela: `entrada_vision_readings`

Uma linha por leitura/uplink da câmara. Inclui `park_id` para isolamento de dados por parque.

```sql
CREATE TABLE entrada_vision_readings (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  park_id              UUID NOT NULL REFERENCES parks(id),
  entry_id             UUID REFERENCES entries(id) ON DELETE SET NULL,

  -- Identificação BrighterBins
  device_id            TEXT NOT NULL,
  device_name          TEXT,
  bin_id               TEXT,

  -- Dados do uplink
  uplink_time          TIMESTAMPTZ NOT NULL,
  uplink_time_ms       BIGINT NOT NULL,

  -- Imagens (URLs permanentes — sem expiração)
  image_url            TEXT,
  annotated_img_url    TEXT,   -- imagem anotada com contaminação (se IA ativa)

  -- Classificação de resíduos
  fill_level           NUMERIC(5,2),        -- percentagem (pode > 100% em overflow)
  contamination        TEXT[],              -- ex: ['plastic', 'glass']
  contamination_count  INTEGER DEFAULT 0,

  -- Estado do dispositivo
  battery_level        INTEGER,
  battery_type         TEXT,
  temperature          NUMERIC(5,2),
  flash_on             BOOLEAN,
  orientation          TEXT,
  image_quality        TEXT,
  image_resolution     TEXT,

  -- Metadados
  synced_at            TIMESTAMPTZ DEFAULT now(),
  created_at           TIMESTAMPTZ DEFAULT now(),

  UNIQUE(device_id, uplink_time_ms)
);

CREATE INDEX idx_vision_readings_park      ON entrada_vision_readings(park_id);
CREATE INDEX idx_vision_readings_entry     ON entrada_vision_readings(entry_id);
CREATE INDEX idx_vision_readings_device    ON entrada_vision_readings(device_id);
CREATE INDEX idx_vision_readings_uplink    ON entrada_vision_readings(uplink_time DESC);
CREATE INDEX idx_vision_readings_contam    ON entrada_vision_readings USING GIN(contamination);
```

### 2.4 RLS (Row Level Security)

```sql
ALTER TABLE park_brighterbins_devices  ENABLE ROW LEVEL SECURITY;
ALTER TABLE brighterbins_sync_state    ENABLE ROW LEVEL SECURITY;
ALTER TABLE entrada_vision_readings    ENABLE ROW LEVEL SECURITY;

-- Leituras: visíveis por utilizadores autenticados do mesmo parque
CREATE POLICY "Vision readings por parque"
  ON entrada_vision_readings FOR SELECT
  USING (
    park_id IN (
      SELECT park_id FROM park_users WHERE user_id = auth.uid()
    )
  );

-- Associações de câmaras: visíveis por utilizadores do parque
CREATE POLICY "Park devices visíveis por park_users"
  ON park_brighterbins_devices FOR ALL
  USING (
    park_id IN (
      SELECT park_id FROM park_users WHERE user_id = auth.uid()
    )
  );

-- Sync state: apenas service role (operação interna do cron)
CREATE POLICY "Sync state service role"
  ON brighterbins_sync_state FOR ALL
  USING (auth.role() = 'service_role');

-- Service role tem acesso total às leituras (para inserção via cron)
CREATE POLICY "Vision readings service role"
  ON entrada_vision_readings FOR ALL
  USING (auth.role() = 'service_role');
```

---

## 3. Configuração e Variáveis de Ambiente

```bash
# .env.local

# BrighterBins API
BRIGHTERBINS_API_URL=https://api.brighterbins.com
BRIGHTERBINS_EMAIL=utilizador@empresa.com
BRIGHTERBINS_PASSWORD=palavra-passe-segura

# Tolerância em minutos para associar uma leitura a uma entrada
BRIGHTERBINS_MATCH_TOLERANCE_MINUTES=10

# Tamanho de página para paginação da Time Series API
BRIGHTERBINS_PAGE_SIZE=100

# Segredo para proteger o endpoint de cron (chamada servidor-para-servidor apenas)
SYNC_SECRET=segredo-longo-aleatorio
# NOTA: NUNCA usar NEXT_PUBLIC_ nesta variável — nunca expor ao browser
```

---

## 4. Camada de Serviço — BrighterBins Client

### `src/lib/brighterbins/client.ts`

```typescript
import type { BrighterBinsDevice, TimeSeriesResponse, LoginResponse } from '@/types/brighterbins'

const BASE_URL = process.env.BRIGHTERBINS_API_URL!

/**
 * Autentica e retorna o Bearer Token.
 * NOTA: Ambiente serverless (Vercel Functions) é stateless — sem cache de token.
 * Cada invocação do sync faz um novo login (1 HTTP call extra, negligível a cada 15 min).
 */
export async function getBrighterBinsToken(): Promise<string> {
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

  return data.token
}

/**
 * Lista todos os dispositivos Vision disponíveis na conta BrighterBins.
 * Usado pela página de settings para permitir associação a parques.
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
 * Paginação automática — retorna TODOS os registos no intervalo.
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

    if (!json.data || json.data.length === 0) break
    allData = allData.concat(json.data)

    if (allData.length >= json.total_records) break
    pageNumber++
  }

  return allData
}
```

---

## 5. Sincronização — Função Principal

### `src/lib/brighterbins/sync.ts`

A função itera pelos dispositivos associados a cada parque (via `park_brighterbins_devices`).
Cada leitura é tagada com o `park_id` do parque correspondente.

```typescript
import { createClient } from '@/lib/supabase/server'
import { fetchTimeSeriesAll } from './client'
import type { VisionReading } from '@/types/brighterbins'

const MATCH_TOLERANCE_MS =
  parseInt(process.env.BRIGHTERBINS_MATCH_TOLERANCE_MINUTES ?? '10') * 60 * 1000

/**
 * Sincroniza leituras BrighterBins para todos os parques com câmaras associadas.
 * Filtragem opcional por parkId para sync manual a partir da UI de settings.
 */
export async function syncBrighterBinsReadings(parkId?: string): Promise<{
  synced: number
  matched: number
  errors: string[]
}> {
  const supabase = createClient()
  const now = Date.now()
  const errors: string[] = []
  let totalSynced = 0
  let totalMatched = 0

  // 1. Obter câmaras associadas a parques (filtrado opcionalmente por parkId)
  let assocQuery = supabase
    .from('park_brighterbins_devices')
    .select('park_id, device_id, device_name')
    .eq('is_active', true)

  if (parkId) assocQuery = assocQuery.eq('park_id', parkId)

  const { data: associations, error: assocError } = await assocQuery

  if (assocError) {
    return { synced: 0, matched: 0, errors: [assocError.message] }
  }

  if (!associations || associations.length === 0) {
    return { synced: 0, matched: 0, errors: [] }
  }

  // 2. Para cada dispositivo associado, sincronizar leituras
  for (const assoc of associations) {
    try {
      // Ler último estado de sync deste dispositivo
      const { data: syncState } = await supabase
        .from('brighterbins_sync_state')
        .select('last_uplink_ts')
        .eq('device_id', assoc.device_id)
        .single()

      // Se nunca sincronizou, começa das últimas 24h
      const fromMs = syncState?.last_uplink_ts
        ? syncState.last_uplink_ts + 1   // +1ms para evitar duplicado
        : now - 24 * 60 * 60 * 1000

      // Obter novas leituras
      const readings = await fetchTimeSeriesAll(assoc.device_id, fromMs, now)

      if (readings.length === 0) continue

      // 3. Para cada leitura, tentar associar a uma entrada por proximidade temporal
      //    (pressuposto: uma única balança por parque)
      const rowsToInsert: VisionReading[] = []

      for (const r of readings) {
        const uplinkTime = new Date(r.uplink_time)

        // Procurar entrada no parque dentro da janela de tolerância
        // Usa entries.created_at (campo de timestamp da tabela entries)
        const { data: entry } = await supabase
          .from('entries')
          .select('id')
          .eq('park_id', assoc.park_id)
          .gte('created_at', new Date(r.uplink_time - MATCH_TOLERANCE_MS).toISOString())
          .lte('created_at', new Date(r.uplink_time + MATCH_TOLERANCE_MS).toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (entry) totalMatched++

        rowsToInsert.push({
          park_id:             assoc.park_id,
          entry_id:            entry?.id ?? null,
          device_id:           assoc.device_id,
          device_name:         assoc.device_name ?? r.deviceDetail?.name ?? null,
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

      // 4. Inserir no Supabase (ignorar duplicados por unique constraint)
      const { error: insertError } = await supabase
        .from('entrada_vision_readings')
        .upsert(rowsToInsert, {
          onConflict: 'device_id,uplink_time_ms',
          ignoreDuplicates: true,
        })

      if (insertError) {
        errors.push(`Device ${assoc.device_id}: ${insertError.message}`)
        continue
      }

      totalSynced += rowsToInsert.length

      // 5. Atualizar estado de sync
      const lastUplinkTs = Math.max(...readings.map(r => r.uplink_time))
      await supabase
        .from('brighterbins_sync_state')
        .upsert({
          device_id:      assoc.device_id,
          device_name:    assoc.device_name ?? null,
          last_sync_at:   new Date().toISOString(),
          last_uplink_ts: lastUplinkTs,
          updated_at:     new Date().toISOString(),
        }, { onConflict: 'device_id' })

    } catch (err) {
      errors.push(`Device ${assoc.device_id}: ${String(err)}`)
    }
  }

  return { synced: totalSynced, matched: totalMatched, errors }
}
```

---

## 6. Server Actions e Cron Route

### `src/actions/brighterbins.ts` — Server Action para UI

A UI nunca chama o endpoint HTTP diretamente. O `SyncButton` chama esta Server Action,
que executa no servidor — o `SYNC_SECRET` nunca é exposto ao browser.

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { syncBrighterBinsReadings } from '@/lib/brighterbins/sync'
import { listVisionDevices } from '@/lib/brighterbins/client'
import { revalidatePath } from 'next/cache'

/**
 * Aciona a sincronização a partir da UI (botão manual).
 * Protegida por sessão Supabase — apenas utilizadores autenticados.
 */
export async function syncBrighterBinsAction(parkId: string): Promise<{
  synced: number
  matched: number
  errors: string[]
}> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const result = await syncBrighterBinsReadings(parkId)
  revalidatePath('/entries')
  return result
}

/**
 * Lista todos os dispositivos BrighterBins disponíveis na conta.
 * Usado pela página de settings para popular a lista de câmaras.
 */
export async function listBrighterBinsDevicesAction() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  return listVisionDevices()
}

/**
 * Associa um dispositivo BrighterBins a um parque.
 */
export async function associateDeviceAction(parkId: string, deviceId: string, deviceName: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { error } = await supabase
    .from('park_brighterbins_devices')
    .upsert({ park_id: parkId, device_id: deviceId, device_name: deviceName, is_active: true, added_by: user.id }, {
      onConflict: 'park_id,device_id',
    })

  if (error) throw new Error(error.message)
  revalidatePath('/settings/cameras')
}

/**
 * Remove a associação de um dispositivo a um parque.
 */
export async function dissociateDeviceAction(parkId: string, deviceId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { error } = await supabase
    .from('park_brighterbins_devices')
    .delete()
    .eq('park_id', parkId)
    .eq('device_id', deviceId)

  if (error) throw new Error(error.message)
  revalidatePath('/settings/cameras')
}
```

### `src/app/api/brighterbins/sync/route.ts` — Endpoint de Cron

Apenas para chamadas servidor-para-servidor (Vercel Cron). Nunca chamado pelo browser.

```typescript
import { NextResponse } from 'next/server'
import { syncBrighterBinsReadings } from '@/lib/brighterbins/sync'

export async function POST(req: Request) {
  const secret = req.headers.get('x-sync-secret')
  if (secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Sem parkId → sincroniza todos os parques com câmaras associadas
    const result = await syncBrighterBinsReadings()
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
```

### `vercel.json` — Cron Configuration

```json
{
  "crons": [
    {
      "path": "/api/brighterbins/sync",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

> **Nota**: Se já existir um `vercel.json` no projeto, adicionar o bloco `"crons"` ao objeto existente.

---

## 7. Configuração de Câmaras por Parque (Settings)

Nova página de configurações: `src/app/[locale]/(app)/settings/cameras/page.tsx`

### Comportamento

1. Carrega todos os dispositivos disponíveis na conta BrighterBins (via `listBrighterBinsDevicesAction()`)
2. Carrega as associações atuais do parque (`park_brighterbins_devices` onde `park_id = currentParkId`)
3. Mostra lista com cada dispositivo e o seu estado: **Associado** (badge verde) ou **Disponível**
4. Botão "Associar" adiciona o dispositivo ao parque
5. Botão "Remover" remove a associação

### `src/app/[locale]/(app)/settings/cameras/page.tsx`

```tsx
'use client'

import { useState, useEffect, useTransition } from 'react'
import { useCurrentPark } from '@/hooks/use-current-park'
import {
  listBrighterBinsDevicesAction,
  associateDeviceAction,
  dissociateDeviceAction,
} from '@/actions/brighterbins'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Camera, Wifi, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Device = {
  variant_id: string
  variant: string
  status: 'Online' | 'Offline' | 'Low Battery' | 'Created'
}

type Association = {
  device_id: string
  device_name: string | null
}

export default function CamerasSettingsPage() {
  const { parkId } = useCurrentPark()
  const [devices, setDevices] = useState<Device[]>([])
  const [associated, setAssociated] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!parkId) return
    Promise.all([
      listBrighterBinsDevicesAction(),
      createClient()
        .from('park_brighterbins_devices')
        .select('device_id, device_name')
        .eq('park_id', parkId)
        .eq('is_active', true),
    ])
      .then(([devs, { data: assocs }]) => {
        setDevices(devs)
        setAssociated(new Set((assocs as Association[]).map(a => a.device_id)))
      })
      .catch(() => toast.error('Erro ao carregar câmaras'))
      .finally(() => setIsLoading(false))
  }, [parkId])

  function handleAssociate(device: Device) {
    if (!parkId) return
    startTransition(async () => {
      try {
        await associateDeviceAction(parkId, device.variant_id, device.variant)
        setAssociated(prev => new Set([...prev, device.variant_id]))
        toast.success(`Câmara ${device.variant} associada ao parque`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erro inesperado')
      }
    })
  }

  function handleDissociate(device: Device) {
    if (!parkId) return
    startTransition(async () => {
      try {
        await dissociateDeviceAction(parkId, device.variant_id)
        setAssociated(prev => {
          const next = new Set(prev)
          next.delete(device.variant_id)
          return next
        })
        toast.success(`Câmara ${device.variant} removida do parque`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erro inesperado')
      }
    })
  }

  if (isLoading) {
    return <div className="p-6 text-muted-foreground">A carregar câmaras...</div>
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Câmaras BrighterBins
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Associa as câmaras de visão computacional a este parque. Apenas as câmaras associadas
          serão sincronizadas e apresentadas nos registos de entradas.
        </p>
      </div>

      {devices.length === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Nenhum dispositivo BrighterBins disponível na conta.
        </p>
      )}

      <ul className="space-y-3">
        {devices.map((device) => {
          const isAssociated = associated.has(device.variant_id)
          const isOnline = device.status === 'Online'
          return (
            <li
              key={device.variant_id}
              className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${isOnline ? 'bg-green-100' : 'bg-muted'}`}>
                  {isOnline
                    ? <Wifi className="h-4 w-4 text-green-600" />
                    : <WifiOff className="h-4 w-4 text-muted-foreground" />
                  }
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{device.variant}</p>
                  <p className="text-xs text-muted-foreground">
                    ID: {device.variant_id} · {device.status}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isAssociated && (
                  <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                    Associada
                  </span>
                )}
                <Button
                  size="sm"
                  variant={isAssociated ? 'outline' : 'default'}
                  disabled={isPending}
                  onClick={() => isAssociated ? handleDissociate(device) : handleAssociate(device)}
                >
                  {isAssociated ? 'Remover' : 'Associar'}
                </Button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
```

---

## 8. Componentes de UI

### 8.1 `SyncButton` — Botão de Sincronização Manual

Chama a Server Action diretamente — sem HTTP call do browser, sem segredo exposto.
Aceita `parkId` para sincronizar apenas o parque atual.

```tsx
// src/components/entries/SyncButton.tsx
'use client'

import { useState, useTransition } from 'react'
import { syncBrighterBinsAction } from '@/actions/brighterbins'
import { RefreshCw } from 'lucide-react'

interface Props {
  parkId: string
}

export function SyncButton({ parkId }: Props) {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<string | null>(null)

  function handleSync() {
    startTransition(async () => {
      try {
        const res = await syncBrighterBinsAction(parkId)
        if (res.errors.length > 0) {
          setResult(`Sincronizado com erros: ${res.errors[0]}`)
        } else {
          setResult(`✓ ${res.synced} leitura${res.synced !== 1 ? 's' : ''} sincronizada${res.synced !== 1 ? 's' : ''}`)
        }
      } catch (err) {
        setResult(`Erro: ${err instanceof Error ? err.message : 'Erro inesperado'}`)
      }
    })
  }

  return (
    <div className="flex items-center gap-3">
      {result && (
        <span className="text-sm text-muted-foreground">{result}</span>
      )}
      <button
        onClick={handleSync}
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
      >
        <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
        {isPending ? 'A sincronizar...' : 'Sincronizar'}
      </button>
    </div>
  )
}
```

### 8.2 `VisionKPICards` — KPIs de Visão (Server Component)

Filtrado por `park_id` para mostrar dados apenas do parque atual.

```tsx
// src/components/entries/VisionKPICards.tsx
import { createClient } from '@/lib/supabase/server'

interface Props {
  parkId: string
}

interface KPIData {
  totalReadings: number
  avgFillLevel: number | null
  contaminationRate: number
  topContaminants: { name: string; count: number }[]
  lastSyncAt: string | null
}

async function getVisionKPIs(parkId: string): Promise<KPIData> {
  const supabase = createClient()
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: totalReadings },
    { data: fillData },
    { count: withContamination },
    { data: contaminantData },
    { data: syncState },
  ] = await Promise.all([
    supabase
      .from('entrada_vision_readings')
      .select('*', { count: 'exact', head: true })
      .eq('park_id', parkId)
      .gte('uplink_time', since),
    supabase
      .from('entrada_vision_readings')
      .select('fill_level')
      .eq('park_id', parkId)
      .not('fill_level', 'is', null)
      .gte('uplink_time', since),
    supabase
      .from('entrada_vision_readings')
      .select('*', { count: 'exact', head: true })
      .eq('park_id', parkId)
      .gt('contamination_count', 0)
      .gte('uplink_time', since),
    supabase.rpc('get_top_contaminants', { p_park_id: parkId, days: 30 }),
    supabase
      .from('brighterbins_sync_state')
      .select('last_sync_at')
      .order('last_sync_at', { ascending: false })
      .limit(1)
      .single(),
  ])

  const total = totalReadings ?? 0
  const avgFillLevel = fillData?.length
    ? Math.round(fillData.reduce((acc, r) => acc + (r.fill_level ?? 0), 0) / fillData.length)
    : null

  return {
    totalReadings: total,
    avgFillLevel,
    contaminationRate: total ? Math.round(((withContamination ?? 0) / total) * 100) : 0,
    topContaminants: contaminantData ?? [],
    lastSyncAt: syncState?.last_sync_at ?? null,
  }
}

export async function VisionKPICards({ parkId }: Props) {
  const kpis = await getVisionKPIs(parkId)

  const cards = [
    {
      label: 'Leituras (30 dias)',
      value: kpis.totalReadings.toLocaleString('pt-PT'),
      color: 'bg-blue-50 border-blue-200',
    },
    {
      label: 'Nível Médio de Enchimento',
      value: kpis.avgFillLevel !== null ? `${kpis.avgFillLevel}%` : '—',
      color: 'bg-emerald-50 border-emerald-200',
    },
    {
      label: 'Taxa de Contaminação',
      value: `${kpis.contaminationRate}%`,
      color: kpis.contaminationRate > 20
        ? 'bg-red-50 border-red-200'
        : 'bg-amber-50 border-amber-200',
    },
    {
      label: 'Última Sincronização',
      value: kpis.lastSyncAt
        ? new Intl.DateTimeFormat('pt-PT', { dateStyle: 'short', timeStyle: 'short' })
            .format(new Date(kpis.lastSyncAt))
        : 'Nunca',
      color: 'bg-muted border-border',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className={`rounded-xl border p-4 ${card.color}`}>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {card.label}
          </p>
          <p className="mt-1 text-2xl font-bold text-foreground">{card.value}</p>
        </div>
      ))}

      {kpis.topContaminants.length > 0 && (
        <div className="col-span-2 lg:col-span-4 rounded-xl border border-orange-200 bg-orange-50 p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Top Contaminantes (30 dias)
          </p>
          <div className="flex flex-wrap gap-2">
            {kpis.topContaminants.slice(0, 8).map((c) => (
              <span
                key={c.name}
                className="inline-flex items-center gap-1 rounded-full bg-orange-100 border border-orange-300 px-3 py-1 text-sm font-medium text-orange-800"
              >
                {c.name}
                <span className="rounded-full bg-orange-200 px-1.5 text-xs">{c.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

### 8.3 `VisionReadingsList` — Lista de Leituras (Client Component)

```tsx
// src/components/entries/VisionReadingsList.tsx
'use client'

import { useState } from 'react'
import type { EntradaVisionReading } from '@/types/brighterbins'
import { VisionReadingCard } from './VisionReadingCard'
import { VisionReadingRow } from './VisionReadingRow'
import { LayoutGrid, List } from 'lucide-react'

type ViewMode = 'cards' | 'list'
type Filter = 'all' | 'contaminated' | 'clean'

interface Props {
  readings: EntradaVisionReading[]
}

export function VisionReadingsList({ readings }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = readings.filter((r) => {
    if (filter === 'contaminated') return (r.contamination_count ?? 0) > 0
    if (filter === 'clean') return (r.contamination_count ?? 0) === 0
    return true
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        {/* Filtros */}
        <div className="flex rounded-lg border border-border bg-muted p-1 gap-1">
          {(['all', 'contaminated', 'clean'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f === 'all' && 'Todos'}
              {f === 'contaminated' && 'Com contaminação'}
              {f === 'clean' && 'Limpos'}
            </button>
          ))}
        </div>

        {/* Toggle vista */}
        <div className="flex rounded-lg border border-border bg-muted p-1 gap-1">
          <button
            onClick={() => setViewMode('cards')}
            className={`rounded-md p-1.5 transition-colors ${viewMode === 'cards' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            aria-label="Vista em cartões"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`rounded-md p-1.5 transition-colors ${viewMode === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            aria-label="Vista em lista"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} leitura{filtered.length !== 1 ? 's' : ''}
      </p>

      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((r) => <VisionReadingCard key={r.id} reading={r} />)}
        </div>
      )}

      {viewMode === 'list' && (
        <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-4 py-2 bg-muted text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <span>Imagem</span>
            <span>Data/Hora</span>
            <span>Enchimento</span>
            <span>Contaminação</span>
            <span>Bateria</span>
          </div>
          {filtered.map((r) => <VisionReadingRow key={r.id} reading={r} />)}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="py-16 text-center text-muted-foreground">
          <p className="text-4xl mb-2">📷</p>
          <p className="font-medium">Sem leituras para mostrar</p>
        </div>
      )}
    </div>
  )
}
```

### 8.4 `VisionReadingCard`

```tsx
// src/components/entries/VisionReadingCard.tsx
import Image from 'next/image'
import type { EntradaVisionReading } from '@/types/brighterbins'

export function VisionReadingCard({ reading }: { reading: EntradaVisionReading }) {
  const hasContamination = (reading.contamination_count ?? 0) > 0
  const imageUrl = reading.annotated_img_url ?? reading.image_url

  return (
    <div className="group rounded-xl border border-border overflow-hidden bg-card shadow-sm hover:shadow-md transition-shadow">
      <div className="relative aspect-video bg-muted">
        {imageUrl ? (
          <Image src={imageUrl} alt="Leitura de visão" fill className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <span className="text-4xl">📷</span>
          </div>
        )}
        {hasContamination && (
          <div className="absolute top-2 right-2 rounded-full bg-red-500 text-white text-xs font-bold px-2 py-0.5">
            ⚠ {reading.contamination_count}
          </div>
        )}
        {reading.fill_level !== null && (
          <div className="absolute bottom-2 left-2 rounded-full bg-black/60 text-white text-xs font-medium px-2 py-0.5">
            {Math.round(reading.fill_level ?? 0)}% cheio
          </div>
        )}
      </div>
      <div className="p-3 space-y-2">
        <p className="text-sm font-medium text-foreground">
          {new Intl.DateTimeFormat('pt-PT', { dateStyle: 'short', timeStyle: 'short' })
            .format(new Date(reading.uplink_time))}
        </p>
        {hasContamination && reading.contamination && reading.contamination.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {reading.contamination.slice(0, 3).map((c) => (
              <span key={c} className="rounded-full bg-red-50 border border-red-200 text-red-700 text-xs px-2 py-0.5">
                {c}
              </span>
            ))}
            {reading.contamination.length > 3 && (
              <span className="text-xs text-muted-foreground">+{reading.contamination.length - 3}</span>
            )}
          </div>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
            ✓ Sem contaminação
          </span>
        )}
        {reading.battery_level !== null && (
          <p className="text-xs text-muted-foreground">Bateria: {reading.battery_level}%</p>
        )}
      </div>
    </div>
  )
}
```

### 8.5 `VisionReadingRow`

```tsx
// src/components/entries/VisionReadingRow.tsx
import Image from 'next/image'
import type { EntradaVisionReading } from '@/types/brighterbins'

export function VisionReadingRow({ reading }: { reading: EntradaVisionReading }) {
  const hasContamination = (reading.contamination_count ?? 0) > 0

  return (
    <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors">
      <div className="relative h-12 w-16 overflow-hidden rounded-lg bg-muted flex-shrink-0">
        {reading.image_url ? (
          <Image
            src={reading.annotated_img_url ?? reading.image_url}
            alt=""
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground text-lg">📷</div>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">
          {new Intl.DateTimeFormat('pt-PT', { dateStyle: 'short', timeStyle: 'short' })
            .format(new Date(reading.uplink_time))}
        </p>
        {reading.device_name && (
          <p className="text-xs text-muted-foreground">{reading.device_name}</p>
        )}
      </div>
      <div className="text-sm text-center">
        {reading.fill_level !== null ? (
          <span className="font-semibold text-foreground">{Math.round(reading.fill_level ?? 0)}%</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </div>
      <div className="text-sm">
        {hasContamination ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs px-2 py-0.5">
            ⚠ {reading.contamination_count}
          </span>
        ) : (
          <span className="text-xs text-green-600 font-medium">✓ Limpo</span>
        )}
      </div>
      <div className="text-xs text-muted-foreground text-center">
        {reading.battery_level !== null ? `${reading.battery_level}%` : '—'}
      </div>
    </div>
  )
}
```

---

## 9. Integração na Página de Entradas

### Modificação em `src/app/[locale]/(app)/entries/[id]/page.tsx`

Adicionar a secção de Visão Computacional abaixo da secção de Armazenamento.
A página de detalhe de entrada já usa `use(params)` para Next.js 15.

```tsx
// Acrescentar a query de readings à função de load existente:
const { data: visionReadings } = await supabase
  .from('entrada_vision_readings')
  .select('*')
  .eq('entry_id', entryId)
  .order('uplink_time', { ascending: false })

// Acrescentar ao JSX (após secção de Armazenamento):
import { Suspense } from 'react'
import { VisionKPICards } from '@/components/entries/VisionKPICards'
import { VisionReadingsList } from '@/components/entries/VisionReadingsList'
import { SyncButton } from '@/components/entries/SyncButton'

// No componente:
<section className="space-y-4">
  <div className="flex items-center justify-between">
    <div>
      <h2 className="text-base font-semibold text-foreground">Classificação por Visão</h2>
      <p className="text-sm text-muted-foreground">Dados automáticos da câmara BrighterBins</p>
    </div>
    <SyncButton parkId={entry.park_id} />
  </div>

  {visionReadings && visionReadings.length > 0 ? (
    <VisionReadingsList readings={visionReadings} />
  ) : (
    <p className="text-sm text-muted-foreground py-4 text-center">
      Sem leituras de visão associadas a esta entrada.
    </p>
  )}
</section>
```

### Página de leituras global (opcional) — `src/app/[locale]/(app)/entries/vision/page.tsx`

Para visualizar todas as leituras do parque, independente de entrada:

```tsx
// Supabase query filtrada por park_id do parque atual
const { data: readings } = await supabase
  .from('entrada_vision_readings')
  .select('*')
  .eq('park_id', currentParkId)
  .order('uplink_time', { ascending: false })
  .limit(200)
```

---

## 10. Tipos TypeScript

### `src/types/brighterbins.ts`

```typescript
export interface LoginResponse {
  success: boolean
  message: string
  token: string
  refreshToken: string
  company: string
  name: string
  child_companies: { id: number; [key: string]: unknown }[]
}

export interface BrighterBinsDevice {
  variant:    string
  variant_id: string
  status:     'Online' | 'Offline' | 'Low Battery' | 'Created'
}

export interface DeviceDetail {
  company_name:         string
  bin_id:               string
  name:                 string
  unique_random_number: string
  variant:              string
  address:              string
  lat:                  string
  lng:                  string
  last_seen:            number
}

export interface UplinkRecord {
  uplink_time:        number          // ms epoch
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

export interface TimeSeriesResponse {
  deviceDetail:  DeviceDetail
  data:          UplinkRecord[]
  total_records: number
  page_number:   number
  page_size:     number
}

// Linha da tabela entrada_vision_readings (com park_id)
export interface EntradaVisionReading {
  id:                  string
  park_id:             string
  entry_id:            string | null
  device_id:           string
  device_name:         string | null
  bin_id:              string | null
  uplink_time:         string          // ISO string
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

// Para inserção (sem id/created_at/synced_at)
export type VisionReading = Omit<EntradaVisionReading, 'id' | 'created_at' | 'synced_at'>
```

---

## 11. Estrutura de Ficheiros

```
src/
├── actions/
│   └── brighterbins.ts                    ← Server Actions (sync, associate, dissociate)
├── app/
│   └── [locale]/
│       └── (app)/
│           ├── entries/
│           │   └── [id]/
│           │       └── page.tsx           ← MODIFICAR: adicionar secção Vision
│           └── settings/
│               └── cameras/
│                   └── page.tsx           ← NOVO: gestão de câmaras por parque
├── api/
│   └── brighterbins/
│       └── sync/
│           └── route.ts                   ← Cron endpoint (servidor-para-servidor)
├── components/
│   └── entries/
│       ├── VisionKPICards.tsx             ← Server Component, filtrado por park_id
│       ├── VisionReadingsList.tsx         ← Client Component com filtros e vista
│       ├── VisionReadingCard.tsx
│       ├── VisionReadingRow.tsx
│       └── SyncButton.tsx                 ← Chama Server Action (sem segredo no browser)
├── lib/
│   └── brighterbins/
│       ├── client.ts                      ← Auth + listDevices + fetchTimeSeries
│       └── sync.ts                        ← Função principal de sync (por park)
└── types/
    └── brighterbins.ts

vercel.json                                ← Cron: /api/brighterbins/sync cada 15 min
```

---

## 12. Migrações SQL

### `supabase/migrations/00013_brighterbins.sql`

```sql
-- ============================================================
-- BrighterBins Vision API Integration
-- ============================================================

-- Associação de câmaras a parques
CREATE TABLE park_brighterbins_devices (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  park_id     UUID NOT NULL REFERENCES parks(id) ON DELETE CASCADE,
  device_id   TEXT NOT NULL,
  device_name TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  added_at    TIMESTAMPTZ DEFAULT now(),
  added_by    UUID REFERENCES profiles(id),
  UNIQUE(park_id, device_id)
);

CREATE INDEX idx_park_bb_devices_park   ON park_brighterbins_devices(park_id);
CREATE INDEX idx_park_bb_devices_active ON park_brighterbins_devices(park_id, is_active);

-- Estado de sincronização por dispositivo
CREATE TABLE brighterbins_sync_state (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id      TEXT NOT NULL UNIQUE,
  device_name    TEXT,
  last_sync_at   TIMESTAMPTZ,
  last_uplink_ts BIGINT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- Leituras de visão computacional
CREATE TABLE entrada_vision_readings (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  park_id              UUID NOT NULL REFERENCES parks(id),
  entry_id             UUID REFERENCES entries(id) ON DELETE SET NULL,
  device_id            TEXT NOT NULL,
  device_name          TEXT,
  bin_id               TEXT,
  uplink_time          TIMESTAMPTZ NOT NULL,
  uplink_time_ms       BIGINT NOT NULL,
  image_url            TEXT,
  annotated_img_url    TEXT,
  fill_level           NUMERIC(5,2),
  contamination        TEXT[],
  contamination_count  INTEGER DEFAULT 0,
  battery_level        INTEGER,
  battery_type         TEXT,
  temperature          NUMERIC(5,2),
  flash_on             BOOLEAN,
  orientation          TEXT,
  image_quality        TEXT,
  image_resolution     TEXT,
  synced_at            TIMESTAMPTZ DEFAULT now(),
  created_at           TIMESTAMPTZ DEFAULT now(),
  UNIQUE(device_id, uplink_time_ms)
);

CREATE INDEX idx_vision_readings_park   ON entrada_vision_readings(park_id);
CREATE INDEX idx_vision_readings_entry  ON entrada_vision_readings(entry_id);
CREATE INDEX idx_vision_readings_device ON entrada_vision_readings(device_id);
CREATE INDEX idx_vision_readings_uplink ON entrada_vision_readings(uplink_time DESC);
CREATE INDEX idx_vision_readings_contam ON entrada_vision_readings USING GIN(contamination);

-- RLS
ALTER TABLE park_brighterbins_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE brighterbins_sync_state   ENABLE ROW LEVEL SECURITY;
ALTER TABLE entrada_vision_readings   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Park devices por park_users"
  ON park_brighterbins_devices FOR ALL
  USING (park_id IN (SELECT park_id FROM park_users WHERE user_id = auth.uid()));

CREATE POLICY "Vision readings por park_users"
  ON entrada_vision_readings FOR SELECT
  USING (park_id IN (SELECT park_id FROM park_users WHERE user_id = auth.uid()));

CREATE POLICY "Sync state service role"
  ON brighterbins_sync_state FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Vision readings service role insert"
  ON entrada_vision_readings FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Função RPC para top contaminantes (filtrada por parque)
CREATE OR REPLACE FUNCTION get_top_contaminants(p_park_id UUID, days INT DEFAULT 30)
RETURNS TABLE(name TEXT, count BIGINT)
LANGUAGE SQL STABLE AS $$
  SELECT
    unnest(contamination) AS name,
    count(*) AS count
  FROM entrada_vision_readings
  WHERE
    park_id = p_park_id
    AND uplink_time >= now() - (days || ' days')::interval
    AND contamination IS NOT NULL
    AND array_length(contamination, 1) > 0
  GROUP BY 1
  ORDER BY 2 DESC
  LIMIT 10;
$$;
```

---

## 13. Notas de Implementação

### Matching Temporal (Single Balança)

Com uma única balança por parque, o matching por `entries.created_at ± 10 min` é suficiente:

```
Para cada leitura com uplink_time = T:
  Procurar em entries onde:
    park_id = park_id da câmara
    AND created_at ENTRE (T - 10min) E (T + 10min)
  Se encontrar → entry_id = id da entrada
  Se não encontrar → entry_id = NULL (leitura guardada na mesma)
```

A tolerância de 10 minutos é configurável via `BRIGHTERBINS_MATCH_TOLERANCE_MINUTES`.

### Autenticação Stateless

O ambiente serverless (Vercel Functions) não persiste estado entre invocações. Cada execução do cron (a cada 15 min) faz um novo login à BrighterBins API. Custo: 1 HTTP request adicional por sync — negligível.

### Overflow no Fill Level

O `fill_level` pode ultrapassar 100% (contentor em overflow). Mostrar o valor real sem truncar — adicionar indicador visual de overflow se `fill_level > 100`.

### Imagens Permanentes

As URLs das imagens BrighterBins são permanentes (sem expiração). Guardar como URL é suficiente — sem necessidade de download para Supabase Storage.

### Adicionar Câmara ao Menu de Settings

Adicionar link "Câmaras" ao layout de navegação de settings (ficheiro `src/app/[locale]/(app)/settings/layout.tsx`) juntamente com os links existentes: Organização, Parques, Áreas, Zonas, Escalas, Códigos LER, Utilizadores.

### Segurança do Endpoint de Cron

O endpoint `/api/brighterbins/sync` é protegido por `SYNC_SECRET` — apenas chamado pelo Vercel Cron via infra servidor-para-servidor. A UI nunca chama este endpoint; usa Server Actions em seu lugar. O `SYNC_SECRET` nunca deve ter o prefixo `NEXT_PUBLIC_`.

---

## 14. Frontend Design — Secção na Página de Detalhe de Entrada

### 14.1 Posicionamento na Página

A secção "Visão Computacional" é inserida no fim da coluna de conteúdo principal de `entries/[id]/page.tsx`, após a secção "Pedido de Recolha" e antes do fecho da `div` principal.

```
┌────────────────────────────────────────────┬─────────────────┐
│ Dados da Entrada                           │ Progresso       │
│ Pesagens                                   │ [timeline]      │
│ Inspeção                                   │                 │
│ Armazenamento                              │                 │
│ Lote Associado                             │                 │
│ Pedido de Recolha                          │                 │
│ ──────────────────────────────────────     │                 │
│ [NOVO] Visão Computacional                 │                 │
└────────────────────────────────────────────┴─────────────────┘
```

### 14.2 Estados da Secção

A secção tem três estados distintos, determinados em runtime:

---

#### Estado A — Sem câmaras configuradas para o parque

Mostrado quando `park_brighterbins_devices` não tem registos para o parque atual.

```
┌───────────────────────────────────────────────────────────────┐
│  📷  Visão Computacional                                       │
│  ─────────────────────────────────────────────────────────    │
│                                                               │
│          [ícone câmara — muted, tamanho 32px]                 │
│          Sem câmaras configuradas para este parque.           │
│          Para ativar esta funcionalidade, associa um          │
│          dispositivo em Configurações.                        │
│                                                               │
│          [ → Configurar Câmaras ]  ← link para /settings/cameras
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

**Classes relevantes:**
- Container do ícone: `flex flex-col items-center gap-2 py-8 text-muted-foreground`
- Link: botão outline pequeno com `Camera` icon + `ArrowRight`

---

#### Estado B — Câmara configurada, sem leituras para esta entrada

Mostrado quando existe pelo menos uma câmara associada ao parque, mas nenhuma leitura foi correspondida a esta entrada (`entry_id = entryId` → vazio).

```
┌───────────────────────────────────────────────────────────────┐
│  📷  Visão Computacional              [↻ Sincronizar]          │
│  ─────────────────────────────────────────────────────────    │
│                                                               │
│      Sem leituras de câmara para esta entrada.               │
│      O veículo pode ter chegado fora do intervalo             │
│      de sincronização (±10 min).                             │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

**Nota:** O botão "Sincronizar" está sempre visível neste estado — permite forçar um re-sync que pode ainda encontrar leituras correspondentes.

---

#### Estado C — Leituras existentes (estado principal)

```
┌───────────────────────────────────────────────────────────────┐
│  📷  Visão Computacional     Sync: 14:32  [↻ Sincronizar]     │
│  ─────────────────────────────────────────────────────────    │
│                                                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  │
│  │ Nível Enchimento│  │ Contaminação    │  │ Dispositivo  │  │
│  │      72%        │  │   ⚠ 2 tipos     │  │  CAM-NORTE   │  │
│  │ [barra de prog] │  │ [plástico, papel│  │  🟢 Online   │  │
│  └─────────────────┘  └─────────────────┘  └──────────────┘  │
│                                                               │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                                                          │ │
│  │            [ imagem anotada — leitura mais recente ]     │ │
│  │                                                          │ │
│  │  ┌─────────────────────────────────────────────────┐    │ │
│  │  │ ⚠ plástico   ⚠ papel                            │    │ │
│  │  └─────────────────────────────────────────────────┘    │ │
│  │  ▓▓▓▓▓▓▓▓▓░░░  72% · CAM-NORTE · 14:28             │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                               │
│  Todas as leituras (3)                     [■■] [≡]           │
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                    │
│  │ [thumb]  │  │ [thumb]  │  │ [thumb]  │                    │
│  │  14:28   │  │  14:25   │  │  14:19   │                    │
│  │  72% ✓   │  │  68% ⚠2  │  │  71% ✓   │                    │
│  └──────────┘  └──────────┘  └──────────┘                    │
└───────────────────────────────────────────────────────────────┘
```

---

### 14.3 Decomposição de Componentes

#### Header da secção

```
[Camera icon 16px]  Visão Computacional
                    Dados automáticos da câmara BrighterBins
                                         [timestamp última sync]  [SyncButton]
```

- Ícone: `Camera` (lucide)
- Timestamp: `new Intl.DateTimeFormat('pt-PT', {timeStyle: 'short'}).format(new Date(lastSyncAt))`
- `SyncButton` já especificado na secção 8.1; recebe `parkId` como prop

#### Strip de métricas (3 mini-cards)

| Card | Conteúdo | Cor de fundo |
|------|----------|--------------|
| Nível de Enchimento | `{fill_level}%` + barra de progresso | `bg-blue-50 border-blue-200` |
| Contaminação | `✓ Limpo` ou `⚠ {N} tipo(s)` + lista de categorias (até 2) | verde ou `bg-amber-50 border-amber-200` |
| Dispositivo | Nome da câmara + pill Online/Offline | `bg-muted border-border` |

Dados: leitura mais recente da lista (index 0 após `order('uplink_time', { ascending: false })`).

**Fill level:**
- `fill_level ≤ 100`: barra de progresso `w-{fill_level}%` com `bg-blue-500`
- `fill_level > 100`: barra cheia + texto `Overflow` em `text-amber-600`

#### Imagem hero

- Container: `relative w-full aspect-video rounded-lg overflow-hidden bg-muted`
- Imagem: `<Image>` com `fill` + `object-cover`
- Usar `annotated_img_url ?? image_url`
- Se `null`: placeholder com ícone `Camera` muted
- **Overlay inferior** (gradiente preto): linha com fill level + nome do dispositivo + hora
- **Overlay de contaminantes** (canto inferior direito): se `contamination.length > 0`, pills com fundo `bg-black/60 text-white`

#### Galeria — vista em cartões

Grid: `grid grid-cols-3 gap-3 sm:grid-cols-4`

Cada cartão:
```
┌────────────────────┐
│ [thumbnail aspect] │  ← aspect-video, object-cover, rounded-md
│ ── ─── ────────── │
│ 14:28              │  ← text-xs text-muted-foreground
│ 72%  ✓ Limpo       │  ← text-xs, verde ou amber com ícone
└────────────────────┘
```

Hover: `ring-2 ring-primary cursor-pointer` (para futura expansão em modal)

#### Galeria — vista em lista

Tabela compacta com colunas: `Hora | Enchimento | Contaminação | Bateria | [link imagem]`

Padrão de linha igual a `VisionReadingRow` (secção 8.5).

#### Toggle de vista (cartões / lista)

Dois botões icon-only com `LayoutGrid` e `List` (lucide), estado mantido em `useState<'cards'|'list'>`.
Estilo: pill buttons com `bg-muted` e `bg-card shadow-sm` no ativo — igual ao toggle na `VisionReadingsList`.

---

### 14.4 Fluxo de Dados na Página de Detalhe

```
entries/[id]/page.tsx  (client component, já existente)
  │
  ├── useEffect → load()
  │     ├── supabase.from('entries').select(...).eq('id', id)
  │     ├── supabase.from('entrada_vision_readings')
  │     │     .select('*')
  │     │     .eq('entry_id', id)
  │     │     .order('uplink_time', { ascending: false })
  │     └── supabase.from('park_brighterbins_devices')
  │           .select('device_id')
  │           .eq('park_id', entry.park_id)
  │           .eq('is_active', true)
  │           .limit(1)   ← só precisa de saber se existe ≥1
  │
  └── render
        ├── [secções existentes]
        └── <VisionSection
                readings={visionReadings}
                hasCameraConfigured={hasCameras}
                parkId={entry.park_id}
                lastSyncAt={lastSyncAt}   ← do brighterbins_sync_state
             />
```

`lastSyncAt` pode ser obtido numa query adicional em `load()`:
```typescript
supabase
  .from('brighterbins_sync_state')
  .select('last_sync_at')
  .in('device_id', associatedDeviceIds)
  .order('last_sync_at', { ascending: false })
  .limit(1)
  .single()
```

---

### 14.5 Especificação do Componente `VisionSection`

```typescript
// src/components/entries/VisionSection.tsx
// Props
interface VisionSectionProps {
  readings: EntradaVisionReading[]
  hasCameraConfigured: boolean
  parkId: string
  lastSyncAt: string | null
}

// Lógica de estado
// hasCameraConfigured=false → Estado A
// hasCameraConfigured=true && readings.length===0 → Estado B
// readings.length > 0 → Estado C

// Dados derivados (Estado C)
const latest = readings[0]
const fillLevel = latest.fill_level
const isOverflow = fillLevel !== null && fillLevel > 100
const hasContamination = (latest.contamination_count ?? 0) > 0
const contaminants = latest.contamination ?? []
```

---

## 15. Frontend Design — Página de Configuração de Câmaras (Settings)

### 15.1 Actualização do Menu de Configurações

Ficheiro a modificar: `src/app/[locale]/(app)/settings/layout.tsx`

Adicionar item entre "Balanças" e "Utilizadores":

```typescript
{ href: '/settings/cameras', label: 'Câmaras', icon: Camera }
// import { Camera } from 'lucide-react'
```

**Menu de settings atualizado (desktop sidebar):**
```
┌──────────────────────────────────────────────────────────────┐
│  Settings sidebar                                            │
│  ──────────────────                                          │
│  🏢 Organização                                              │
│  📍 Parques                                                  │
│  📄 Códigos LER                                              │
│  🏭 Áreas de Armazenamento                                   │
│  ≡  Zonas                                                    │
│  ⚖  Balanças                                                 │
│  📷 Câmaras                       ← NOVO                     │
│  👥 Utilizadores                                             │
└──────────────────────────────────────────────────────────────┘
```

---

### 15.2 Layout e Estados da Página de Câmaras

#### Estado de carregamento

```
┌───────────────────────────────────────────────────────────────┐
│  📷  Câmaras BrighterBins                                      │
│  Associa as câmaras de visão computacional a este parque.     │
│  Apenas os dispositivos associados são sincronizados.         │
│  ─────────────────────────────────────────────────────────    │
│                                                               │
│  [spinner] A carregar dispositivos...                         │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

#### Estado de erro (API não acessível ou credenciais incorretas)

```
┌───────────────────────────────────────────────────────────────┐
│  📷  Câmaras BrighterBins                                      │
│  ─────────────────────────────────────────────────────────    │
│                                                               │
│  ⚠  Não foi possível ligar ao servidor BrighterBins.          │
│     Verifica as variáveis de ambiente:                        │
│     BRIGHTERBINS_EMAIL, BRIGHTERBINS_PASSWORD                 │
│                                                               │
│     [ ↻ Tentar novamente ]                                    │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

#### Estado principal — lista de dispositivos

```
┌───────────────────────────────────────────────────────────────┐
│  📷  Câmaras BrighterBins                                      │
│  Associa as câmaras de visão computacional a este parque.     │
│  Apenas os dispositivos associados são sincronizados.         │
│  ─────────────────────────────────────────────────────────    │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ [●verde] CAM-NORTE           [● Associada]  [Remover]  │   │
│  │ ID: abc123def456 · 🟢 Online                           │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ [●verde] CAM-SUL                          [Associar]   │   │
│  │ ID: ghi789jkl012 · 🟢 Online                           │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ [●cinza] CAM-ENTRADA                      [Associar]   │   │
│  │ ID: mno345pqr678 · ⚫ Offline                           │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                               │
│  ─────────────────────────────────────────────────────────    │
│  ℹ  3 dispositivos encontrados · 1 associado a este parque    │
└───────────────────────────────────────────────────────────────┘
```

#### Estado sem dispositivos disponíveis

```
│  ─────────────────────────────────────────────────────────    │
│          [ícone câmara — muted]                               │
│          Nenhum dispositivo BrighterBins disponível           │
│          na conta configurada.                                │
```

---

### 15.3 Anatomia de Cada Item de Dispositivo

```
┌──────────────────────────────────────────────────────────────┐
│  [status dot]  [nome do dispositivo]     [badge] [botão]     │
│                ID: [device_id truncado]  · [status label]    │
└──────────────────────────────────────────────────────────────┘
```

| Elemento | Especificação |
|----------|---------------|
| Status dot | `h-2.5 w-2.5 rounded-full` — verde (`bg-green-500`) se Online, cinza (`bg-muted-foreground`) se outro |
| Nome | `text-sm font-medium text-foreground` |
| Device ID | `text-xs text-muted-foreground` — truncado: `{id.slice(0,12)}...` |
| Status label | `"Online"` / `"Offline"` / `"Low Battery"` / `"Created"` |
| Badge "Associada" | `text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full` |
| Botão "Associar" | `Button size="sm"` — variante `default` |
| Botão "Remover" | `Button size="sm"` — variante `outline` |

---

### 15.4 Interações e Feedback

#### Fluxo de Associar

```
Utilizador clica "Associar"
  → botão muda para "A associar..." (disabled)
  → chama associateDeviceAction(parkId, deviceId, deviceName)
  → sucesso:
      · badge "Associada" aparece
      · botão muda para "Remover" (variant outline)
      · toast.success("Câmara {nome} associada ao parque")
  → erro:
      · botão volta ao estado original
      · toast.error(mensagem de erro)
```

#### Fluxo de Remover

```
Utilizador clica "Remover"
  → botão muda para "A remover..." (disabled)
  → chama dissociateDeviceAction(parkId, deviceId)
  → sucesso:
      · badge "Associada" desaparece
      · botão muda para "Associar" (variant default)
      · toast.success("Câmara {nome} removida do parque")
  → erro:
      · botão volta ao estado original
      · toast.error(mensagem de erro)
```

**Nota:** Sem modal de confirmação para remover — a operação é reversível (basta clicar "Associar" novamente). Mais rápido para operações de configuração.

#### Rodapé informativo

Após a lista, linha de resumo:
```typescript
// Contagem dinâmica
const associatedCount = associated.size
const totalCount = devices.length
// Texto: "{totalCount} dispositivos encontrados · {associatedCount} associado{s} a este parque"
```

---

### 15.5 Fluxo de Dados da Página de Câmaras

```
/settings/cameras/page.tsx  (client component)
  │
  ├── useEffect (quando parkId disponível)
  │     ├── listBrighterBinsDevicesAction()     ← Server Action → BrighterBins API
  │     │     retorna: BrighterBinsDevice[]
  │     │
  │     └── supabase.from('park_brighterbins_devices')
  │           .select('device_id')
  │           .eq('park_id', parkId)
  │           .eq('is_active', true)
  │           retorna: string[] de device_ids associados
  │
  ├── Estado local
  │     devices: BrighterBinsDevice[]
  │     associated: Set<string>     ← IDs atualmente associados
  │     isLoading: boolean
  │     error: string | null
  │
  └── Handlers
        handleAssociate(device) → associateDeviceAction → setAssociated(prev => new Set([...prev, id]))
        handleDissociate(device) → dissociateDeviceAction → setAssociated(prev → remove id)
```

**Paralelização do carregamento:**
```typescript
const [devicesResult, assocResult] = await Promise.all([
  listBrighterBinsDevicesAction(),
  supabase.from('park_brighterbins_devices').select('device_id').eq('park_id', parkId).eq('is_active', true),
])
```
Ambas as queries correm em paralelo — reduz o tempo de carregamento inicial.

---

### 15.6 Diagrama de Navegação Completo

```
/entries
  └── /entries/[id]
        └── [Visão Computacional section]
              ├── Estado A: "Sem câmaras" → link → /settings/cameras
              ├── Estado B: "Sem leituras" + [Sincronizar]
              └── Estado C: KPI strip + hero image + galeria + [Sincronizar]

/settings
  └── /settings/cameras          ← NOVO
        ├── Lista de dispositivos BrighterBins (da API)
        ├── Estado de cada dispositivo (associado / disponível)
        └── Ações: Associar / Remover
```

---

### 15.7 Checklist de Implementação Frontend

**Secção de Visão nas Entradas (`entries/[id]`)**
- [ ] Adicionar queries `entrada_vision_readings` e `park_brighterbins_devices` ao `load()` existente
- [ ] Query `brighterbins_sync_state` para `lastSyncAt`
- [ ] Criar componente `VisionSection` com os três estados (A/B/C)
- [ ] Implementar strip de métricas (3 mini-cards)
- [ ] Implementar hero image com overlays
- [ ] Reutilizar `VisionReadingsList` + `VisionReadingCard` + `VisionReadingRow` para a galeria
- [ ] Reutilizar `SyncButton` (passando `parkId`)

**Página de Câmaras nas Configurações**
- [ ] Adicionar item "Câmaras" ao `settings/layout.tsx` (ícone `Camera`)
- [ ] Criar `settings/cameras/page.tsx` com os quatro estados (loading/error/main/empty)
- [ ] Implementar lista de dispositivos com badge + botões
- [ ] Ligar a `listBrighterBinsDevicesAction`, `associateDeviceAction`, `dissociateDeviceAction`
- [ ] Rodapé com contagem dinâmica
