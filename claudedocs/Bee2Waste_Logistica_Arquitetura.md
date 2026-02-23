# ARQUITECTURA DE INTEGRAÇÃO — MÓDULO LOGÍSTICA
## Bee2Waste · Gestão de Pedidos, Rotas e Tracking de Frota

Versão 1.0 | Fevereiro 2026 | Baseado em `Bee2Waste_Logistica_Recolhas_Spec.md`

---

## 1. Análise do Estado Atual

### 1.1 O que existe e está estável (NÃO TOCAR)

| Módulo | Ficheiros chave |
|--------|----------------|
| Entries (6-step wizard) | `src/app/.../entries/`, `src/actions/` |
| Classification + NCs | `src/app/.../classification/`, `src/actions/classification.ts` |
| Lots + LQI | `src/app/.../lots/`, `src/actions/lots.ts` |
| Exits (3 tipos) | `src/app/.../exits/` |
| Stock | `src/app/.../stock/` |
| Clients + supplier scoring | `src/app/.../clients/` |
| Dashboard (6 tabs) | `src/app/.../dashboard/`, `src/components/dashboard/` |
| Settings | `src/app/.../settings/` |
| Layout + Auth | `src/app/[locale]/(app)/layout.tsx`, `(auth)/` |

### 1.2 Padrões estabelecidos a seguir OBRIGATORIAMENTE

```typescript
// 1. Routing — SEMPRE usar @/i18n/navigation, NUNCA next/navigation
import { Link, useRouter } from "@/i18n/navigation"

// 2. Park state — SEMPRE via hook
const { currentParkId } = useCurrentPark()

// 3. Server actions — padrão fixo
"use server"
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
// validação Zod → operação DB → revalidatePath()

// 4. Client component reads — supabase directo, nunca fetch
import { createClient } from "@/lib/supabase/client"

// 5. Parâmetros dinâmicos — Next.js 15 obriga use()
const { id } = use(params)  // NOT: params.id
```

---

## 2. Decisões de Arquitectura

### 2.1 Navegação Sidebar — Grupo Colapsável

O sidebar actual tem 8 items flat. O módulo de logística tem 6 sub-páginas. Em vez de adicionar 6 items ao nível de topo (tornaria a sidebar demasiado longa), implementar um **grupo colapsável** com header "Logística".

**Abordagem:** Expandir `NAV_ITEMS` com suporte a `children` e renderizar grupos colapsáveis com estado local no sidebar.

```
Sidebar após:
  Dashboard
  Entradas
  Classificação
  Lotes
  Saídas
  Stock
  Clientes
  ▾ Logística         ← novo grupo colapsável (ícone: Truck)
    · Pedidos
    · Planeamento
    · Tracking
    · Viaturas
    · Motoristas
    · Dashboard
  Definições
```

A modificação é **aditiva** — o comportamento dos items existentes não muda.

### 2.2 Simplificações à Migração (vs. Spec)

A spec referencia `contracts(id)` mas não existe tabela `contracts`. Decisões:

| Item spec | Decisão | Razão |
|-----------|---------|-------|
| `contract_id UUID REFERENCES contracts(id)` | → `contract_ref TEXT` | Sem tabela contracts; evitar FK sem tabela |
| `sla_configs.contract_id` | → Remover FK, usar `client_id` directo | Simplificar para MVP |
| `user_role ADD VALUE 'driver'` | Manter — necessário | user_role é enum PostgreSQL existente |
| `user_role ADD VALUE 'logistics_manager'` | Manter — necessário | Novo role para dispatcher |
| `clients.lat` / `clients.lng` | `ALTER TABLE clients ADD COLUMN` | Necessário para geocoding |
| Sequence para order_number | Usar função `to_char(now(), 'YYYY') || '-' || lpad(...)` | Mais simples que sequence separada |

### 2.3 Mapas — Leaflet + react-leaflet

**Decisão final: Leaflet + OpenStreetMap (tiles gratuitos)**

**Problema crítico com Next.js 15 + SSR:**
Leaflet usa `window` internamente. Todos os componentes de mapa DEVEM usar:

```typescript
// PADRÃO OBRIGATÓRIO para todos os componentes de mapa
"use client"
import dynamic from "next/dynamic"

const MapComponent = dynamic(
  () => import("./map-inner"),
  { ssr: false, loading: () => <div className="h-full bg-muted animate-pulse rounded-lg" /> }
)
```

**CSS do Leaflet** — importar em `src/app/[locale]/(app)/logistica/layout.tsx`:
```typescript
import "leaflet/dist/leaflet.css"
```

**Ícones do Leaflet** — problema conhecido com webpack/Next.js. Solução:
```typescript
// src/lib/leaflet-icons.ts
import L from "leaflet"
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: "/leaflet/marker-icon.png",
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  shadowUrl: "/leaflet/marker-shadow.png",
})
```
Os ficheiros PNG do Leaflet vão para `public/leaflet/`.

### 2.4 Drag-and-Drop — @dnd-kit

**Decisão: @dnd-kit (não react-beautiful-dnd)**

- `@dnd-kit` é a biblioteca moderna, acessível, compatível com React 19
- `react-beautiful-dnd` está abandonada (última release 2022)
- Usado para: reordenação de paragens na lista de rota + arrastar pedidos para rotas

### 2.5 Routing API — OpenRouteService

- Plano gratuito: 2.000 requests/dia
- Suporta perfis HGV (veículos pesados)
- API key via `OPENROUTESERVICE_API_KEY` env var
- Fallback: distância Haversine (sem API) para cálculos aproximados durante planeamento

### 2.6 Geocoding — Nominatim + fallback manual

- Nominatim (OSM): gratuito, 1 req/seg, suficiente para geocoding de moradas de clientes
- Se falhar: o operador insere lat/lng manualmente no formulário
- Guardar coordenadas em `collection_orders.collection_lat/lng` e `clients.lat/lng`

### 2.7 Tracking Real-time — Supabase Realtime

- Subscrever `postgres_changes` na tabela `vehicles` (UPDATE de `current_lat/lng`)
- Canal por `park_id` para isolamento
- Motorista (na PWA) chama Server Action `updateVehiclePosition` a cada 30s
- **Tabelas a activar Realtime no Dashboard Supabase:** `vehicles`, `route_stops`, `collection_orders`

### 2.8 Driver PWA — FASE D (não agora)

A PWA do motorista é a fase mais complexa (Service Worker, IndexedDB, offline sync). Fica para Fase D após as fases A, B, C estarem estáveis.

Para o MVP e demos, o operador pode registar manualmente o estado das paragens a partir do backoffice (funcionalidade de fallback já prevista no spec).

---

## 3. Estrutura de Ficheiros — O que criar

### 3.1 Database Migration

```
supabase/migrations/
└── 00012_logistics.sql          ← NOVA
```

### 3.2 Rotas da Aplicação

```
src/app/[locale]/(app)/logistica/
├── layout.tsx                   ← Sub-layout com import CSS Leaflet
├── pedidos/
│   ├── page.tsx                 ← Lista + toggle mapa/lista
│   ├── novo/
│   │   └── page.tsx             ← Stepper de criação (3 passos)
│   └── [id]/
│       └── page.tsx             ← Detalhe + timeline de estados
├── planeamento/
│   └── page.tsx                 ← Split view mapa + lista (componente pesado)
├── tracking/
│   └── page.tsx                 ← Mapa tempo real (Supabase Realtime)
├── viaturas/
│   ├── page.tsx
│   ├── nova/
│   │   └── page.tsx
│   └── [id]/
│       └── page.tsx
├── motoristas/
│   ├── page.tsx
│   ├── novo/
│   │   └── page.tsx
│   └── [id]/
│       └── page.tsx
└── dashboard/
    └── page.tsx                 ← 5 tabs KPIs
```

### 3.3 Server Actions

```
src/actions/logistics/
├── orders.ts        ← createOrder, updateOrderStatus, bulkUpdateOrders
├── routes.ts        ← createRoute, addStop, removeStop, reorderStops, confirmRoute
├── vehicles.ts      ← createVehicle, updateVehicle, logMaintenance
├── drivers.ts       ← createDriver, updateDriver, setShift
├── tracking.ts      ← updateVehiclePosition, recordStopArrival, completeStop, failStop
├── planning.ts      ← calculatePlanningScores, suggestRoutes
└── integration.ts   ← createEntryFromStop
```

### 3.4 Componentes

```
src/components/logistics/
├── order-card.tsx           ← Card drag-and-drop de pedido
├── order-status-badge.tsx   ← Badge colorido por estado
├── priority-badge.tsx       ← Badge normal/urgente/crítico
├── sla-timer.tsx            ← Contagem regressiva SLA
├── capacity-bar.tsx         ← Barra % capacidade viatura
├── route-panel.tsx          ← Painel de rota (paragens)
├── vehicle-marker.tsx       ← Ícone de viatura animado no mapa
├── stop-marker.tsx          ← Marcador de paragem no mapa
├── map-no-ssr.tsx           ← Wrapper dynamic import para mapas
├── orders-map.tsx           ← Mapa de pedidos pendentes
├── planning-map.tsx         ← Mapa interactivo de planeamento
└── tracking-map.tsx         ← Mapa de tracking em tempo real
```

### 3.5 Tipos e Enums

```
src/types/enums.ts              ← MODIFICAR: adicionar novos enums
src/types/database.ts           ← REGENERAR após migration push
```

Novos enums a adicionar:
```typescript
export const VEHICLE_STATUSES = ["available", "on_route", "in_maintenance", "inactive"] as const
export const VEHICLE_TYPES = ["open_body", "container", "compactor", "tank", "flatbed", "other"] as const
export const ORDER_STATUSES = ["draft", "pending", "planned", "on_route", "at_client", "completed", "failed", "cancelled"] as const
export const ORDER_PRIORITIES = ["normal", "urgent", "critical"] as const
export const ROUTE_STATUSES = ["draft", "confirmed", "on_execution", "completed", "cancelled"] as const
export const STOP_STATUSES = ["pending", "at_client", "completed", "failed", "skipped"] as const
export const SHIFT_STATUSES = ["scheduled", "active", "completed", "absent", "cancelled"] as const
```

### 3.6 i18n — Chaves de tradução

Ficheiros de tradução (PT e EN):
```json
{
  "nav": {
    "logistics": "Logística",
    "logistics_orders": "Pedidos",
    "logistics_planning": "Planeamento",
    "logistics_tracking": "Tracking",
    "logistics_vehicles": "Viaturas",
    "logistics_drivers": "Motoristas",
    "logistics_dashboard": "Dashboard"
  }
}
```

---

## 4. Migração DB — Decisões de Implementação

### 4.1 Tabelas a criar (por ordem de dependências)

```
1. vehicles                — sem dependências novas
2. drivers                 — depende de profiles (já existe), vehicles
3. vehicle_positions       — depende de vehicles
4. collection_orders       — depende de clients, ler_codes, parks
5. collection_routes       — depende de vehicles, drivers, parks
6. vehicle_positions FK    — adicionar FK para collection_routes (ALTER TABLE)
7. route_stops             — depende de collection_routes, collection_orders
8. driver_shifts           — depende de drivers, vehicles
9. vehicle_maintenance     — depende de vehicles
10. sla_configs            — depende de parks, clients, ler_codes
11. ALTER TABLE clients    — adicionar lat/lng
12. ALTER TABLE entries    — adicionar collection_order_id, collection_route_id
```

### 4.2 Ajuste ao user_role enum

```sql
-- Adicionar novos roles (PostgreSQL permite ADD VALUE em enum existente)
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'driver';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'logistics_manager';
```

**Nota:** `ADD VALUE` em enum PostgreSQL não pode ser feito dentro de uma transaction. A migration deve ter `SET LOCAL lock_timeout = '5s'` e ser a primeira instrução.

### 4.3 Remoção da referência a contracts

A tabela `contracts` não existe. Alterações à spec original:
- `collection_orders.contract_id UUID REFERENCES contracts(id)` → `contract_ref TEXT`
- `sla_configs.contract_id UUID REFERENCES contracts(id)` → removido; SLA vinculado a `client_id` directamente

### 4.4 Geocoordinates nos Clientes

```sql
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS lat NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS lng NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS address_geocoded_at TIMESTAMPTZ;
```

---

## 5. Packages npm a Instalar

```bash
npm install leaflet react-leaflet @types/leaflet leaflet.markercluster
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npm install haversine-distance
# Fase B+ (routing API não precisa de package — é fetch HTTP puro)
# Fase C+ (PWA):
# npm install serwist idb signature_pad
# Fase C+ (PDF):
# npm install jspdf jspdf-autotable
```

**Total fase A+B**: 7 novos packages
**Total fase C+D**: +5 packages
**Sem impacto** nos packages existentes

---

## 6. Integração com Módulos Existentes

### 6.1 Módulo de Entradas (crítico)

Quando `route_stops.status` muda para `completed`:
1. Server Action `createEntryFromStop(stopId)` cria automaticamente registo em `entries` com status `vehicle_arrived`
2. Campos pré-preenchidos: `client_id`, `ler_code`, `transporter_plate`, `declared_weight_kg`, `collection_order_id`
3. A ficha de Entrada existente já tem espaço para mostrar "Origem: Pedido de Recolha"

**Alteração na ficha de entrada** (`/entries/[id]/page.tsx`): adicionar secção "Origem — Recolha Agendada" se `collection_order_id` preenchido.

### 6.2 Dashboard Principal (6 tabs)

Adicionar 3 alertas no painel de alertas existente:
- Pedidos com SLA deadline < 48h
- Viaturas em manutenção com rotas planeadas
- Ciclos de produção a atingir (já existe `client_production_cycles`) → sugerir criação de pedido

**Alteração** no `src/components/dashboard/alerts-tab.tsx` e `overview-tab.tsx`.

### 6.3 Ficha de Cliente

Adicionar tab "Pedidos de Recolha" em `/clients/[id]/page.tsx` mostrando histórico de pedidos (query `collection_orders WHERE client_id = id`).

---

## 7. Demo Data — Plano de Seed

### 7.1 Dados de referência (contexto Setúbal/Sines)

**Viaturas (3):**
```
PT-45-AB — Caixa Aberta, 15.000 kg, em_rota
PT-78-CD — Compactador, 8.000 kg, disponível
PT-12-EF — Contentor, 20.000 kg, em_manutencao
```

**Motoristas (3):**
```
João Silva — turno 07:00-17:00, viatura PT-45-AB
António Ferreira — turno 07:30-16:30, viatura PT-78-CD
Paulo Costa — turno 08:00-18:00, viatura PT-12-EF
```

**Coordenadas de clientes (PT):**
- Usar clientes já existentes no seed (SUP1, SUP2, BOTH) com coordenadas reais da região Setúbal

### 7.2 Distribuição de pedidos demo (20 total)

| Estado | Quantidade | Cenário |
|--------|-----------|---------|
| `pending` | 8 | Aguardam planeamento (incluindo 2 críticos) |
| `planned` | 4 | Atribuídos à rota de amanhã |
| `on_route` | 3 | Em execução hoje (com posições GPS simuladas) |
| `completed` | 4 | Concluídos nos últimos 7 dias |
| `failed` | 1 | Falhado (cliente ausente) |

### 7.3 Rotas demo (3)

| Rota | Estado | Descrição |
|------|--------|-----------|
| RTA-2026-000001 | `completed` | Ontem, 4 paragens, 12.5t |
| RTA-2026-000002 | `on_execution` | Hoje, 3 paragens (1 concluída, 1 em curso, 1 pendente) |
| RTA-2026-000003 | `confirmed` | Amanhã, 4 paragens planeadas |

### 7.4 Posições GPS simuladas

Para os demos de tracking, a tabela `vehicles` terá coordenadas fixas pré-definidas (sem movimento real). A viatura "em rota" terá uma posição a meio de uma rota simulada entre dois clientes na área de Setúbal.

---

## 8. Fases de Implementação (adaptadas)

### Fase A — Fundação e CRUD (implementar primeiro)

**Objetivo**: DB funcionante + gestão básica sem mapas
**Estimativa**: 3-4 dias

**Deliverables:**
- [ ] `supabase/migrations/00012_logistics.sql` — todas as tabelas
- [ ] `npx supabase db push` aplicada
- [ ] `src/types/database.ts` regenerado + `src/types/enums.ts` actualizado
- [ ] `app-sidebar.tsx` — grupo colapsável Logística
- [ ] `src/app/.../logistica/layout.tsx` com CSS Leaflet
- [ ] Tradução PT: todas as chaves `nav.*` e labels
- [ ] `/logistica/viaturas` — lista + criar + detalhe
- [ ] `/logistica/motoristas` — lista + criar + detalhe
- [ ] `/logistica/pedidos` — lista (vista tabela) + criar (stepper) + detalhe
- [ ] Server actions: `vehicles.ts`, `drivers.ts`, `orders.ts` (CRUD básico)
- [ ] Seed demo: 3 viaturas + 3 motoristas + 20 pedidos + 3 rotas

### Fase B — Mapas e Planeamento Manual

**Objetivo**: Interface visual de planeamento com mapa + atribuição manual
**Estimativa**: 4-5 dias

**Deliverables:**
- [ ] Instalar leaflet + react-leaflet + @dnd-kit
- [ ] Mapa de pedidos pendentes no toggle da lista de pedidos
- [ ] `/logistica/planeamento` — split view mapa + lista + rotas
- [ ] Drag-and-drop: arrastar pedido para rota
- [ ] Reordenação de paragens (drag-and-drop na lista)
- [ ] Cálculo de totais em tempo real (Haversine)
- [ ] Confirmação de rota → actualização de estados
- [ ] Server actions: `routes.ts` (criar, adicionar/remover paragem, confirmar)

### Fase C — Tracking e Execução

**Objetivo**: Execução de rotas + tracking em tempo real
**Estimativa**: 4-5 dias

**Deliverables:**
- [ ] `/logistica/tracking` — mapa com Supabase Realtime
- [ ] Backoffice de execução: registar chegada/saída/conclusão de paragem (fallback sem PWA)
- [ ] Server actions: `tracking.ts` (updateVehiclePosition, recordStop, completeStop)
- [ ] `integration.ts` — createEntryFromStop
- [ ] Integração na ficha de entrada (secção "Origem")

### Fase D — Algoritmo + Dashboard + PWA

**Objetivo**: Planeamento inteligente + KPIs + motorista móvel
**Estimativa**: 5-7 dias

**Deliverables:**
- [ ] `planning.ts` — calculatePlanningScores + suggestRoutes (Greedy + 2-opt)
- [ ] Modal de optimização com pesos ajustáveis
- [ ] `/logistica/dashboard` — 5 tabs KPIs
- [ ] Alertas no dashboard principal (SLA, manutenção, ciclos)
- [ ] PWA motorista (opcional, mais complexo)
- [ ] OpenRouteService integration para ETA reais

---

## 9. Riscos e Mitigações

| Risco | Probabilidade | Mitigação |
|-------|--------------|-----------|
| Leaflet conflito com SSR Next.js 15 | Alta | dynamic import ssr:false em todos os mapas |
| user_role enum ADD VALUE fora de transaction | Média | Migration separada ou primeira instrução do ficheiro |
| Supabase Realtime não activado nas tabelas | Alta | Documentar passo manual no Supabase Dashboard |
| OpenRouteService rate limit (2000/dia) | Baixa no MVP | Haversine como fallback; cache de resultados |
| Massa de código nova quebrar build | Média | Build check depois de cada fase (antes de avançar) |

---

## 10. Checklist de Pré-implementação

Antes de começar a escrever código:

- [ ] Confirmar que `main` está limpo (`git status`)
- [ ] Verificar que estamos em `feature/orders-logistics-tracking`
- [ ] `npm run build` passa sem erros no estado actual
- [ ] Ambiente Supabase acessível para `db push`
- [ ] `.env.local` tem todas as chaves necessárias

---

*Este documento serve de referência durante toda a implementação. Actualizar quando decisões mudarem.*
