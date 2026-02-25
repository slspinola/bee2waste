# Spec: Dashboard de Eventos de Câmara (BrighterBins Vision)

## Objetivo

Ecrã dedicado a visualizar todos os eventos/leituras captadas pelos dispositivos BrighterBins
associados ao parque ativo. Permite monitorização operacional de enchimento, contaminação e
estado dos contentores em tempo real.

---

## Rota e Navegação

```
/cameras                → lista/grelha de eventos (página principal)
/cameras/[id]           → detalhe de um evento específico
```

**Nav principal:** adicionar item "Câmaras" com ícone `Camera` entre "Clientes" e "Logística".

```tsx
// src/app/[locale]/(app)/layout.tsx — nav item a acrescentar
{ key: "cameras", href: "/cameras", icon: Camera, label: "Câmaras" }
```

---

## Página Principal — `/cameras`

### Layout geral

```
┌─────────────────────────────────────────────────────────────┐
│ Câmaras BrighterBins          [Sincronizar ↺]  [Parque: PS01]│
│ Monitorização de eventos de visão computacional             │
├──────────────┬──────────────┬──────────────┬────────────────┤
│ TOTAL        │ CONTAMINADOS │ ENCHIMENTO   │ OVERFLOW       │
│ 247 eventos  │ 38 (15%)     │ Méd. 67%     │ 12 eventos     │
├──────────────┴──────────────┴──────────────┴────────────────┤
│ [Filtros] Período ▾  Dispositivo ▾  Estado ▾    [≡ Lista] [⊞ Grelha] │
├─────────────────────────────────────────────────────────────┤
│ (lista ou grelha de eventos)                                │
└─────────────────────────────────────────────────────────────┘
```

### KPI Cards (4 cards no topo)

| Card | Valor | Sub-label |
|------|-------|-----------|
| Total de Leituras | COUNT(*) no período | "nos últimos 30 dias" |
| Com Contaminantes | COUNT WHERE contamination_count > 0 | "X% do total" |
| Enchimento Médio | AVG(fill_level) | "última leitura por dispositivo" |
| Overflow | COUNT WHERE fill_level > 100 | "eventos de excesso" |

### Filtros

```
Período:      [Hoje] [7 dias] [30 dias] [90 dias]   (default: 30 dias)
Dispositivo:  dropdown multi-select com todos os devices associados ao parque
Estado:       [Todos] [Com overflow] [Com contaminação] [Limpo]
```

### Toggle vista: Lista / Grelha

Reutiliza padrão de `VisionReadingsList` — botões no canto superior direito.

---

## Vista Grelha — Card (`CameraEventCard`)

```
┌──────────────────────┐
│  [imagem 16:9]       │  ← annotated_img_url ?? image_url ?? 📷 placeholder
│  67%    [2 cont.]    │  ← overlays: fill_level (esq.) + contamination count (dir.)
├──────────────────────┤
│ 24/02 · 14:32        │  ← uplink_time formatado
│ Vision LTEM A12B8C28 │  ← device_name (truncado)
│ [overflow] [plastic] │  ← badges: overflow amber, contaminantes red
│ 🔗 ENT-00021         │  ← link para entrada associada (se existir), senão "—"
└──────────────────────┘
```

**Classes Tailwind:**
```
rounded-lg border border-border bg-card overflow-hidden
cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all
```

**Grelha layout:** `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4`

---

## Vista Lista — Row (`CameraEventRow`)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [thumb 80x54] │ 24/02 14:32  │ Vision LTEM A12B8C28 │ 67% [████░░] │ 2 cont. │ ENT-00021 │ →  │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Colunas:**

| Col | Conteúdo | Largura |
|-----|----------|---------|
| Miniatura | `img` 80×54 ou `📷` | 80px fixo |
| Data/Hora | `uplink_time` DD/MM HH:mm | 120px |
| Dispositivo | `device_name` truncado | flex-1 |
| Enchimento | barra de progresso + % | 140px |
| Contaminantes | badge count + nomes (max 2) | 140px |
| Entrada | link `entry_number` ou "—" | 100px |
| Acção | `→` (seta para detalhe) | 40px |

**Header da tabela:**
```tsx
<tr className="border-b border-border bg-muted/50 text-xs font-medium text-muted-foreground">
  <th>Imagem</th><th>Data/Hora</th><th>Dispositivo</th>
  <th>Enchimento</th><th>Contaminantes</th><th>Entrada</th><th></th>
</tr>
```

---

## Página de Detalhe — `/cameras/[id]`

### Layout

```
← Voltar a Câmaras

┌─────────────────────────────────────────────┬──────────────────────────┐
│                                             │  INFORMAÇÃO              │
│         [IMAGEM ANOTADA]                    │  ─────────────────────── │
│         (aspect-video, max-h-[500px])       │  Dispositivo             │
│                                             │  Vision LTEM A12B8C28    │
│  [67%]              [2 contaminantes]       │                          │
│  [24/02/2026 14:32:15]                      │  Enchimento              │
│                                             │  67% [████████░░]        │
│  ← anterior  [1 de 3 para esta entrada] →  │                          │
└─────────────────────────────────────────────│  Contaminantes           │
                                              │  plastic  glass          │
  DETALHES TÉCNICOS                           │  contamination_count: 2  │
  ──────────────────────────────────          │                          │
  Bin ID            bin-01                   │  Entrada Associada       │
  Qualidade img.    high                     │  [PS01-E-2026-00021 →]   │
  Resolução         1920x1080                │  (ou "Sem entrada")      │
  Orientação        vertical                 │                          │
  Flash             Não                      │  TELEMETRIA              │
  Temperatura       22.4°C                   │  ─────────────────────── │
  Bateria           85% (LiPo)               │  Bateria    85% (LiPo)   │
                                              │  Temperatura 22.4°C      │
  TIMELINE (se múltiplas leituras na entrada) │  Flash      Não          │
  ──────────────────────────────────          │  Orientação vertical     │
  14:20  14:32  14:45                         │  Img Quality high        │
    ●──────●──────○                           │  Resolução  1920x1080    │
  (scroll horizontal com min-cards)           │                          │
                                              │  Sincronizado            │
                                              │  24/02/2026 14:45:00     │
                                              └──────────────────────────┘
```

### Painel lateral — secções

**1. Identificação**
- `device_name` (texto md font-medium)
- `device_id` (mono xs muted)
- `bin_id` se existir
- dot status Online/Offline do device (via `park_brighterbins_devices`)

**2. Enchimento**
- Valor numérico grande (`text-2xl font-bold`)
- Barra de progresso
- Badge "OVERFLOW" amber se > 100

**3. Contaminantes**
- Badge por tipo (lista de `contamination[]`)
- Count total
- Se vazio: "Nenhum contaminante detetado" (verde)

**4. Entrada Associada**
- Link clicável para `/entries/[entry_id]`
- Mostra `entry_number`
- Se `entry_id = null`: chip muted "Sem entrada correspondente"

**5. Telemetria**
```
Bateria      85% ████░    (LiPo)
Temperatura  22.4°C
Flash        Não
Orientação   Vertical
Qualidade    High
Resolução    1920×1080
```

**6. Metadados**
- `uplink_time` formatado completo: "24/02/2026 às 14:32:15"
- `synced_at`: "Sincronizado às 14:45:00"

---

## Estados da Página Principal

### Estado A — Sem câmara associada
```
┌──────────────────────────────────────────┐
│         📷                               │
│  Nenhum dispositivo configurado          │
│  Associe câmaras em Definições → Câmaras │
│  [Ir para Definições]                    │
└──────────────────────────────────────────┘
```

### Estado B — Câmara configurada, sem leituras no período
```
┌──────────────────────────────────────────┐
│         📷                               │
│  Sem leituras no período selecionado     │
│  Tente alargar o intervalo de datas      │
│  ou sincronize agora.                    │
│  [Sincronizar ↺]                         │
└──────────────────────────────────────────┘
```

### Estado C — A carregar
Spinner centrado + "A carregar leituras..."

---

## Queries Supabase

### Página principal
```typescript
// KPIs
const { data: readings } = await supabase
  .from("entrada_vision_readings")
  .select("id, device_id, device_name, uplink_time, fill_level, contamination_count, contamination, image_url, annotated_img_url, entry_id, battery_level, temperature")
  .eq("park_id", parkId)
  .gte("uplink_time", fromDate)
  .order("uplink_time", { ascending: false })
  .limit(200);

// Dispositivos associados (para verificar se há câmaras)
const { data: devices } = await supabase
  .from("park_brighterbins_devices")
  .select("device_id, device_name")
  .eq("park_id", parkId)
  .eq("is_active", true);
```

**KPIs calculados no cliente:**
```typescript
const total = readings.length;
const contaminated = readings.filter(r => r.contamination_count > 0).length;
const avgFill = readings.filter(r => r.fill_level != null)
  .reduce((sum, r) => sum + r.fill_level!, 0) / readings.length;
const overflow = readings.filter(r => (r.fill_level ?? 0) > 100).length;
```

### Página detalhe
```typescript
// Reading atual
const { data: reading } = await supabase
  .from("entrada_vision_readings")
  .select("*")
  .eq("id", id)
  .single();

// Leituras do mesmo entry (para timeline), se entry_id existir
const { data: entryReadings } = entry_id ? await supabase
  .from("entrada_vision_readings")
  .select("id, uplink_time, fill_level, contamination_count")
  .eq("entry_id", entry_id)
  .order("uplink_time", { ascending: true }) : { data: [] };

// Entrada associada (para mostrar entry_number)
const { data: entry } = entry_id ? await supabase
  .from("entries")
  .select("id, entry_number")
  .eq("id", entry_id)
  .single() : { data: null };
```

---

## Ficheiros a Criar/Modificar

### Novos ficheiros
```
src/app/[locale]/(app)/cameras/page.tsx           ← lista/grelha + KPIs
src/app/[locale]/(app)/cameras/[id]/page.tsx      ← detalhe
src/components/cameras/CameraEventCard.tsx         ← card (grelha)
src/components/cameras/CameraEventRow.tsx          ← row (lista)
src/components/cameras/CameraEventsList.tsx        ← toggle lista/grelha
src/components/cameras/CameraKpiCards.tsx          ← 4 KPI cards no topo
```

### Modificar
```
src/app/[locale]/(app)/layout.tsx                 ← adicionar "Câmaras" à nav
```

---

## Convenções de Código

Seguir padrões existentes:
- `"use client"` + `useEffect` + `createClient()` para leituras no cliente
- `useCurrentPark()` para obter `parkId`
- Inline Tailwind, sem componentes externos
- Ícones `lucide-react`: `Camera`, `RefreshCw`, `LayoutGrid`, `List`, `AlertCircle`, `Battery`, `Thermometer`, `Eye`
- Links com `Link` de `@/i18n/navigation`
- Formato de datas com `toLocaleString("pt-PT", { ... })`

---

## Paleta de Badges/Estados

| Condição | Classe |
|----------|--------|
| Fill normal (0–80%) | `text-foreground bg-muted` |
| Fill alto (80–100%) | `text-amber-600 bg-amber-50` |
| Overflow (>100%) | `text-amber-600 bg-amber-100` — badge "OVERFLOW" |
| Sem contaminação | `text-green-700 bg-green-50` — "Limpo" |
| Com contaminação | `text-red-700 bg-red-50` — nome do contaminante |
| Online | dot `bg-green-500` |
| Offline | dot `bg-muted-foreground` |
| Com entrada | link primary |
| Sem entrada | `text-muted-foreground` — "—" |

---

## Dependências

- Tabela `entrada_vision_readings` — já criada em migration 00013
- Tabela `park_brighterbins_devices` — já criada em migration 00013
- Sync automático via `/api/brighterbins/sync` (cron Vercel)
- `SyncButton` existente reutilizável (`src/components/entries/SyncButton.tsx`)
