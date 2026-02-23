# ESPECIFICAÇÃO TÉCNICA — MÓDULO DE LOGÍSTICA E RECOLHAS

**Bee2Waste — Gestão de Pedidos, Planeamento de Rotas e Tracking de Frotas**

Documento de referência para desenvolvimento do módulo de logística

Versão 1.0 | Fevereiro 2026

Bee2Solutions | Confidencial

---

## 1. Sumário Executivo

### 1.1 Objetivo do Módulo

O módulo de Logística e Recolhas digitaliza e otimiza o ciclo operacional de recolha de resíduos nas instalações dos clientes (fornecedores), desde o pedido de recolha até à chegada do material ao parque. Complementa o módulo de Entradas existente, fechando o ciclo completo: o cliente solicita uma recolha, o operador planeia a rota, o motorista executa a recolha, e o material entra automaticamente no sistema de pesagem e rastreabilidade.

### 1.2 Valor de Negócio

**Para o Operador de Parque:**
- Elimina a gestão de pedidos por telefone, email e papel
- Reduz o tempo de planeamento diário de rotas de 2-3 horas para 15-30 minutos
- Otimiza a ocupação da frota e maximiza as toneladas recolhidas por viatura-dia
- Prioriza automaticamente os pedidos com base em valor de mercado, score do fornecedor e SLA contratual

**Para o Cliente (Fornecedor):**
- Portal ou canal de pedido de recolha sem necessidade de contacto telefónico
- Visibilidade do estado do pedido em tempo real
- Histórico de recolhas e documentos associados

**Para a Gestão:**
- KPIs de utilização de frota em tempo real
- Análise de eficiência de rotas e custos operacionais
- Controlo de SLA contratuais e alertas de incumprimento

### 1.3 Âmbito do Módulo

Este módulo cobre:
1. **Gestão de Pedidos de Recolha** — registo, priorização e ciclo de vida do pedido
2. **Planeamento de Rotas** — atribuição de pedidos a viaturas, sequenciação de paragens
3. **Tracking de Viaturas** — posição GPS em tempo real via Supabase Realtime
4. **Interfaces de Mapa** — visualização georreferenciada de clientes, pedidos e frota
5. **Interface de Planeamento** — vista mapa + lista com drag-and-drop
6. **Planeamento Inteligente** — algoritmo de sugestão automática com múltiplos critérios
7. **PWA para Motoristas** — app móvel para execução e registo de recolhas
8. **Integração com Entradas** — conversão automática de recolha concluída em entrada de parque
9. **Dashboard de Logística** — KPIs de frota, pedidos e eficiência

---

## 2. User Stories

### 2.1 Perspetiva do Operador de Parque (Dispatcher / Planeador)

| ID | Como... | Quero... | Para que... |
|----|---------|----------|-------------|
| OP-01 | Operador | Ver todos os pedidos de recolha pendentes num mapa | Identificar geograficamente onde estão os clientes a aguardar recolha |
| OP-02 | Operador | Filtrar pedidos por prioridade, LER code, zona geográfica e tempo de espera | Focar no que é mais urgente ou rentável |
| OP-03 | Operador | Criar uma rota arrastando pedidos do painel para uma viatura no mapa | Planear rotas visualmente sem necessidade de sistemas externos |
| OP-04 | Operador | Receber sugestões automáticas de rotas otimizadas | Reduzir o tempo de planeamento e aumentar a eficiência |
| OP-05 | Operador | Ver a posição em tempo real de cada viatura no mapa | Monitorizar o progresso da frota durante o dia |
| OP-06 | Operador | Ser alertado quando um pedido está em risco de incumprir o SLA | Reagir proativamente antes do incumprimento contratual |
| OP-07 | Operador | Reagendar ou reatribuir um pedido já planeado | Gerir imprevistos e alterações de última hora |
| OP-08 | Operador | Ver o histórico de recolhas de um cliente num clique | Contextualizar o planeamento com dados históricos |
| OP-09 | Operador | Imprimir ou exportar o plano de rota do dia para cada motorista | Ter um documento de suporte para os motoristas sem smartphone |
| OP-10 | Operador | Registar a conclusão de uma recolha manualmente (fallback) | Cobrir casos em que o motorista não tem acesso à PWA |

### 2.2 Perspetiva do Cliente (Fornecedor)

| ID | Como... | Quero... | Para que... |
|----|---------|----------|-------------|
| CL-01 | Cliente | Submeter um pedido de recolha indicando tipo de resíduo, quantidade estimada e data preferida | Agendar a recolha sem precisar de ligar para o parque |
| CL-02 | Cliente | Receber confirmação e data prevista de recolha | Ter certeza que o pedido foi recebido e planeado |
| CL-03 | Cliente | Ver o estado do meu pedido (pendente, planeado, em rota, concluído) | Planear a minha operação interna em função da recolha |
| CL-04 | Cliente | Receber notificação quando a viatura estiver a caminho | Estar preparado para receber a viatura |
| CL-05 | Cliente | Aceder ao histórico de recolhas e documentos (e-GAR) | Cumprir obrigações de reporte ambiental |
| CL-06 | Cliente | Cancelar ou modificar um pedido antes de este ser planeado | Ter flexibilidade operacional |

### 2.3 Perspetiva do Motorista

| ID | Como... | Quero... | Para que... |
|----|---------|----------|-------------|
| MO-01 | Motorista | Ver a minha rota do dia na app móvel | Saber a ordem das paragens sem receber papel |
| MO-02 | Motorista | Navegar com GPS até à morada do cliente | Chegar sem erros, especialmente em locais industriais não familiares |
| MO-03 | Motorista | Registar a chegada a uma paragem com um toque | Atualizar o sistema em tempo real sem trabalho administrativo |
| MO-04 | Motorista | Fotografar o material antes da recolha | Documentar o estado do resíduo como prova de recolha |
| MO-05 | Motorista | Registar a quantidade recolhida (peso estimado ou volume) | Dar dados ao operador para pré-classificação na entrada |
| MO-06 | Motorista | Assinalar uma paragem como impossível de executar (cliente ausente, material não conforme) | Informar o operador imediatamente para replaneamento |
| MO-07 | Motorista | Obter assinatura digital do responsável do cliente | Ter prova de entrega/recolha legalmente válida |
| MO-08 | Motorista | Ver o estado da minha jornada: paragens concluídas, em curso, pendentes | Gerir o meu tempo durante o dia |

---

## 3. Requisitos Funcionais

### 3.1 Gestão de Pedidos de Recolha

#### 3.1.1 Ciclo de Vida do Pedido

```
rascunho → pendente → planeado → em_rota → no_cliente → concluido
                  ↘ cancelado         ↘ falhado → pendente (reagendado)
```

| Estado | Descrição | Transições possíveis |
|--------|-----------|---------------------|
| `rascunho` | Pedido criado mas não submetido (pelo cliente ou operador) | → pendente, cancelado |
| `pendente` | Aguarda atribuição a uma rota | → planeado, cancelado |
| `planeado` | Atribuído a uma rota e viatura, com data e ordem de paragem definidas | → pendente (retirado da rota), em_rota, cancelado |
| `em_rota` | A viatura partiu e o pedido está na rota ativa | → no_cliente, falhado |
| `no_cliente` | Motorista registou chegada ao local | → concluido, falhado |
| `concluido` | Recolha efetuada, material recolhido | → (cria Entrada no módulo de Entradas) |
| `falhado` | Recolha não efetuada (cliente ausente, material não conforme, etc.) | → pendente (com nota) |
| `cancelado` | Pedido cancelado antes de execução | — |

#### 3.1.2 Criação de Pedidos

Os pedidos podem ser criados por:
- **Operador interno**: formulário no backoffice do parque
- **Cliente via portal web**: interface simplificada de self-service
- **Importação automática**: com base nos ciclos de produção inferidos (`client_production_cycles`)
- **Criação em lote**: o operador seleciona vários clientes e cria pedidos para todos

Campos obrigatórios do pedido:
- Cliente (ligação à tabela `clients`)
- Código LER do resíduo a recolher
- Quantidade estimada (kg ou m³, com indicador de unidade)
- Morada de recolha (pode diferir da morada principal do cliente)
- Data preferida (intervalo: a partir de / até)

Campos opcionais:
- Prioridade (normal / urgente / crítico)
- Instruções especiais (acesso ao local, contacto no local)
- Referência interna do cliente
- Anexos (foto do material, localização alternativa)
- SLA deadline (calculado automaticamente se existir contrato)

#### 3.1.3 Regras de Negócio dos Pedidos

- Um cliente pode ter múltiplos pedidos pendentes simultâneos para diferentes LER codes
- Pedidos com SLA em risco (deadline < 48h) sobem automaticamente para prioridade `crítico`
- A quantidade estimada alimenta o algoritmo de planeamento (compatibilidade com capacidade da viatura)
- Um pedido concluído gera automaticamente um rascunho de Entrada no módulo de Entradas, com todos os campos pré-preenchidos

### 3.2 Gestão da Frota

#### 3.2.1 Viaturas

Cada viatura tem:
- Matrícula, marca, modelo, tipo (caixa aberta, contentor, compactador, etc.)
- Capacidade máxima em kg e em m³
- LER codes autorizados para transporte (licença ADR ou equivalente)
- Operador responsável (park_id)
- Estado operacional: disponível, em_rota, em_manutencao, inativo
- Localização GPS atual (atualizada via Supabase Realtime)

#### 3.2.2 Motoristas

Cada motorista tem:
- Ligação ao `profiles` existente (com acesso de role `driver`)
- Licença de condução (categoria, validade)
- Horas de turno configuradas (início, fim, máximo horas/dia)
- Viatura atribuída por defeito (pode ser alterada por rota)
- Disponibilidade (calendário de turnos, folgas, férias)

#### 3.2.3 Disponibilidade de Frota

- O sistema calcula a capacidade disponível por viatura por dia com base nas rotas já atribuídas
- Alerta quando uma viatura excede a capacidade planeada
- Respeita os limites de horas de turno do motorista (não planear paragens além do fim de turno estimado)

### 3.3 Planeamento de Rotas

#### 3.3.1 Criação Manual de Rotas

O operador pode:
- Criar uma rota para um dia e viatura específicos
- Adicionar pedidos à rota arrastando do painel lateral para o mapa ou para a lista de paragens
- Reordenar as paragens manualmente (drag-and-drop na lista)
- Remover pedidos da rota (voltam ao estado `pendente`)
- Ver em tempo real a distância total, tempo estimado, peso total planeado e % da capacidade da viatura

#### 3.3.2 Sugestão Automática de Rotas (Smart Planning)

O sistema oferece um botão "Otimizar Rota" que executa o algoritmo de planeamento inteligente descrito na Secção 7. O resultado é uma proposta de rota que o operador pode aceitar, modificar ou rejeitar.

#### 3.3.3 Ciclo de Vida da Rota

```
rascunho → confirmada → em_execucao → concluida
                     ↘ cancelada
```

| Estado | Descrição |
|--------|-----------|
| `rascunho` | Em construção pelo operador |
| `confirmada` | Aprovada, comunicada ao motorista |
| `em_execucao` | Motorista partiu, viatura em campo |
| `concluida` | Todas as paragens executadas ou falhadas |
| `cancelada` | Rota cancelada antes da partida |

#### 3.3.4 Paragens de Rota

Cada paragem representa a visita a um pedido de recolha. A paragem tem:
- Ordem de execução na rota
- Estado: pendente, no_cliente, concluida, falhada, ignorada
- Hora estimada de chegada (calculada pela API de routing)
- Hora real de chegada (registada pelo motorista)
- Hora de partida (registada pelo motorista)
- Quantidade real recolhida (kg, registada pelo motorista)
- Notas e fotografias da recolha
- Assinatura digital do responsável no local

### 3.4 Tracking de Viaturas

- A viatura (via app do motorista) envia a sua posição GPS a cada 30 segundos quando em rota
- As posições são armazenadas na tabela `vehicle_positions` (histórico completo)
- A posição atual é armazenada na tabela `vehicles` (campo `current_lat`, `current_lng`, `position_updated_at`)
- O mapa do operador atualiza em tempo real via Supabase Realtime (channel por park_id)
- O operador pode ver o histórico de percurso de qualquer viatura no dia atual

### 3.5 Interfaces de Mapa

#### 3.5.1 Mapa de Pedidos Pendentes

- Marcadores para cada cliente com pedidos pendentes
- Cor do marcador: verde (normal), amarelo (urgente), vermelho (crítico / SLA em risco)
- Tamanho do marcador proporcional à quantidade estimada
- Clique num marcador: painel lateral com detalhes do pedido e ações disponíveis
- Filtros: LER code, prioridade, tempo de espera, zona geográfica (raio ou polígono)

#### 3.5.2 Mapa de Planeamento (Vista Principal)

- Lado esquerdo: lista de pedidos pendentes não atribuídos
- Lado direito: mapa interativo
- Sobre o mapa: linha de rotas do dia (cada rota com cor distinta por viatura)
- Drag-and-drop: arrastar pedido da lista para o mapa ou para uma rota existente
- Linha de rota recalcula em tempo real ao adicionar/remover paragens
- Painel inferior: tabela de rotas do dia com resumo de cada rota

#### 3.5.3 Mapa de Tracking em Tempo Real

- Ícones animados para cada viatura ativa
- Linha de rota planeada (tracejado) vs. percurso real (linha contínua)
- Paragens marcadas: concluídas (verde), em curso (azul), pendentes (cinzento), falhadas (vermelho)
- ETA dinâmico para cada paragem pendente (recalculado com base na posição atual)
- Painel lateral: estado de cada viatura (paragens feitas / total, peso recolhido, ETA fim de rota)

### 3.6 Portal do Cliente

Funcionalidade mínima para a fase MVP do módulo de logística:
- Formulário de pedido de recolha (campos simplificados)
- Lista de pedidos submetidos com estado atual
- Histórico de recolhas concluídas com link para e-GAR

Nota: O portal do cliente pode ser implementado como subdomain separado ou como secção autenticada do backoffice com role `client_portal`.

### 3.7 PWA para Motoristas

Aplicação Progressive Web App instalável no smartphone do motorista:

- **Ecrã inicial**: rota do dia com lista de paragens ordenadas
- **Paragem ativa**: morada, mapa de navegação (link externo para Google Maps / Waze), instruções especiais, botão "Cheguei"
- **Registo de recolha**: quantidade recolhida, fotografias (câmara do dispositivo), notas, assinatura digital, botão "Recolha concluída"
- **Registo de falha**: motivo da falha (cliente ausente, material não conforme, acesso impossível, outro), notas, foto
- **Comunicação**: envio de mensagem de texto ao operador (via interface interna, não SMS)
- **Offline mode**: a PWA guarda dados localmente e sincroniza quando recuperar ligação

### 3.8 Integração com o Módulo de Entradas

Quando uma paragem é marcada como `concluida` pelo motorista:

1. O sistema cria automaticamente um registo de Entrada no estado `vehicle_arrived`
2. Os seguintes campos são pré-preenchidos:
   - `client_id` — do pedido de recolha
   - `entity_name`, `entity_nif`, `entity_contact` — do cliente
   - `ler_code` / `ler_code_id` — do pedido de recolha
   - `declared_weight_kg` — da quantidade registada pelo motorista
   - `transporter_plate` — da viatura
   - `collection_order_id` — FK para o pedido de recolha (nova FK)
   - `collection_route_id` — FK para a rota
3. O operador de parque recebe notificação de que a viatura está a chegar
4. Ao chegar ao parque, o fluxo de pesagem e e-GAR decorre normalmente

---

## 4. Modelo de Dados

### 4.1 Migration 00012 — Logística e Recolhas

```sql
-- ============================================================
-- Bee2Waste — Logistics & Collections Module
-- Migration 00012
-- ============================================================

-- ============================================================
-- NEW ROLE FOR DRIVER
-- ============================================================
-- Add 'driver' to existing user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'driver';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'logistics_manager';

-- ============================================================
-- VEHICLES
-- ============================================================
CREATE TYPE vehicle_status AS ENUM (
  'available',
  'on_route',
  'in_maintenance',
  'inactive'
);

CREATE TYPE vehicle_type AS ENUM (
  'open_body',        -- caixa aberta
  'container',        -- contentor
  'compactor',        -- compactador
  'tank',             -- cisterna
  'flatbed',          -- plataforma
  'other'
);

CREATE TABLE vehicles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES organizations(id),
  park_id               UUID NOT NULL REFERENCES parks(id),
  plate                 TEXT NOT NULL,
  brand                 TEXT,
  model                 TEXT,
  year                  INTEGER,
  vehicle_type          vehicle_type NOT NULL DEFAULT 'open_body',
  capacity_kg           NUMERIC(10, 2),     -- max payload weight
  capacity_m3           NUMERIC(8, 2),      -- max volume
  authorized_ler_codes  TEXT[] NOT NULL DEFAULT '{}',  -- LER codes this vehicle can transport
  status                vehicle_status NOT NULL DEFAULT 'available',
  -- GPS tracking
  current_lat           NUMERIC(10, 7),
  current_lng           NUMERIC(10, 7),
  current_speed_kmh     NUMERIC(5, 1),
  position_updated_at   TIMESTAMPTZ,
  -- Maintenance
  last_inspection_date  DATE,
  next_inspection_date  DATE,
  odometer_km           INTEGER,
  -- Metadata
  notes                 TEXT,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, plate)
);

CREATE INDEX idx_vehicles_park ON vehicles(park_id);
CREATE INDEX idx_vehicles_status ON vehicles(status);

-- ============================================================
-- DRIVERS
-- Extends profiles with driver-specific data
-- ============================================================
CREATE TABLE drivers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  org_id                UUID NOT NULL REFERENCES organizations(id),
  employee_number       TEXT,
  license_number        TEXT,
  license_categories    TEXT[] NOT NULL DEFAULT '{}',  -- e.g. ['C', 'C+E', 'ADR']
  license_expiry        DATE,
  adr_certificate       TEXT,    -- ADR hazmat transport certificate number
  adr_expiry            DATE,
  -- Shift configuration
  shift_start           TIME,    -- e.g. 07:30
  shift_end             TIME,    -- e.g. 17:00
  max_hours_per_day     NUMERIC(4, 1) DEFAULT 8.0,
  -- Default assignment
  default_vehicle_id    UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  -- Status
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id)
);

CREATE INDEX idx_drivers_org ON drivers(org_id);
CREATE INDEX idx_drivers_vehicle ON drivers(default_vehicle_id);

-- ============================================================
-- VEHICLE POSITIONS (GPS history)
-- High-frequency insert table, no updates
-- ============================================================
CREATE TABLE vehicle_positions (
  id          BIGSERIAL PRIMARY KEY,
  vehicle_id  UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  route_id    UUID,  -- FK added after collection_routes table
  lat         NUMERIC(10, 7) NOT NULL,
  lng         NUMERIC(10, 7) NOT NULL,
  speed_kmh   NUMERIC(5, 1),
  heading_deg INTEGER,
  accuracy_m  NUMERIC(6, 1),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vehicle_positions_vehicle ON vehicle_positions(vehicle_id, recorded_at DESC);
-- Partition by day in production for performance (optional)

-- ============================================================
-- COLLECTION ORDERS (Pedidos de Recolha)
-- ============================================================
CREATE TYPE order_status AS ENUM (
  'draft',
  'pending',
  'planned',
  'on_route',
  'at_client',
  'completed',
  'failed',
  'cancelled'
);

CREATE TYPE order_priority AS ENUM (
  'normal',
  'urgent',
  'critical'
);

CREATE TYPE quantity_unit AS ENUM (
  'kg',
  'm3',
  'units'
);

CREATE TABLE collection_orders (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES organizations(id),
  park_id               UUID NOT NULL REFERENCES parks(id),
  order_number          TEXT NOT NULL,      -- auto-generated: REC-YYYY-NNNNNN
  client_id             UUID NOT NULL REFERENCES clients(id),
  -- Waste details
  ler_code_id           UUID NOT NULL REFERENCES ler_codes(id),
  ler_code              TEXT NOT NULL,
  estimated_quantity    NUMERIC(12, 2),
  quantity_unit         quantity_unit NOT NULL DEFAULT 'kg',
  -- Collection location (may differ from client address)
  collection_address    TEXT,
  collection_city       TEXT,
  collection_postal_code TEXT,
  collection_lat        NUMERIC(10, 7),
  collection_lng        NUMERIC(10, 7),
  collection_contact    TEXT,    -- contact person on site
  collection_phone      TEXT,
  -- Scheduling
  preferred_date_from   DATE,
  preferred_date_to     DATE,
  sla_deadline          DATE,    -- computed from contract SLA if exists
  -- Priority & Status
  priority              order_priority NOT NULL DEFAULT 'normal',
  status                order_status NOT NULL DEFAULT 'pending',
  -- Planning scores (computed by planning algorithm, stored for transparency)
  planning_score        NUMERIC(6, 4),  -- composite score used by optimizer
  score_breakdown       JSONB,          -- e.g. {"supplier_score": 0.8, "market_value": 0.6, ...}
  -- Reference
  contract_id           UUID REFERENCES contracts(id) ON DELETE SET NULL,
  client_reference      TEXT,   -- client's internal reference
  special_instructions  TEXT,
  -- Outcome (filled on completion)
  actual_quantity_kg    NUMERIC(12, 2),
  completion_notes      TEXT,
  failure_reason        TEXT,   -- if status = failed
  -- Supabase Storage references
  photo_urls            TEXT[] NOT NULL DEFAULT '{}',
  signature_url         TEXT,
  -- Timestamps
  submitted_at          TIMESTAMPTZ DEFAULT now(),
  planned_at            TIMESTAMPTZ,
  started_at            TIMESTAMPTZ,    -- motorist departed for collection
  arrived_at            TIMESTAMPTZ,    -- motorist arrived at client
  completed_at          TIMESTAMPTZ,
  cancelled_at          TIMESTAMPTZ,
  -- Links to entries module
  entry_id              UUID,   -- FK to entries.id (added after entries table, set on auto-create)
  created_by            UUID REFERENCES profiles(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_collection_orders_park ON collection_orders(park_id);
CREATE INDEX idx_collection_orders_client ON collection_orders(client_id);
CREATE INDEX idx_collection_orders_status ON collection_orders(status);
CREATE INDEX idx_collection_orders_priority ON collection_orders(priority, sla_deadline);
CREATE INDEX idx_collection_orders_date ON collection_orders(preferred_date_from, preferred_date_to);
CREATE INDEX idx_collection_orders_ler ON collection_orders(ler_code_id);

-- Sequence for order_number
CREATE SEQUENCE collection_order_seq START 1;

-- ============================================================
-- COLLECTION ROUTES (Rotas de Recolha)
-- ============================================================
CREATE TYPE route_status AS ENUM (
  'draft',
  'confirmed',
  'on_execution',
  'completed',
  'cancelled'
);

CREATE TABLE collection_routes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES organizations(id),
  park_id               UUID NOT NULL REFERENCES parks(id),
  route_number          TEXT NOT NULL,      -- auto-generated: RTA-YYYY-NNNNNN
  route_date            DATE NOT NULL,
  vehicle_id            UUID NOT NULL REFERENCES vehicles(id),
  driver_id             UUID NOT NULL REFERENCES drivers(id),
  status                route_status NOT NULL DEFAULT 'draft',
  -- Planning summary
  planned_stops_count   INTEGER NOT NULL DEFAULT 0,
  planned_distance_km   NUMERIC(8, 2),
  planned_duration_min  INTEGER,
  planned_weight_kg     NUMERIC(12, 2),
  -- Actuals (filled during/after execution)
  actual_stops_done     INTEGER,
  actual_stops_failed   INTEGER,
  actual_distance_km    NUMERIC(8, 2),
  actual_duration_min   INTEGER,
  actual_weight_kg      NUMERIC(12, 2),
  -- Fuel and cost
  fuel_liters           NUMERIC(8, 2),
  fuel_cost_eur         NUMERIC(10, 2),
  -- Route geometry (GeoJSON LineString of planned route)
  planned_route_geojson JSONB,
  -- Departure and return to park
  departure_lat         NUMERIC(10, 7),   -- park coordinates
  departure_lng         NUMERIC(10, 7),
  departure_time        TIMESTAMPTZ,
  arrival_time          TIMESTAMPTZ,
  -- Notes
  notes                 TEXT,
  -- Planning metadata
  optimized_by          TEXT,    -- 'manual' | 'algorithm' | 'mixed'
  optimization_params   JSONB,   -- criteria weights used
  -- Audit
  created_by            UUID REFERENCES profiles(id),
  confirmed_by          UUID REFERENCES profiles(id),
  confirmed_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_collection_routes_park ON collection_routes(park_id);
CREATE INDEX idx_collection_routes_date ON collection_routes(route_date);
CREATE INDEX idx_collection_routes_vehicle ON collection_routes(vehicle_id);
CREATE INDEX idx_collection_routes_driver ON collection_routes(driver_id);
CREATE INDEX idx_collection_routes_status ON collection_routes(status);

-- Add FK from vehicle_positions to routes
ALTER TABLE vehicle_positions
  ADD CONSTRAINT fk_vehicle_positions_route
  FOREIGN KEY (route_id) REFERENCES collection_routes(id) ON DELETE SET NULL;

-- ============================================================
-- ROUTE STOPS (Paragens de Rota)
-- ============================================================
CREATE TYPE stop_status AS ENUM (
  'pending',
  'at_client',
  'completed',
  'failed',
  'skipped'
);

CREATE TABLE route_stops (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id              UUID NOT NULL REFERENCES collection_routes(id) ON DELETE CASCADE,
  order_id              UUID NOT NULL REFERENCES collection_orders(id),
  stop_sequence         INTEGER NOT NULL,   -- 1-based order within the route
  status                stop_status NOT NULL DEFAULT 'pending',
  -- Estimated vs actual
  estimated_arrival     TIMESTAMPTZ,   -- from routing API
  actual_arrival        TIMESTAMPTZ,   -- from motorist app
  actual_departure      TIMESTAMPTZ,
  -- Time at stop
  service_duration_min  INTEGER,       -- expected minutes at client
  actual_service_min    INTEGER,
  -- Weight
  estimated_kg          NUMERIC(12, 2),
  actual_kg             NUMERIC(12, 2),
  -- Completion details
  completion_notes      TEXT,
  failure_reason        TEXT,
  photo_urls            TEXT[] NOT NULL DEFAULT '{}',
  signature_url         TEXT,
  -- Distance to next stop
  distance_to_next_km   NUMERIC(8, 2),
  -- Audit
  completed_by          UUID REFERENCES profiles(id),   -- driver profile
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(route_id, stop_sequence)
);

CREATE INDEX idx_route_stops_route ON route_stops(route_id);
CREATE INDEX idx_route_stops_order ON route_stops(order_id);
CREATE INDEX idx_route_stops_status ON route_stops(status);

-- ============================================================
-- DRIVER SHIFTS (Turnos de Motorista)
-- For scheduling and availability management
-- ============================================================
CREATE TYPE shift_status AS ENUM (
  'scheduled',
  'active',
  'completed',
  'absent',
  'cancelled'
);

CREATE TABLE driver_shifts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id     UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  vehicle_id    UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  shift_date    DATE NOT NULL,
  planned_start TIME,
  planned_end   TIME,
  actual_start  TIMESTAMPTZ,
  actual_end    TIMESTAMPTZ,
  status        shift_status NOT NULL DEFAULT 'scheduled',
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(driver_id, shift_date)
);

CREATE INDEX idx_driver_shifts_driver ON driver_shifts(driver_id);
CREATE INDEX idx_driver_shifts_date ON driver_shifts(shift_date);
CREATE INDEX idx_driver_shifts_vehicle ON driver_shifts(vehicle_id);

-- ============================================================
-- VEHICLE MAINTENANCE (Manutenção de Viaturas)
-- ============================================================
CREATE TYPE maintenance_type AS ENUM (
  'periodic',       -- inspeção periódica
  'corrective',     -- avaria/reparação
  'preventive',     -- manutenção preventiva
  'regulatory'      -- inspeção obrigatória (IPO/CMR)
);

CREATE TABLE vehicle_maintenance (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id        UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  maintenance_type  maintenance_type NOT NULL DEFAULT 'periodic',
  description       TEXT NOT NULL,
  scheduled_date    DATE,
  completed_date    DATE,
  odometer_km       INTEGER,
  cost_eur          NUMERIC(10, 2),
  supplier          TEXT,
  invoice_ref       TEXT,
  notes             TEXT,
  next_due_date     DATE,
  next_due_km       INTEGER,
  created_by        UUID REFERENCES profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vehicle_maintenance_vehicle ON vehicle_maintenance(vehicle_id);
CREATE INDEX idx_vehicle_maintenance_due ON vehicle_maintenance(next_due_date);

-- ============================================================
-- SLA CONFIGURATIONS (per contract or per park default)
-- ============================================================
CREATE TABLE sla_configs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id),
  park_id           UUID REFERENCES parks(id),     -- null = org-wide default
  contract_id       UUID REFERENCES contracts(id), -- null = park default
  ler_code_id       UUID REFERENCES ler_codes(id), -- null = all LER codes
  max_wait_days     INTEGER NOT NULL DEFAULT 7,    -- max days from order creation to collection
  alert_before_days INTEGER NOT NULL DEFAULT 2,    -- days before deadline to raise alert
  priority_on_alert order_priority NOT NULL DEFAULT 'urgent',
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sla_configs_org ON sla_configs(org_id);
CREATE INDEX idx_sla_configs_contract ON sla_configs(contract_id);

-- ============================================================
-- EXTEND entries WITH LOGISTICS LINKS
-- ============================================================
ALTER TABLE entries
  ADD COLUMN IF NOT EXISTS collection_order_id UUID REFERENCES collection_orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS collection_route_id UUID REFERENCES collection_routes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_entries_collection_order ON entries(collection_order_id);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
CREATE TRIGGER set_updated_at_vehicles
  BEFORE UPDATE ON vehicles FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_drivers
  BEFORE UPDATE ON drivers FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_collection_orders
  BEFORE UPDATE ON collection_orders FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_collection_routes
  BEFORE UPDATE ON collection_routes FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_route_stops
  BEFORE UPDATE ON route_stops FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_driver_shifts
  BEFORE UPDATE ON driver_shifts FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_vehicle_maintenance
  BEFORE UPDATE ON vehicle_maintenance FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_sla_configs
  BEFORE UPDATE ON sla_configs FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view vehicles in their org"
  ON vehicles FOR SELECT USING (org_id = get_user_org_id());
CREATE POLICY "Users can manage vehicles in their org"
  ON vehicles FOR ALL USING (org_id = get_user_org_id());

ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view drivers in their org"
  ON drivers FOR SELECT USING (org_id = get_user_org_id());
CREATE POLICY "Users can manage drivers in their org"
  ON drivers FOR ALL USING (org_id = get_user_org_id());

ALTER TABLE vehicle_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view positions for their org vehicles"
  ON vehicle_positions FOR SELECT USING (
    EXISTS (SELECT 1 FROM vehicles v WHERE v.id = vehicle_positions.vehicle_id AND v.org_id = get_user_org_id())
  );
CREATE POLICY "Drivers can insert their own positions"
  ON vehicle_positions FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM vehicles v WHERE v.id = vehicle_positions.vehicle_id AND v.org_id = get_user_org_id())
  );

ALTER TABLE collection_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view orders in their org"
  ON collection_orders FOR SELECT USING (org_id = get_user_org_id());
CREATE POLICY "Users can manage orders in their org"
  ON collection_orders FOR ALL USING (org_id = get_user_org_id());

ALTER TABLE collection_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view routes in their org"
  ON collection_routes FOR SELECT USING (org_id = get_user_org_id());
CREATE POLICY "Users can manage routes in their org"
  ON collection_routes FOR ALL USING (org_id = get_user_org_id());

ALTER TABLE route_stops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view stops in their org routes"
  ON route_stops FOR SELECT USING (
    EXISTS (SELECT 1 FROM collection_routes r WHERE r.id = route_stops.route_id AND r.org_id = get_user_org_id())
  );
CREATE POLICY "Users can manage stops in their org routes"
  ON route_stops FOR ALL USING (
    EXISTS (SELECT 1 FROM collection_routes r WHERE r.id = route_stops.route_id AND r.org_id = get_user_org_id())
  );

ALTER TABLE driver_shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view shifts in their org"
  ON driver_shifts FOR SELECT USING (
    EXISTS (SELECT 1 FROM drivers d WHERE d.id = driver_shifts.driver_id AND d.org_id = get_user_org_id())
  );
CREATE POLICY "Users can manage shifts in their org"
  ON driver_shifts FOR ALL USING (
    EXISTS (SELECT 1 FROM drivers d WHERE d.id = driver_shifts.driver_id AND d.org_id = get_user_org_id())
  );

ALTER TABLE vehicle_maintenance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view maintenance for their org vehicles"
  ON vehicle_maintenance FOR SELECT USING (
    EXISTS (SELECT 1 FROM vehicles v WHERE v.id = vehicle_maintenance.vehicle_id AND v.org_id = get_user_org_id())
  );
CREATE POLICY "Users can manage maintenance for their org vehicles"
  ON vehicle_maintenance FOR ALL USING (
    EXISTS (SELECT 1 FROM vehicles v WHERE v.id = vehicle_maintenance.vehicle_id AND v.org_id = get_user_org_id())
  );

ALTER TABLE sla_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view SLA configs in their org"
  ON sla_configs FOR SELECT USING (org_id = get_user_org_id());
CREATE POLICY "Users can manage SLA configs in their org"
  ON sla_configs FOR ALL USING (org_id = get_user_org_id());
```

### 4.2 Diagrama de Relações

```
organizations
    └── parks
            ├── vehicles (org_id, park_id)
            │       └── vehicle_positions (vehicle_id, route_id)
            │       └── vehicle_maintenance (vehicle_id)
            ├── drivers (org_id) → profiles
            │       └── driver_shifts (driver_id, vehicle_id)
            ├── collection_orders (park_id, client_id, ler_code_id)
            │       └── [entry_id] → entries
            └── collection_routes (park_id, vehicle_id, driver_id)
                    └── route_stops (route_id, order_id)

contracts → sla_configs (contract_id)
parks → sla_configs (park_id)
```

### 4.3 Notas sobre Performance

- A tabela `vehicle_positions` recebe uma inserção a cada 30 segundos por viatura ativa. Com 10 viaturas em rota durante 9 horas, isso representa ~10.800 linhas por dia. Considerar particionamento por data em produção.
- O campo `current_lat` / `current_lng` na tabela `vehicles` deve ser atualizado atomicamente com cada inserção em `vehicle_positions` via trigger ou upsert na Server Action.
- Índices compostos em `collection_orders(status, priority, sla_deadline)` são críticos para a query de priorização.

---

## 5. Especificações de UI/UX

### 5.1 Estrutura de Navegação

Nova entrada no menu lateral: **Logística** (ícone: `Truck` do Lucide)

Sub-itens:
```
Logística
├── Pedidos de Recolha       /logistica/pedidos
├── Planeamento              /logistica/planeamento
├── Tracking em Tempo Real   /logistica/tracking
├── Viaturas                 /logistica/viaturas
├── Motoristas               /logistica/motoristas
└── Dashboard de Logística   /logistica/dashboard
```

Configurações (dentro de /settings):
```
Definições
└── SLA e Contratos          /settings/sla
```

### 5.2 Página: Pedidos de Recolha (/logistica/pedidos)

**Layout**: Dois modos de vista (toggle no canto superior direito):

**Vista de Lista:**
- Tabela com colunas: Nº Pedido, Cliente, LER, Quantidade, Prioridade, Data Preferida, SLA Deadline, Estado, Ações
- Filtros na barra superior: estado (multi-select), prioridade, LER code, cliente, data
- Ordenação por qualquer coluna
- Badge colorido de prioridade: verde (normal), amarelo (urgente), vermelho (crítico)
- Badge de SLA: dias restantes, vermelho se < 48h
- Ações rápidas na linha: Ver, Editar, Planear, Cancelar

**Vista de Mapa:**
- Mapa full-height com marcadores por localização de recolha
- Painel lateral recolhível com lista de pedidos (igual à vista de lista mas compacta)
- Agrupamento de marcadores próximos (cluster) com contagem
- Filtros funcionam em ambas as vistas

**Formulário de Novo Pedido:**
- Stepper de 3 passos:
  1. Cliente e LER — selecionar cliente (autocomplete), LER code (dropdown filtrado por autorizações do cliente)
  2. Detalhes — quantidade, unidade, morada de recolha (com geocoding automático), contacto no local, instruções especiais
  3. Agendamento — datas preferidas, prioridade, referência interna, verificação do SLA do contrato
- Botão "Criar e Planear" redireciona para o planeamento com o pedido pré-selecionado

**Detalhe do Pedido (/logistica/pedidos/[id]):**
- Cabeçalho: nº pedido, cliente, estado atual com timeline visual
- Tabs: Detalhes, Histórico de Estados, Rota Atribuída, Entrada Gerada
- Ações disponíveis conforme o estado (Planear, Cancelar, Reagendar, Ver Entrada)

### 5.3 Página: Planeamento (/logistica/planeamento)

Esta é a página principal do módulo, desenhada para eficiência máxima do operador.

**Layout Principal (Split View):**
```
┌─────────────────────────────────────────────────────────┐
│  [Data do dia] [Frota disponível: 3 viaturas]  [Otimizar]│
├───────────────────┬─────────────────────────────────────┤
│  PAINEL ESQUERDO  │          MAPA CENTRAL               │
│  Pedidos pendentes│                                     │
│  ───────────────  │   [Mapa com rotas + marcadores]     │
│  🔴 CRÍTICO (2)   │                                     │
│  🟡 URGENTE (5)   │                                     │
│  ⚪ NORMAL (12)   │                                     │
│                   │                                     │
│  [Lista de cards  │                                     │
│   drag-and-drop]  │                                     │
├───────────────────┴─────────────────────────────────────┤
│  PAINEL INFERIOR — ROTAS DO DIA                         │
│  [Viatura 1: XX-XX-XX] 4 paragens | 145 km | 8.2t | 87%│
│  [Viatura 2: YY-YY-YY] 3 paragens | 98 km  | 5.1t | 54%│
│  [+ Nova Rota]                                          │
└─────────────────────────────────────────────────────────┘
```

**Painel de Pedidos (Esquerdo):**
- Card por pedido com: cliente, LER, quantidade, prioridade badge, dias de espera
- Score de planeamento visível (tooltip com breakdown)
- Drag handle para arrastar para o mapa ou para uma rota no painel inferior
- Filtro rápido: todos / crítico / urgente / normal
- Botão "Selecionar tudo crítico" para atribuição em lote

**Mapa Central:**
- Marcadores de pedidos pendentes (coloridos por prioridade)
- Linhas de rota por viatura (cada viatura com cor distinta: azul, verde, laranja, roxo...)
- Numeração das paragens sobre os marcadores
- Arrasto de marcador para linha de rota diferente (reatribuição visual)
- Clique numa linha de rota: destaca no painel inferior
- Layer toggle: mostrar/ocultar pedidos pendentes, rotas, viaturas

**Painel de Rotas (Inferior):**
- Card por rota com: viatura, motorista, nº paragens, distância total, peso total, % capacidade
- Barra de progresso de capacidade (verde < 70%, amarelo 70-90%, vermelho > 90%)
- Expandir card: lista de paragens com drag handle para reordenar
- Botões: Confirmar Rota, Exportar PDF, Remover Rota

**Botão "Otimizar Rota":**
- Abre modal com parâmetros de otimização (pesos dos critérios, ajustáveis)
- Executa o algoritmo e apresenta proposta de rotas
- O operador pode aceitar, modificar e depois confirmar

### 5.4 Página: Tracking em Tempo Real (/logistica/tracking)

**Layout:**
- Mapa full-screen com barra lateral
- Barra lateral: lista de rotas ativas do dia, com estado resumido

**Mapa:**
- Ícone de viatura animado (icon rotaciona com heading do GPS)
- Cor da viatura: azul (em trânsito), verde (no cliente), cinzento (em pausa)
- Linha tracejada: rota planeada
- Linha contínua: percurso real já efetuado
- Marcadores de paragens: verde (concluída), azul (em curso), cinzento (pendente), vermelho (falhada)
- Tooltip ao passar sobre viatura: motorista, paragem atual, ETA próxima paragem, peso recolhido até agora

**Barra Lateral:**
- Para cada rota ativa: viatura, motorista, progresso (N/total paragens), peso recolhido, ETA regresso ao parque
- Click numa rota: mapa centra nessa viatura
- Painel de alertas em tempo real: viatura parada > 30min, paragem falhada, desvio de rota > 5km

### 5.5 Página: Viaturas (/logistica/viaturas)

- Lista de viaturas com estado atual, próxima manutenção, capacidade
- Detalhe por viatura: dados gerais, histórico de rotas, histórico de manutenção, LER autorizados
- Formulário de registo/edição
- Registo de manutenção com alertas automáticos de próxima data

### 5.6 Página: Motoristas (/logistica/motoristas)

- Lista de motoristas com disponibilidade do dia
- Detalhe: dados, licenças (com alertas de expiração), turnos, histórico de rotas
- Formulário de registo/edição
- Calendário de disponibilidade mensal

### 5.7 Dashboard de Logística (/logistica/dashboard)

Ver Secção 10 para KPIs completos.

Layout: tabs idêntico ao dashboard principal, com foco em logística.

### 5.8 Componentes Reutilizáveis

| Componente | Descrição | Localização |
|------------|-----------|-------------|
| `OrderCard` | Card de pedido de recolha com drag handle | `components/logistics/order-card.tsx` |
| `RoutePanel` | Painel de rota com lista de paragens | `components/logistics/route-panel.tsx` |
| `VehicleMarker` | Ícone de viatura animado para o mapa | `components/logistics/vehicle-marker.tsx` |
| `StopMarker` | Marcador de paragem com estado visual | `components/logistics/stop-marker.tsx` |
| `PriorityBadge` | Badge de prioridade colorido | `components/logistics/priority-badge.tsx` |
| `SlaTimer` | Contagem regressiva de SLA | `components/logistics/sla-timer.tsx` |
| `CapacityBar` | Barra de capacidade da viatura | `components/logistics/capacity-bar.tsx` |
| `RouteMap` | Mapa de rota com Leaflet | `components/logistics/route-map.tsx` |
| `TrackingMap` | Mapa de tracking em tempo real | `components/logistics/tracking-map.tsx` |

---

## 6. Implementação do Mapa

### 6.1 Tecnologia Recomendada: Leaflet + OpenStreetMap

**Razão da escolha:**
- OpenStreetMap é gratuito e sem limites de tiles para volumes normais de uso
- Leaflet é leve (42KB), open-source, com excelente suporte React via `react-leaflet`
- Sem dependência de API key para tiles básicos (importante para ambientes sem acesso externo)
- Para routing e geocoding, APIs externas com planos gratuitos generosos

**Alternativa (Mapbox):**
- Melhor qualidade visual e customização de estilo
- Custo: gratuito até 50.000 loads/mês, depois $0.50 por 1.000 loads
- Recomendado apenas se a organização tiver orçamento para mapas ou requisito de offline maps

**Decisão: Leaflet + OSM para o MVP, com Mapbox como upgrade opcional.**

### 6.2 Pacotes npm

```json
{
  "leaflet": "^1.9.4",
  "react-leaflet": "^4.2.1",
  "@types/leaflet": "^1.9.8",
  "leaflet.markercluster": "^1.5.3",
  "@react-leaflet/core": "^2.1.0"
}
```

### 6.3 Geocoding (Morada → Coordenadas)

**Serviço primário: Nominatim (OpenStreetMap)**
- Endpoint: `https://nominatim.openstreetmap.org/search`
- Gratuito, sem API key
- Rate limit: 1 request/segundo — aceitável para geocoding de moradas de clientes (operação pouco frequente)
- Uso aceitável policy: identificar o User-Agent da aplicação

**Serviço de fallback: Geoapify**
- 3.000 geocoding requests/dia gratuitos
- API key necessária
- Qualidade superior para Portugal (dados AML e divisões administrativas)

**Implementação:**
- Geocoding é executado no momento de criação/edição do pedido de recolha
- Coordenadas guardadas em `collection_orders.collection_lat` / `collection_lng`
- Se o geocoding falhar, o operador insere coordenadas manualmente (campo lat/lng no formulário)
- Geocoding de novas moradas de clientes também deve atualizar `clients.lat` / `clients.lng` (adicionar colunas à tabela `clients`)

### 6.4 Routing API (Cálculo de Distâncias e Rotas)

**Serviço recomendado: OSRM (Open Source Routing Machine)**
- Gratuito, open-source
- Demo server: `https://router.project-osrm.org` — não usar em produção (rate limits)
- **Opção preferida para produção**: instância self-hosted OSRM na mesma infraestrutura Vercel/VPS, ou usar Geoapify Routing API (gratuito até 3.000 requests/dia)

**Alternativa: OpenRouteService**
- 2.000 requests/dia gratuitos
- Suporta routing para veículos pesados (perfis HGV)
- Relevante para viaturas de resíduos com restrições de tonelagem

**Alternativa Premium: HERE Routing ou Google Maps Routes API**
- Melhor qualidade de traffic data em tempo real
- Custo: ~$5-10/1.000 requests
- Recomendado se o SLA de ETA for crítico para o negócio

**Para o MVP: OpenRouteService (gratuito, suporte HGV, sem hosting).**

**Uso do Routing API:**
- Ao confirmar uma rota: calcular sequência de waypoints → obter ETA por paragem, distância total, duração total
- Resultado guardado em `collection_routes.planned_route_geojson` (geometria) e em cada `route_stops.estimated_arrival`
- Recálculo automático quando o operador reordena paragens

### 6.5 Rendering do Mapa no Next.js 15

O Leaflet não suporta SSR. Implementação obrigatória com dynamic import:

```typescript
// components/logistics/route-map.tsx
'use client'
import dynamic from 'next/dynamic'

const MapContainer = dynamic(
  () => import('./map-inner').then(m => m.MapInner),
  { ssr: false, loading: () => <div className="h-full bg-muted animate-pulse" /> }
)
```

---

## 7. Algoritmo de Planeamento Inteligente

### 7.1 Abordagem

O problema de otimização de rotas de recolha é uma variante do Vehicle Routing Problem (VRP) com múltiplas restrições. Para o contexto de uma plataforma de gestão de parques com dezenas de pedidos e poucas viaturas (tipicamente 2-10), não é necessário um solver matemático complexo. Uma heurística de construção com melhorias locais é suficiente e produz resultados muito bons.

**Abordagem escolhida**: Greedy Construction Heuristic + 2-opt Local Search

### 7.2 Score de Priorização de Pedidos

Antes de construir as rotas, cada pedido recebe um **Planning Score** composto. Este score determina a ordem em que os pedidos são considerados para atribuição às rotas.

**Fórmula do Planning Score (0.0 — 1.0):**

```
planning_score = (
  w1 × supplier_score_normalized     +  // Qualidade do fornecedor
  w2 × market_value_normalized        +  // Valor de mercado do LER code
  w3 × wait_time_normalized           +  // Dias à espera (mais velho = maior prioridade)
  w4 × sla_urgency_score              +  // Proximidade do deadline SLA
  w5 × quantity_normalized            +  // Quantidade (maior = mais eficiente ir buscar)
  w6 × priority_score                 +  // Prioridade manual (normal/urgente/crítico)
  w7 × ler_compatibility_score           // Compatibilidade com a viatura disponível
)
```

**Pesos padrão (configuráveis pelo operador):**

| Critério | Peso padrão | Descrição |
|----------|------------|-----------|
| `w1` supplier_score | 0.20 | Score LQI do fornecedor (de `supplier_scores`), normalizado 0-1 |
| `w2` market_value | 0.20 | Preço de mercado do LER code (de `market_prices`), normalizado relativamente ao máximo dos pedidos pendentes |
| `w3` wait_time | 0.20 | `(dias_de_espera / max_espera_configurado)`, capped a 1.0 |
| `w4` sla_urgency | 0.20 | `1.0` se SLA < 24h, `0.8` se < 48h, `0.5` se < 5 dias, `0.0` se sem SLA |
| `w5` quantity | 0.10 | Quantidade estimada normalizada relativamente ao máximo dos pedidos pendentes |
| `w6` priority | 0.08 | `crítico=1.0`, `urgente=0.6`, `normal=0.2` |
| `w7` ler_compat | 0.02 | `1.0` se o LER está autorizado na viatura, `0.0` se não |

O operador pode ajustar os pesos via modal de otimização. O `score_breakdown` é guardado em `collection_orders.score_breakdown` para transparência.

### 7.3 Algoritmo de Construção da Rota

**Input:**
- Lista de pedidos pendentes ordenada por `planning_score` DESC
- Lista de viaturas disponíveis com capacidade e LER autorizados
- Morada do parque (ponto de partida e chegada)
- Turno de cada motorista (janela temporal)

**Algoritmo (por viatura, repetido até esgotar pedidos ou viaturas):**

```
1. Para cada viatura disponível:
   a. Inicializar rota: parque → [] → parque
   b. Capacidade restante = vehicle.capacity_kg
   c. Tempo restante = duração do turno do motorista

2. Para cada pedido não atribuído (por ordem de planning_score):
   a. Verificar se o LER code é autorizado nesta viatura
   b. Verificar se a quantidade estimada cabe na capacidade restante
   c. Encontrar a melhor posição de inserção na rota (cheapest insertion):
      - Calcular custo de inserção em cada posição: distância_extra = d(prev, novo) + d(novo, next) - d(prev, next)
      - Escolher a posição com menor custo de inserção
   d. Verificar se a inserção não ultrapassa o tempo de turno (com margem de retorno ao parque)
   e. Se viável: inserir pedido na posição ótima, atualizar capacidade e tempo restantes

3. Aplicar melhoria local 2-opt:
   - Para cada par de arestas na rota: testar se inverter o segmento intermédio reduz a distância total
   - Repetir até não haver melhorias (ou máx. 100 iterações)

4. Calcular ETA de cada paragem via Routing API
5. Apresentar proposta ao operador
```

**Critério de clustering geográfico:**
- Antes da construção, agrupar pedidos por zona geográfica (grid de ~10km²) para favorecer rotas localmente coerentes
- Pedidos no mesmo cluster têm bonus de `zone_bonus = 0.05` no custo de inserção

### 7.4 Restrições Hard (nunca podem ser violadas)

- Capacidade da viatura (kg e m³ — verificar ambas)
- LER code autorizado na viatura (licença de transporte)
- Horas de turno do motorista (não planear além do `shift_end`)
- SLA crítico: pedidos com `sla_urgency = 1.0` são forçados para o top das rotas

### 7.5 Restrições Soft (podem ser relaxadas com aviso)

- Capacidade da viatura pode ser planeada até 95% (margem de segurança)
- Desvio máximo de rota por paragem adicional: < 25% da distância direta
- Máximo de paragens por rota: configurável (padrão: 8 paragens/viatura/dia)

### 7.6 Implementação

O algoritmo é implementado como **Server Action** em TypeScript (não necessita backend externo). O cálculo de distâncias entre pontos usa:
- **Fase de construção**: fórmula de Haversine (distância euclidiana esférica) — rápida, sem chamadas externas
- **Fase final (ETA)**: chamada à Routing API uma única vez com todos os waypoints da rota definitiva

**Estimativa de performance**: para 20 pedidos e 5 viaturas, o algoritmo completo (construção + 2-opt + chamada à Routing API) deve concluir em < 3 segundos.

---

## 8. Arquitetura de Tempo Real

### 8.1 Supabase Realtime para Tracking GPS

**Canal por parque:**
```typescript
const channel = supabase
  .channel(`vehicle-tracking-${parkId}`)
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'vehicles',
      filter: `park_id=eq.${parkId}`
    },
    (payload) => {
      updateVehiclePosition(payload.new)
    }
  )
  .subscribe()
```

**Fluxo de atualização de posição:**
1. PWA do motorista obtém posição GPS a cada 30 segundos via `navigator.geolocation.watchPosition`
2. Chama Server Action `updateVehiclePosition(vehicleId, lat, lng, speed, heading)`
3. Server Action executa duas escritas atómicas:
   - `INSERT INTO vehicle_positions (...)` — histórico
   - `UPDATE vehicles SET current_lat = ..., current_lng = ..., position_updated_at = now() WHERE id = ...`
4. O UPDATE na tabela `vehicles` dispara o evento Realtime para todos os clientes subscritos ao canal do parque
5. O mapa de tracking atualiza o marcador da viatura sem reload da página

**Considerações de latência:**
- Supabase Realtime tem latência típica de 100-500ms
- Para visualização de posição de viaturas, esta latência é aceitável
- A app do motorista deve debounce as atualizações para não exceder 1 insert/segundo

### 8.2 Realtime para Estado de Paragens

Além das posições, os estados das paragens também devem ser subscritos em tempo real:

```typescript
const stopsChannel = supabase
  .channel(`route-stops-${routeId}`)
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'route_stops',
      filter: `route_id=eq.${routeId}`
    },
    (payload) => {
      updateStopStatus(payload.new)
    }
  )
  .subscribe()
```

### 8.3 Realtime para Novos Pedidos

O operador de planeamento deve ser notificado quando novos pedidos de recolha chegam:

```typescript
const ordersChannel = supabase
  .channel(`new-orders-${parkId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'collection_orders',
      filter: `park_id=eq.${parkId}`
    },
    (payload) => {
      addOrderToPanel(payload.new)
      showToast(`Novo pedido de recolha: ${payload.new.order_number}`)
    }
  )
  .subscribe()
```

### 8.4 PWA do Motorista — Offline Mode

A PWA deve funcionar sem ligação à internet (frequente em zonas industriais):

**Estratégia de cache (Service Worker):**
- Cache da rota do dia: ao iniciar a rota, download completo dos dados das paragens para cache local
- Operações offline: chegada, partida, quantidade recolhida e fotografias são guardadas no IndexedDB
- Sincronização: quando a ligação é recuperada, os dados são enviados ao servidor em ordem cronológica
- Indicador visual: a app mostra claramente "Modo Offline — dados serão sincronizados quando recuperar ligação"

**Tecnologia**: Next.js PWA com `next-pwa` ou `serwist`; fotos comprimidas antes do upload para Supabase Storage.

---

## 9. Pontos de Integração com Módulos Existentes

### 9.1 Integração com Entradas

**Trigger**: `route_stops.status` atualizado para `completed`

**Server Action `createEntryFromStop(stopId)`:**

```typescript
async function createEntryFromStop(stopId: string) {
  // 1. Fetch stop + order + client data
  const stop = await getStopWithDetails(stopId)

  // 2. Create entry in 'vehicle_arrived' status
  const entry = await supabase
    .from('entries')
    .insert({
      org_id: stop.order.org_id,
      park_id: stop.order.park_id,
      status: 'vehicle_arrived',
      client_id: stop.order.client_id,
      entity_name: stop.order.client.name,
      entity_nif: stop.order.client.nif,
      entity_contact: stop.order.client.contact_person,
      ler_code: stop.order.ler_code,
      ler_code_id: stop.order.ler_code_id,
      declared_weight_kg: stop.actual_kg || stop.estimated_kg,
      transporter_plate: stop.route.vehicle.plate,
      collection_order_id: stop.order_id,
      collection_route_id: stop.route_id,
      notes: `Recolha automática de ${stop.order.order_number}`
    })
    .select()
    .single()

  // 3. Update collection_order with entry_id
  await supabase
    .from('collection_orders')
    .update({ entry_id: entry.id, status: 'completed' })
    .eq('id', stop.order_id)

  // 4. Notify park operator
  // (via Supabase Realtime ou push notification)

  return entry
}
```

**Vista na ficha de Entrada**: mostrar secção "Origem — Pedido de Recolha" com link para o pedido, dados da rota e fotos tiradas pelo motorista.

### 9.2 Integração com Clientes

- A ficha do cliente (`/clients/[id]`) deve ter nova tab "Pedidos de Recolha" mostrando o histórico de pedidos e recolhas
- O ciclo de produção inferido (`client_production_cycles`) deve sugerir criação automática de pedidos quando a data prevista se aproxima (alerta no dashboard de logística)
- O score do fornecedor (`supplier_scores`) é usado no Planning Score como `w1`

### 9.3 Integração com o Dashboard Principal

- O dashboard principal (6 tabs existentes) deve adicionar alertas no painel de alertas para:
  - Pedidos em risco de SLA (deadline < 48h)
  - Viaturas em manutenção com rotas planeadas
  - Motoristas sem turno definido com rotas atribuídas

### 9.4 Integração com Lotes (Lots)

- Quando uma Entrada gerada por recolha é confirmada e armazenada, o fluxo normal de atribuição a lote executa automaticamente (`autoAssignLot` já implementado)
- Na ficha do lote, mostrar a origem (pedido de recolha) na timeline de rastreabilidade
- Permitir filtrar lotes por origem: "recolha agendada" vs. "entrega direta do fornecedor"

### 9.5 Integração com Market Prices

- O `w2` market_value no Planning Score lê diretamente de `market_prices` (preço mais recente por LER code)
- No dashboard de logística, mostrar "valor estimado a recolher hoje" = soma (quantidade_estimada_por_LER × cotação_LER)

---

## 10. Dashboard de Logística — KPIs

### 10.1 KPIs de Pedidos

| KPI | Fórmula | Período |
|-----|---------|---------|
| Pedidos Pendentes | `COUNT(*) WHERE status = 'pending'` | Snapshot atual |
| Toneladas a Planear | `SUM(estimated_quantity_kg) / 1000 WHERE status = 'pending'` | Snapshot atual |
| Toneladas Planeadas | `SUM(estimated_quantity_kg) / 1000 WHERE status = 'planned'` | Dia atual |
| Toneladas em Recolha | `SUM(actual_kg) / 1000 WHERE status IN ('on_route', 'at_client')` | Dia atual |
| Toneladas Recolhidas | `SUM(actual_kg) / 1000 WHERE status = 'completed'` | Período selecionado |
| Taxa de Conclusão | `COUNT(completed) / COUNT(completed + failed) × 100` | Período selecionado |
| Taxa de Falha | `COUNT(failed) / COUNT(*) × 100` | Período selecionado |
| Pedidos em Risco SLA | `COUNT(*) WHERE status IN ('pending','planned') AND sla_deadline < now() + interval '48h'` | Snapshot atual |
| Tempo Médio de Espera | `AVG(EXTRACT(days FROM completed_at - submitted_at)) WHERE status = 'completed'` | Período selecionado |
| Tempo Máximo de Espera | `MAX(CURRENT_DATE - submitted_at::date) WHERE status = 'pending'` | Snapshot atual |

### 10.2 KPIs de Frota

| KPI | Fórmula | Período |
|-----|---------|---------|
| Viaturas Disponíveis | `COUNT(*) WHERE status = 'available'` | Snapshot atual |
| Viaturas em Rota | `COUNT(*) WHERE status = 'on_route'` | Snapshot atual |
| Viaturas em Manutenção | `COUNT(*) WHERE status = 'in_maintenance'` | Snapshot atual |
| Utilização de Frota (%) | `SUM(actual_weight_kg) / SUM(vehicles.capacity_kg × routes_today) × 100` | Dia atual |
| Capacidade Planeada Total (t) | `SUM(planned_weight_kg) / 1000` WHERE routes são do dia atual | Dia atual |
| Km Totais Percorridos | `SUM(actual_distance_km)` WHERE routes do período | Período selecionado |
| Km por Tonelada | `SUM(actual_distance_km) / (SUM(actual_weight_kg) / 1000)` | Período selecionado |
| Custo por Tonelada (combustível) | `SUM(fuel_cost_eur) / (SUM(actual_weight_kg) / 1000)` | Período selecionado |
| Paragens por Viatura/Dia | `AVG(actual_stops_done) por viatura por dia` | Período selecionado |
| Taxa de Pontualidade | `COUNT(stops WHERE actual_arrival <= estimated_arrival + 15min) / COUNT(stops) × 100` | Período selecionado |

### 10.3 KPIs de Motoristas

| KPI | Fórmula | Período |
|-----|---------|---------|
| Horas Trabalhadas / Turno | `AVG(EXTRACT(hours FROM actual_end - actual_start))` | Período selecionado |
| Paragens por Motorista | `AVG(actual_stops_done) por motorista` | Período selecionado |
| Taxa de Cumprimento de Rota | `completed_stops / planned_stops × 100` por motorista | Período selecionado |

### 10.4 KPIs de Valor

| KPI | Fórmula | Período |
|-----|---------|---------|
| Valor Estimado a Recolher (€) | `SUM(estimated_quantity_kg / 1000 × market_price_per_ton por LER)` WHERE status = 'pending' | Snapshot atual |
| Valor Recolhido no Período (€) | `SUM(actual_kg / 1000 × market_price_per_ton por LER)` WHERE status = 'completed' | Período selecionado |
| Receita por Km (€/km) | `Valor_Recolhido / Km_Totais` | Período selecionado |

### 10.5 Layout do Dashboard de Logística

**Tab 1 — Vista Geral:**
- 5 KPI cards: Pedidos Pendentes, Toneladas a Planear, Toneladas Recolhidas (hoje), Viaturas em Rota, Pedidos em Risco SLA
- Mini-mapa com estado atual da frota
- Painel de alertas logísticos

**Tab 2 — Pedidos e SLA:**
- Gráfico de barras: pedidos por estado (pendente/planeado/em_rota/concluído/falhado)
- Gráfico de barras: distribuição do tempo de espera dos pedidos pendentes (0-2 dias, 3-5, 6-7, >7)
- Lista de pedidos em risco SLA com ação direta de planeamento
- Mapa de calor: clientes por volume de pedidos (municípios)

**Tab 3 — Frota:**
- Card por viatura: utilização, km, paragens, estado
- Gráfico de linha: km percorridos por viatura por semana
- Gráfico de barras: % utilização de capacidade por viatura por dia
- Tabela: viaturas com manutenção prevista nos próximos 30 dias

**Tab 4 — Motoristas:**
- Tabela ranking: motoristas por toneladas recolhidas, taxa de conclusão, pontualidade
- Calendário de disponibilidade: visão mensal de turnos e disponibilidade

**Tab 5 — Eficiência:**
- Km por tonelada (evolução mensal)
- Custo por tonelada (evolução mensal)
- Paragens por viatura-dia (evolução mensal)
- Valor recolhido vs. valor planeado (gap analysis)

---

## 11. Recomendações Adicionais

### 11.1 Prova Digital de Recolha (Proof of Collection)

**Valor**: cria evidência legal da recolha sem papel, reduz disputas com clientes.

**Implementação:**
- O motorista recolhe assinatura digital do responsável no local via ecrã táctil (API de canvas na PWA)
- Assinatura + timestamp + localização GPS + fotos são agregados num PDF gerado server-side
- PDF guardado no Supabase Storage, URL associado ao `route_stops.signature_url` + `collection_orders`
- Cliente recebe link por email para download do comprovativo

### 11.2 Rastreamento de Emissões CO2 (Carbon Tracking)

**Valor**: cresce em importância regulatória (CSRD, relatórios de sustentabilidade).

**Implementação:**
- Fator de emissão por tipo de veículo (toneladas CO2/km) configurável em settings
- Cálculo: `CO2_kg = actual_distance_km × emission_factor_kg_per_km`
- Mostrado no dashboard como KPI: "CO2 Emitido (t)" e "CO2 por Tonelada de Resíduo"
- Relatório anual de emissões exportável em PDF

### 11.3 Alertas de Manutenção de Viaturas

**Valor**: previne avarias em campo que comprometem rotas planeadas.

**Implementação:**
- A tabela `vehicle_maintenance` tem `next_due_date` e `next_due_km`
- Job diário (Supabase Edge Function via pg_cron) verifica:
  - Viaturas com manutenção em < 14 dias → alerta `warning`
  - Viaturas com manutenção em < 3 dias → alerta `critical`
  - Viaturas com manutenção vencida → alerta `overdue` + bloquear atribuição a rotas
- Alertas aparecem no dashboard de logística e no dashboard principal

### 11.4 Notificações ao Cliente (Email/SMS)

**Valor**: melhora a experiência do cliente e reduz chamadas de acompanhamento.

**Eventos a notificar:**
- Pedido recebido e confirmado
- Pedido atribuído a rota (com data e janela horária estimada)
- Viatura a 30 minutos do local
- Recolha concluída (com link para comprovativo)
- Pedido falhado (com motivo e data alternativa)

**Implementação:**
- Supabase Database Webhooks → função serverless (Next.js API Route) → Resend (email)
- Para SMS: Twilio ou VONAGE (custo adicional, recomendado apenas para clientes VIP ou SLA crítico)

### 11.5 Importação de Pedidos via API (Integração ERP Cliente)

**Valor**: clientes com ERP (SAP, PHC, Primavera) podem criar pedidos automaticamente.

**Implementação:**
- Endpoint REST público: `POST /api/v1/collection-orders`
- Autenticação: API key por cliente (tabela `client_api_keys`)
- Webhook de retorno: o cliente fornece URL para notificações de estado
- Documentação OpenAPI gerada automaticamente

### 11.6 Geofencing para Chegada/Partida Automática

**Valor**: elimina necessidade do motorista registar manualmente chegada/partida.

**Implementação:**
- Cada paragem tem raio de geofence configurável (padrão: 100m)
- A PWA monitoriza continuamente a distância ao próximo ponto de paragem
- Quando o motorista entra no raio: notificação "Chegou ao destino?" com botão de confirmação rápida
- Quando o motorista sai do raio com status `at_client`: registar hora de partida automaticamente
- Usa a Geolocation API do browser (não requer hardware adicional)

### 11.7 Calendário de Recolhas (Scheduling Calendar)

**Valor**: visão semanal/mensal do planeamento, útil para confirmação de capacidade.

**Implementação:**
- Vista de calendário mensal: cada dia mostra o nº de rotas planeadas e a capacidade total
- Drag-and-drop de pedidos entre dias (reagendamento visual)
- Integração com disponibilidade de motoristas (turnos e férias)
- Export iCal para integração com calendários externos (Google Calendar, Outlook)

---

## 12. Fases de Implementação

### Fase A — Fundação (Sprint 1-2, ~4 semanas)

**Objetivo**: Infraestrutura de dados e gestão básica de pedidos

**Deliverables:**
- Migration `00012_logistics.sql` completa (todos os schemas definidos na Secção 4)
- CRUD de Viaturas (`/logistica/viaturas`)
- CRUD de Motoristas (`/logistica/motoristas`)
- Criação e listagem de Pedidos de Recolha (`/logistica/pedidos`)
- Gestão de estados básica dos pedidos (pending → cancelled, etc.)
- Tipos TypeScript gerados da nova migração
- Server Actions: `createCollectionOrder`, `updateOrderStatus`, `createVehicle`, `createDriver`
- RLS policies validadas

**Fora do âmbito desta fase**: mapas, routing, tracking, PWA

---

### Fase B — Planeamento Manual (Sprint 3-4, ~4 semanas)

**Objetivo**: Interface de planeamento com mapa e atribuição manual de rotas

**Deliverables:**
- Instalação e configuração de `react-leaflet`
- Mapa de pedidos pendentes com marcadores (`/logistica/pedidos` vista mapa)
- Página de planeamento com split view mapa + lista (`/logistica/planeamento`)
- Criação manual de rotas com drag-and-drop de pedidos
- Reordenação de paragens via drag-and-drop na lista
- Cálculo de totais (distância Haversine, peso, % capacidade) em tempo real
- Chamada à Routing API (OpenRouteService) para ETA das paragens
- Confirmação de rota e atualização de estados dos pedidos
- Server Actions: `createRoute`, `addStopToRoute`, `reorderStops`, `confirmRoute`, `removeStopFromRoute`

---

### Fase C — Tracking e PWA do Motorista (Sprint 5-6, ~4 semanas)

**Objetivo**: Execução de rotas em campo com app móvel e tracking em tempo real

**Deliverables:**
- PWA do motorista: lista de rotas, navegação por paragem, registo de chegada/partida
- Upload de fotografias da recolha para Supabase Storage
- Assinatura digital (canvas) na PWA
- Registo de quantidade recolhida e notas
- Marcação de paragem como falhada com motivo
- Envio de posição GPS a cada 30 segundos (Supabase upsert)
- Página de tracking em tempo real (`/logistica/tracking`) com Supabase Realtime
- Integração automática com módulo de Entradas (criação de rascunho de entrada ao concluir paragem)
- Offline mode da PWA com sincronização ao recuperar ligação
- Server Actions: `updateVehiclePosition`, `recordStopArrival`, `completeStop`, `failStop`, `createEntryFromStop`

---

### Fase D — Planeamento Inteligente e Dashboard (Sprint 7-8, ~4 semanas)

**Objetivo**: Otimização automática de rotas e dashboards de logística

**Deliverables:**
- Cálculo do Planning Score para cada pedido
- Algoritmo de sugestão automática de rotas (Greedy + 2-opt)
- Modal de parâmetros de otimização (pesos ajustáveis)
- Dashboard de logística com 5 tabs (`/logistica/dashboard`)
- KPIs em tempo real (Secção 10)
- Alertas de SLA no dashboard principal
- Alertas de manutenção de viaturas
- Exportação do plano de rota em PDF

---

### Fase E — Portal do Cliente e Integrações Avançadas (Sprint 9-10, ~4 semanas)

**Objetivo**: Self-service do cliente e integrações complementares

**Deliverables:**
- Portal web do cliente para submissão de pedidos
- Notificações por email (pedido confirmado, viatura a caminho, recolha concluída)
- Proof of Collection PDF automático
- Geofencing para chegada/partida automática
- Rastreamento de CO2
- Alertas de ciclo de produção → sugestão automática de pedido
- Calendário de recolhas mensal
- API REST para integração com ERP do cliente (opcional)

---

## 13. Adições à Stack Técnica

### 13.1 Pacotes npm Novos

```json
{
  "dependencies": {
    "leaflet": "^1.9.4",
    "react-leaflet": "^4.2.1",
    "@types/leaflet": "^1.9.8",
    "leaflet.markercluster": "^1.5.3",
    "@dnd-kit/core": "^6.2.0",
    "@dnd-kit/sortable": "^8.0.0",
    "@dnd-kit/utilities": "^3.2.2",
    "jspdf": "^2.5.2",
    "jspdf-autotable": "^3.8.3",
    "signature_pad": "^4.2.0",
    "serwist": "^9.0.11",
    "next-pwa": "^5.6.0",
    "idb": "^8.0.0",
    "haversine-distance": "^1.2.1"
  }
}
```

**Justificação:**

| Pacote | Uso |
|--------|-----|
| `leaflet` + `react-leaflet` | Renderização de mapas interativos |
| `leaflet.markercluster` | Agrupamento de marcadores próximos no mapa |
| `@dnd-kit/*` | Drag-and-drop acessível para planeamento de rotas (alternativa moderna ao react-beautiful-dnd) |
| `jspdf` + `jspdf-autotable` | Geração de PDF do plano de rota e proof of collection |
| `signature_pad` | Assinatura digital do cliente na PWA do motorista |
| `serwist` | Service Worker moderno para offline mode da PWA (substitui workbox diretamente) |
| `idb` | IndexedDB tipado para armazenamento offline na PWA |
| `haversine-distance` | Cálculo rápido de distância esférica para o algoritmo de planeamento |

### 13.2 Variáveis de Ambiente Novas

```bash
# Routing API (escolher uma)
OPENROUTESERVICE_API_KEY=ors_...
# ou
GEOAPIFY_API_KEY=geoapify_...

# Geocoding (fallback ao Nominatim gratuito)
GEOAPIFY_API_KEY=geoapify_...  # reutilizar se já definida

# Email (notificações ao cliente)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@bee2solutions.pt

# SMS (opcional, fase E)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+351...
```

### 13.3 Novas Rotas da Aplicação

```
/[locale]/(app)/logistica/
├── pedidos/
│   ├── page.tsx              — Lista + mapa de pedidos
│   ├── novo/
│   │   └── page.tsx          — Formulário de novo pedido (stepper)
│   └── [id]/
│       └── page.tsx          — Detalhe do pedido
├── planeamento/
│   └── page.tsx              — Interface de planeamento (split view)
├── tracking/
│   └── page.tsx              — Mapa de tracking em tempo real
├── viaturas/
│   ├── page.tsx              — Lista de viaturas
│   ├── nova/
│   │   └── page.tsx
│   └── [id]/
│       └── page.tsx
├── motoristas/
│   ├── page.tsx              — Lista de motoristas
│   ├── novo/
│   │   └── page.tsx
│   └── [id]/
│       └── page.tsx
└── dashboard/
    └── page.tsx              — Dashboard de logística (5 tabs)

/[locale]/(app)/settings/
└── sla/
    └── page.tsx              — Configuração de SLAs

/[locale]/(driver)/           — Layout separado para PWA do motorista
├── rota/
│   ├── page.tsx              — Rota do dia
│   └── [routeId]/
│       ├── page.tsx          — Detalhe da rota
│       └── paragem/
│           └── [stopId]/
│               └── page.tsx  — Execução da paragem
```

### 13.4 Novas Server Actions

```
src/actions/logistics/
├── orders.ts         — createOrder, updateOrderStatus, bulkCreateOrders
├── routes.ts         — createRoute, confirmRoute, cancelRoute, exportRoutePdf
├── stops.ts          — addStop, removeStop, reorderStops, completeStop, failStop
├── vehicles.ts       — createVehicle, updateVehicle, logMaintenance
├── drivers.ts        — createDriver, updateDriver, setShift
├── tracking.ts       — updateVehiclePosition, startRoute, endRoute
├── planning.ts       — calculatePlanningScores, suggestRoutes, optimizeRoute
└── integration.ts    — createEntryFromStop, syncOrderToEntry
```

---

## 14. Glossário

| Termo (PT) | Termo (EN código) | Descrição |
|------------ |-------------------|-----------|
| Pedido de Recolha | `collection_order` | Solicitação de recolha de resíduos nas instalações do cliente |
| Rota de Recolha | `collection_route` | Conjunto de paragens atribuídas a uma viatura num dia |
| Paragem | `route_stop` | Visita a um pedido de recolha específico |
| Viatura | `vehicle` | Veículo de transporte de resíduos |
| Motorista | `driver` | Condutor da viatura |
| Turno | `driver_shift` | Período de trabalho do motorista |
| Dispatcher | operador de logística | Quem planeia e monitoriza as rotas |
| Prova de Recolha | proof of collection | Documento digital confirmando a recolha |
| SLA | Service Level Agreement | Prazo contratual máximo para execução de recolha |
| Planning Score | score de planeamento | Pontuação composta para priorizar pedidos |
| Geofencing | geofencing | Detecção de entrada/saída de área geográfica |
| ETA | Estimated Time of Arrival | Hora estimada de chegada |

---

*Fim do documento de especificação*

*Próximo passo recomendado: revisão com o gestor de produto e validação dos critérios de priorização (pesos do Planning Score) com os utilizadores operacionais antes de iniciar a Fase A.*
