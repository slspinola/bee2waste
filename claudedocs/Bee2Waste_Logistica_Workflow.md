# WORKFLOW DE IMPLEMENTAÇÃO — MÓDULO LOGÍSTICA
## Bee2Waste · Pedidos, Rotas, Tracking e Frota

Versão 1.0 | Fevereiro 2026

---

## Visão Geral

```
FASE A (Fundação)  →  FASE B (Mapas)  →  FASE C (Tracking)  →  FASE D (Algoritmo + Dashboard)
   3-4 dias               4-5 dias            4-5 dias                  5-7 dias
```

**Branch activa:** `feature/orders-logistics-tracking`
**Documentos de referência:**
- `claudedocs/Bee2Waste_Logistica_Recolhas_Spec.md` (especificação funcional)
- `claudedocs/Bee2Waste_Logistica_Arquitetura.md` (decisões técnicas)

---

## FASE A — Fundação: DB, Tipos, CRUD e Seed

**Objectivo:** Sistema funcionante sem mapas. Operador consegue gerir viaturas, motoristas e pedidos em lista.

### A1 · DB Migration + Tipos ← `backend-architect`

**Subagente:** `backend-architect`
**Inputs:** `claudedocs/Bee2Waste_Logistica_Arquitetura.md` §4, `supabase/migrations/`
**Outputs:** `supabase/migrations/00012_logistics.sql`, `src/types/database.ts` (regenerado)

**Tarefas:**
1. Criar `00012_logistics.sql` com todas as tabelas pela ordem de dependências:
   - `ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'driver', 'logistics_manager'`
   - `CREATE TABLE vehicles` (plate, type, capacity_kg/m3, authorized_ler_codes[], status, current_lat/lng)
   - `CREATE TABLE drivers` (profile_id FK, license_number, categories[], shift_start/end, default_vehicle_id)
   - `CREATE TABLE vehicle_positions` (BIGSERIAL, vehicle_id, route_id, lat, lng, speed, recorded_at)
   - `CREATE TABLE collection_orders` (order_number, client_id, ler_code_id, estimated_quantity, collection_lat/lng, priority, status, planning_score, score_breakdown JSONB, contract_ref TEXT)
   - `CREATE TABLE collection_routes` (route_number, route_date, vehicle_id, driver_id, status, planned_stops_count, planned_weight_kg, planned_route_geojson JSONB)
   - `ALTER TABLE vehicle_positions ADD CONSTRAINT fk_route`
   - `CREATE TABLE route_stops` (route_id, order_id, stop_sequence, status, estimated_arrival, actual_kg)
   - `CREATE TABLE driver_shifts` (driver_id, shift_date, planned_start/end, status)
   - `CREATE TABLE vehicle_maintenance` (vehicle_id, type, scheduled_date, next_due_date)
   - `CREATE TABLE sla_configs` (park_id, client_id, ler_code_id, max_wait_days, alert_before_days)
   - `ALTER TABLE clients ADD COLUMN lat/lng/address_geocoded_at`
   - `ALTER TABLE entries ADD COLUMN collection_order_id, collection_route_id`
   - Índices, triggers updated_at, RLS policies (padrão: `org_id = get_user_org_id()`)
2. `npx supabase db push` (validar sem erros)
3. `npx supabase gen types typescript --linked > src/types/database.ts`

**Critério de conclusão:** `npx supabase db push` sem erros + `database.ts` com as novas interfaces.

---

### A2 · Enums + Sidebar + Layout ← `frontend-architect`

**Subagente:** `frontend-architect`
**Inputs:** `src/types/enums.ts`, `src/components/layout/app-sidebar.tsx`, arquitectura §3.5, §2.1
**Outputs:** enums actualizado, sidebar com grupo Logística, layout.tsx para logística

**Tarefas:**
1. `src/types/enums.ts` — adicionar:
   ```typescript
   VEHICLE_STATUSES, VEHICLE_TYPES, ORDER_STATUSES, ORDER_PRIORITIES,
   ROUTE_STATUSES, STOP_STATUSES, SHIFT_STATUSES, QUANTITY_UNITS
   ```
2. `src/components/layout/app-sidebar.tsx` — refactor para suportar grupos colapsáveis:
   - Manter NAV_ITEMS flat para os 8 items existentes (sem quebrar nada)
   - Adicionar `NAV_GROUPS` com `key: "logistics"`, `icon: Truck`, sub-items array
   - Renderizar grupos com estado `isOpen` (localStorage para persistência)
   - Ícones: `Truck` (parent), `ClipboardList` (Pedidos), `Map` (Planeamento), `Radio` (Tracking), `Truck` (Viaturas), `User` (Motoristas), `BarChart2` (Dashboard)
3. `src/app/[locale]/(app)/logistica/layout.tsx`:
   ```typescript
   import "leaflet/dist/leaflet.css"
   export default function LogisticaLayout({ children }) { return <>{children}</> }
   ```
4. Ficheiros i18n — adicionar chaves `nav.logistics*` em PT e EN
5. Copiar `public/leaflet/` (marker-icon.png, marker-icon-2x.png, marker-shadow.png)
6. Criar `src/lib/leaflet-icons.ts` (fix ícones Leaflet/webpack)

**Critério de conclusão:** Sidebar mostra grupo Logística expansível. Sub-itens navegam para rotas (ainda 404 é ok).

---

### A3 · Server Actions: Viaturas e Motoristas ← `backend-architect`

**Subagente:** `backend-architect`
**Inputs:** Padrão de actions existente (`src/actions/lots.ts`), schema tabelas vehicles/drivers
**Outputs:** `src/actions/logistics/vehicles.ts`, `src/actions/logistics/drivers.ts`

**Tarefas:**
1. `src/actions/logistics/vehicles.ts`:
   - `createVehicle(data)` — Zod schema, insert, revalidatePath("/logistica/viaturas")
   - `updateVehicle(id, data)` — update, revalidatePath
   - `toggleVehicleStatus(id, status)` — mudar status (available/in_maintenance/inactive)
   - `logMaintenance(vehicleId, data)` — insert vehicle_maintenance, revalidatePath
2. `src/actions/logistics/drivers.ts`:
   - `createDriver(data)` — insert drivers
   - `updateDriver(id, data)` — update
   - `setShift(driverId, date, start, end)` — upsert driver_shifts

---

### A4 · Pages: Viaturas e Motoristas ← `frontend-architect`

**Subagente:** `frontend-architect`
**Inputs:** Padrão de páginas existentes (ex: `/clients/page.tsx`), actions A3
**Outputs:** 6 novas páginas (lista + nova + detalhe × 2)

**Tarefas:**
1. `/logistica/viaturas/page.tsx` — tabela com: matrícula, tipo, capacidade kg/m³, LER autorizados, estado (badge colorido), última posição. Botão "Registar Viatura".
2. `/logistica/viaturas/nova/page.tsx` — formulário inline (não wizard): matrícula, marca, modelo, tipo (select), capacidades, LER codes (multi-select dos autorizados do parque), notas.
3. `/logistica/viaturas/[id]/page.tsx` — tabs: Detalhes (dados gerais + estado), Manutenção (histórico + formulário registo), Rotas (histórico de rotas).
4. `/logistica/motoristas/page.tsx` — tabela: nome, nº licença, categorias, turno, viatura atribuída, disponibilidade hoje.
5. `/logistica/motoristas/novo/page.tsx` — formulário: dados pessoais, licença (nº, categorias, validade), ADR, turno padrão, viatura default.
6. `/logistica/motoristas/[id]/page.tsx` — tabs: Dados, Turnos (calendário simples), Rotas.

**Componentes novos:** `CapacityBar`, `VehicleStatusBadge`, `PriorityBadge`

---

### A5 · Server Actions: Pedidos ← `backend-architect`

**Subagente:** `backend-architect`
**Inputs:** Schema collection_orders, padrão actions
**Outputs:** `src/actions/logistics/orders.ts`

**Tarefas:**
1. `createOrder(data)` — Zod schema completo, geocoding Nominatim (fetch), insert collection_orders, gerar order_number (`REC-YYYY-NNNNNN`), revalidatePath
2. `updateOrderStatus(id, status, notes?)` — validar transições permitidas, update timestamps (confirmed_at, started_at, etc.)
3. `cancelOrder(id, reason)` — update status=cancelled + cancelled_at
4. `updateOrderPriority(id, priority)` — update priority

**Geocoding helper:**
```typescript
async function geocodeAddress(address: string, city: string): Promise<{lat,lng}|null> {
  const q = encodeURIComponent(`${address}, ${city}, Portugal`)
  const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
    { headers: { "User-Agent": "Bee2Waste/1.0" } })
  const [result] = await res.json()
  return result ? { lat: parseFloat(result.lat), lng: parseFloat(result.lon) } : null
}
```

---

### A6 · Pages: Pedidos de Recolha ← `frontend-architect`

**Subagente:** `frontend-architect`
**Inputs:** Actions A5, componentes PriorityBadge, SlaTimer
**Outputs:** 3 páginas + 2 componentes novos

**Tarefas:**
1. `/logistica/pedidos/page.tsx` — tabela com filtros (estado, prioridade, LER, cliente). Toggle vista: tabela (activo) / mapa (placeholder Fase B). Badges coloridos: prioridade (verde/amarelo/vermelho) + SLA countdown (dias restantes, vermelho se <48h).
2. `/logistica/pedidos/novo/page.tsx` — stepper 3 passos:
   - Passo 1: Seleccionar cliente (autocomplete dos clients existentes) + LER code (dropdown filtrado pelas autorizações do parque)
   - Passo 2: Quantidade + unidade + morada de recolha + contacto no local + instruções especiais
   - Passo 3: Datas preferidas + prioridade + referência interna + preview do SLA calculado
   - Submit → `createOrder()` → redirect para lista
3. `/logistica/pedidos/[id]/page.tsx` — header com status badge + timeline visual de estados. Tabs: Detalhes, Rota Atribuída (link se planeado), Entrada Gerada (link se concluído).
4. `src/components/logistics/order-status-badge.tsx` — badge por estado (draft/pending/planned/on_route/at_client/completed/failed/cancelled)
5. `src/components/logistics/sla-timer.tsx` — mostra dias restantes, formatado, vermelho se urgente

---

### A7 · Seed Demo Data (Logística) ← `backend-architect`

**Subagente:** `backend-architect`
**Inputs:** IDs existentes no seed (ORG, PS, SN, USER, SUP1, SUP2, BOTH, LER codes), coordenadas Setúbal
**Outputs:** Novo ficheiro `scripts/seed-logistics.mjs` ou adição ao `run-seed.mjs`

**Dados a inserir:**
```
Viaturas:
- 67-AB-12: Caixa Aberta, 15000kg, on_route, lat=38.5244 lng=-8.8882
- 78-CD-34: Compactador, 8000kg, available, lat=38.5195 lng=-8.8800
- 89-EF-56: Contentor, 20000kg, in_maintenance

Motoristas: (criar profiles temporários ou usar USER existente como base)
- João Silva — 07:00-17:00, viatura 67-AB-12
- António Ferreira — 07:30-16:30, viatura 78-CD-34

Pedidos (20 total, usar LER codes e clientes existentes):
- 8 pending (incluindo 2 com priority=critical e sla_deadline < amanhã)
- 4 planned (linked a rota confirmada)
- 3 on_route (linked a rota em execução)
- 4 completed (com completed_at nos últimos 7 dias)
- 1 failed (com failure_reason="Cliente ausente")

Rotas (3):
- RTA-2026-00001: completed, ontem, 4 paragens concluídas
- RTA-2026-00002: on_execution, hoje, 3 paragens (1 completed, 1 at_client, 1 pending)
- RTA-2026-00003: confirmed, amanhã, 4 paragens pending
```

---

### A · Validação ← `quality-engineer`

**Subagente:** `quality-engineer`
**Tarefas:**
1. `npm run build` — zero erros TypeScript e ESLint
2. Verificar que todos os imports de types novos compilam
3. Verificar que sidebar renderiza sem erros
4. Verificar que as 6+3 novas páginas carregam em dev sem 500
5. Confirmar seed inseriu dados: `SELECT COUNT(*) FROM vehicles; -- 3`

---

## FASE B — Mapas e Planeamento Manual

**Objectivo:** Operador planeia rotas visualmente: arrasta pedidos para viaturas no mapa.

### B1 · Instalação Leaflet + Componentes Base ← `frontend-architect`

**Subagente:** `frontend-architect`
**Inputs:** `claudedocs/Bee2Waste_Logistica_Arquitetura.md` §2.3, §3.4
**Outputs:** Packages instalados, componentes de mapa base

**Tarefas:**
1. `npm install leaflet react-leaflet @types/leaflet leaflet.markercluster @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities haversine-distance`
2. Completar `src/lib/leaflet-icons.ts`
3. `src/components/logistics/map-no-ssr.tsx` — wrapper `dynamic(..., { ssr: false })`
4. `src/components/logistics/orders-map.tsx` — mapa Leaflet com marcadores de pedidos pendentes:
   - Cor por prioridade: verde (normal), amarelo (urgente), vermelho (crítico)
   - Tamanho proporcional à quantidade estimada
   - Cluster com `MarkerClusterGroup`
   - Popup ao clicar: dados do pedido + botão "Planear"
5. Toggle mapa/lista na página `/logistica/pedidos` (estado local + query param `?view=map`)

---

### B2 · Interface de Planeamento ← `frontend-architect`

**Subagente:** `frontend-architect`
**Inputs:** Spec §5.3 (ASCII diagram do layout), actions de routes (B3), @dnd-kit docs
**Outputs:** `/logistica/planeamento/page.tsx` + 3 componentes

**Tarefas:**
1. `/logistica/planeamento/page.tsx` — layout split view responsivo:
   - Barra superior: seletor de data + contador "Frota disponível: N viaturas" + botão "Otimizar" (disabled até Fase D, com tooltip "Em breve")
   - Painel esquerdo (320px fixo): lista de pedidos pendentes não atribuídos, ordenados por planning_score DESC, com drag handle (@dnd-kit)
   - Mapa central (flex-1): Leaflet com rotas coloridas por viatura + marcadores numerados de paragens
   - Painel inferior (resizable): cards das rotas do dia
2. `src/components/logistics/route-panel.tsx` — card de rota expansível:
   - Header: matrícula, motorista, nº paragens, distância, peso, % capacidade
   - Lista de paragens reordenável via drag-and-drop (@dnd-kit/sortable)
   - Botões: Confirmar Rota, Remover Rota
3. `src/components/logistics/planning-map.tsx` — mapa de planeamento:
   - Marcadores de pedidos pendentes (arrastar para rota → chamar addStop)
   - Linhas de rota por viatura (cores distintas: azul, verde, laranja, roxo)
   - Numeração nas paragens
4. `src/components/logistics/capacity-bar.tsx` — barra verde/amarelo/vermelho por % capacidade

---

### B3 · Server Actions: Rotas ← `backend-architect`

**Subagente:** `backend-architect`
**Inputs:** Schema collection_routes + route_stops
**Outputs:** `src/actions/logistics/routes.ts`

**Tarefas:**
1. `createRoute(parkId, vehicleId, driverId, date)` — insert route com status draft, gerar route_number
2. `addStopToRoute(routeId, orderId, sequence?)` — insert route_stop, update order status=planned, update route.planned_stops_count
3. `removeStopFromRoute(stopId)` — delete stop, update order status=pending, recalcular sequences
4. `reorderStops(routeId, orderedStopIds)` — update stop_sequence para cada stop, recalcular distância Haversine total
5. `confirmRoute(routeId)` — update status=confirmed, update todos os pedidos linked para status=planned, set confirmed_at + confirmed_by
6. `cancelRoute(routeId)` — update status=cancelled, todos os pedidos voltam a pending

**Haversine helper:**
```typescript
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}
```

---

### B · Validação ← `quality-engineer`

1. `npm run build` — sem erros SSR do Leaflet
2. Página de planeamento carrega sem erros no browser
3. Drag-and-drop funciona (testar em dev)
4. Rota criada aparece no mapa
5. Confirmar rota muda estados dos pedidos

---

## FASE C — Tracking e Integração

**Objectivo:** Rastrear viaturas em tempo real. Ao concluir paragem → cria Entrada automaticamente.

### C1 · Mapa de Tracking Realtime ← `frontend-architect`

**Subagente:** `frontend-architect`
**Inputs:** Supabase Realtime docs, schema vehicles/route_stops
**Outputs:** `/logistica/tracking/page.tsx`, `src/components/logistics/tracking-map.tsx`

**Tarefas:**
1. `src/components/logistics/tracking-map.tsx` — mapa Leaflet com:
   - Ícone de viatura animado (rotação baseada em heading_deg)
   - Linha tracejada: rota planeada (planned_route_geojson)
   - Linha contínua: percurso real (vehicle_positions do dia atual)
   - Marcadores paragem coloridos por estado
2. `/logistica/tracking/page.tsx`:
   - Mapa full-height
   - Barra lateral: lista de rotas activas, ETA regresso ao parque
   - Supabase Realtime subscription: `postgres_changes` UPDATE em `vehicles` (filtro park_id)
   - Supabase Realtime subscription: `postgres_changes` UPDATE em `route_stops` (filtro route_id)
   - Painel de alertas: viatura parada > 30min, paragem falhada

---

### C2 · Server Actions: Tracking e Execução ← `backend-architect`

**Subagente:** `backend-architect`
**Inputs:** Schema vehicles, route_stops, entries
**Outputs:** `src/actions/logistics/tracking.ts`, `src/actions/logistics/integration.ts`

**Tarefas — tracking.ts:**
1. `updateVehiclePosition(vehicleId, lat, lng, speed, heading)` — INSERT vehicle_positions + UPDATE vehicles.current_lat/lng/position_updated_at
2. `startRoute(routeId)` — UPDATE route status=on_execution + vehicle status=on_route + departure_time
3. `recordStopArrival(stopId)` — UPDATE stop status=at_client + actual_arrival + UPDATE order status=at_client
4. `completeStop(stopId, actualKg, notes)` — UPDATE stop status=completed + actual_kg + actual_departure + UPDATE order status=completed + completed_at → chamar createEntryFromStop
5. `failStop(stopId, reason)` — UPDATE stop status=failed + failure_reason + UPDATE order status=failed

**Tarefas — integration.ts:**
6. `createEntryFromStop(stopId)` — fetch stop + order + client + vehicle, INSERT entries com status vehicle_arrived pré-preenchido, UPDATE collection_orders.entry_id

---

### C3 · Integração UI — Entries e Clients ← `frontend-architect`

**Subagente:** `frontend-architect`
**Inputs:** `/entries/[id]/page.tsx`, `/clients/[id]/page.tsx` existentes
**Outputs:** Modificações aditivas nas páginas existentes

**Tarefas:**
1. `/entries/[id]/page.tsx` — adicionar secção "Origem — Recolha Agendada" após Storage section, visível apenas se `collection_order_id` não null:
   - Pedido nº + link para `/logistica/pedidos/[id]`
   - Rota nº + motorista + viatura
   - Fotos tiradas pelo motorista (se houver)
2. `/clients/[id]/page.tsx` — adicionar tab "Pedidos" (5ª tab, após "Qualidade"):
   - Tabela de collection_orders WHERE client_id = id
   - Colunas: nº pedido, LER, quantidade, estado badge, data, link

---

### C · Validação ← `quality-engineer`

1. Build sem erros
2. Tracking page subscreve Realtime sem erros na consola
3. completeStop → entry criada automaticamente com campos correctos
4. Tab "Pedidos" no cliente aparece com dados

---

## FASE D — Algoritmo, Dashboard e Alertas

**Objectivo:** Planeamento inteligente com scoring automático. Dashboard de KPIs de logística.

### D1 · Planning Score + Algoritmo Greedy ← `backend-architect`

**Subagente:** `backend-architect`
**Inputs:** Spec §7 (algoritmo), `supplier_scores` e `market_prices` tables, haversine-distance
**Outputs:** `src/actions/logistics/planning.ts`

**Tarefas:**
1. `calculatePlanningScores(parkId, orderIds[])`:
   - Fetch: supplier_scores (LQI normalizado), market_prices (por LER), dias de espera, SLA deadline, quantidade, prioridade
   - Calcular score = w1×supplier + w2×market + w3×wait + w4×sla + w5×qty + w6×priority + w7×ler_compat
   - Update collection_orders.planning_score + score_breakdown JSONB
   - Return scores por order_id
2. `suggestRoutes(parkId, date, vehicleIds[], weights?)`:
   - Sort orders by planning_score DESC
   - Greedy construction: para cada viatura, cheapest insertion até capacidade atingida ou orders esgotados
   - 2-opt local search: melhorar ordem das paragens por distância Haversine
   - Return: array de rotas propostas (vehicleId, orderedOrderIds[])
3. Botão "Otimizar" no planeamento: abre modal com sliders de pesos → chama suggestRoutes → proposta aparece no mapa para o operador aceitar/rejeitar

---

### D2 · Dashboard de Logística ← `frontend-architect`

**Subagente:** `frontend-architect`
**Inputs:** Spec §10 (KPIs + layout 5 tabs), padrão dos dashboards existentes (`src/components/dashboard/`)
**Outputs:** `/logistica/dashboard/page.tsx` + componentes em `src/components/logistics/dashboard/`

**Tarefas:**
1. `/logistica/dashboard/page.tsx` — Radix Tabs, 5 tabs, filtro de período (7d/30d/90d)
2. Tab 1 Vista Geral: 5 KPI cards (pendentes, t a planear, t recolhidas hoje, viaturas em rota, SLA em risco) + mini-mapa frota + painel alertas logísticos
3. Tab 2 Pedidos e SLA: gráfico barras por estado (div-based, como o dashboard principal), distribuição tempos de espera, lista SLA risk com action link
4. Tab 3 Frota: card por viatura (utilização %, km, paragens), gráfico evolução semanal, tabela manutenção
5. Tab 4 Motoristas: ranking tabela (toneladas, taxa conclusão, pontualidade), calendário mensal disponibilidade
6. Tab 5 Eficiência: métricas km/t e custo/t (sparkline reutilizando `src/components/dashboard/sparkline.tsx`)

---

### D3 · Alertas no Dashboard Principal ← `frontend-architect`

**Subagente:** `frontend-architect`
**Inputs:** `src/components/dashboard/alerts-tab.tsx`, `src/components/dashboard/overview-tab.tsx`
**Outputs:** Modificações aditivas nos componentes existentes

**Tarefas:**
1. `alerts-tab.tsx` — adicionar 3 novos tipos de alerta:
   - `logistics_sla_risk`: pedidos com sla_deadline < now() + 48h
   - `vehicle_maintenance_due`: viaturas com next_due_date < now() + 14d com rotas planeadas
   - `supplier_cycle_due`: client_production_cycles com next_predicted_date < now() + 7d (já existia, agora link para criar pedido)
2. `overview-tab.tsx` — adicionar ao painel de alertas rápidos (ja existe) as contagens logísticas

---

### D · Validação Final ← `quality-engineer`

1. `npm run build` — zero erros
2. Algoritmo de planning produz rotas plausíveis (testar com seed data)
3. Dashboard logística carrega todos os tabs sem erros
4. Alertas no dashboard principal aparecem com dados do seed
5. Verificar que nenhuma feature existente foi quebrada (smoke test: entries wizard, lots, exits, clients, dashboard principal)

---

## Matriz de Subagentes por Tarefa

| Task ID | Fase | Tarefa | Subagente |
|---------|------|--------|-----------|
| A1 | A | DB Migration + Tipos | `backend-architect` |
| A2 | A | Enums + Sidebar + Layout | `frontend-architect` |
| A3 | A | Actions Viaturas/Motoristas | `backend-architect` |
| A4 | A | Pages Viaturas/Motoristas | `frontend-architect` |
| A5 | A | Actions Pedidos | `backend-architect` |
| A6 | A | Pages Pedidos | `frontend-architect` |
| A7 | A | Seed Demo Logística | `backend-architect` |
| A-val | A | Validação Fase A | `quality-engineer` |
| B1 | B | Leaflet + Componentes Base | `frontend-architect` |
| B2 | B | Interface Planeamento | `frontend-architect` |
| B3 | B | Actions Rotas | `backend-architect` |
| B-val | B | Validação Fase B | `quality-engineer` |
| C1 | C | Mapa Tracking Realtime | `frontend-architect` |
| C2 | C | Actions Tracking + Integration | `backend-architect` |
| C3 | C | UI Entries + Clients | `frontend-architect` |
| C-val | C | Validação Fase C | `quality-engineer` |
| D1 | D | Planning Score + Greedy | `backend-architect` |
| D2 | D | Dashboard Logística | `frontend-architect` |
| D3 | D | Alertas Dashboard Principal | `frontend-architect` |
| D-val | D | Validação Final | `quality-engineer` |

---

## Dependências entre Tarefas

```
A1 (migration) ──→ A3 (actions vehicles) ──→ A4 (pages vehicles)
              └──→ A5 (actions orders)   ──→ A6 (pages orders)
              └──→ A7 (seed)

A2 (sidebar)  ──→ A4, A6 (precisam das rotas existentes)

A-val ─────────→ B1 (instalar leaflet)

B1 ─────────────→ B2 (planning map usa componentes base)
B3 (routes) ────→ B2 (planning page usa as actions)

B-val ─────────→ C1 (tracking)

A5+A3 ─────────→ C2 (tracking actions usam vehicles/orders)
C2 ─────────────→ C3 (entries page usa integration)

C-val ─────────→ D1 (planning score usa vehicles/orders)
D1 ─────────────→ D2 (dashboard usa planning scores)

D-val = conclusão do módulo
```

---

## Regras de Execução para Subagentes

### Para `backend-architect`:
- SEMPRE seguir o padrão existente: `"use server"` + `createClient()` + `getUser()` + Zod + `revalidatePath()`
- Nunca usar `supabase.auth.admin` (usar RLS implicitamente)
- Testar queries no Supabase SQL Editor antes de colocar nas actions
- Verificar que as RLS policies cobrem todos os casos (org_id check)

### Para `frontend-architect`:
- SEMPRE usar `"use client"` + `use(params)` para páginas com params dinâmicos
- SEMPRE usar `@/i18n/navigation` (não `next/navigation`) para Link e useRouter
- SEMPRE usar `useCurrentPark()` para filtrar dados por parque
- Mapas Leaflet: OBRIGATÓRIO `dynamic(..., { ssr: false })`
- Seguir padrão visual existente: tabelas com `<table className="...">`, badges via `cn()`, forms inline (sem libs de form)

### Para `quality-engineer`:
- Executar `npm run build` COMPLETO (não só `tsc`)
- Verificar consola do browser sem erros JS
- Verificar Network tab sem 500s
- Confirmar que o seed data aparece nas páginas novas

---

## Notas para Demo

**Para os demos, o estado alvo é:**
- Sidebar Logística expandida por defeito (localStorage)
- `/logistica/pedidos`: lista com 20 pedidos, filtros funcionais, badges visíveis
- `/logistica/planeamento`: mapa com pedidos pendentes + rota RTA-2026-00003 visível
- `/logistica/tracking`: viatura PT-45-AB com posição simulada no mapa, rota RTA-2026-00002 em execução
- `/logistica/viaturas`: 3 viaturas com estados distintos
- Dashboard principal: 3 alertas de logística visíveis

**Coordenadas de referência (área Setúbal):**
```
Parque PS:          lat=38.5244, lng=-8.8882 (Setúbal)
Cliente industrial: lat=38.5108, lng=-8.7930 (Palmela)
Cliente 2:          lat=38.4861, lng=-8.9139 (Setúbal Sul)
Cliente 3:          lat=38.5612, lng=-8.7754 (Moita)
```
