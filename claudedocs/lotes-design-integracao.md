# Lotes & Qualidade — Design de Integração na Arquitetura Existente

**Projeto:** Bee2Waste
**Documento:** Design Técnico + Plano de Implementação
**Data:** 2026-02-21
**Estado:** Aprovado para análise antes de implementação

---

## 1. Análise da Arquitetura Existente

### Hierarquia Espacial Atual vs. Nova

O modelo atual tem `storage_areas` como unidade atómica de armazenamento. O novo modelo requer dois níveis:

```
ANTES:
  Parque → storage_areas (ex: "Armazém Norte", "Zona A1")
             [flat list, sem hierarquia]

DEPOIS:
  Parque → storage_areas (reutilizados como "Zonas")
              ↑ agrupados por
            area_groups (novo: "Armazém Norte", "Pátio Sul")
              ↓ cada zona tem
            lot_zones → lots (lote ativo por zona)
```

**Decisão de design:** Reutilizar `storage_areas` como zonas (não renomear). Adicionar `area_groups` como agrupamento opcional acima delas. Isto é **totalmente aditivo** — zero breaking changes no código existente.

---

## 2. Novas Tabelas (Migration 00009)

### 2.1 `area_groups` — Agrupamento de Zonas
```sql
CREATE TABLE area_groups (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  park_id      UUID REFERENCES parks(id) NOT NULL,
  name         TEXT NOT NULL,                    -- "Armazém Norte"
  code         TEXT NOT NULL,                    -- "ARM-N"
  description  TEXT,
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(park_id, code)
);
```

### 2.2 Alterações a `storage_areas`
```sql
ALTER TABLE storage_areas ADD COLUMN area_group_id  UUID REFERENCES area_groups(id);
ALTER TABLE storage_areas ADD COLUMN is_blocked      BOOLEAN DEFAULT false;
ALTER TABLE storage_areas ADD COLUMN blocked_reason  TEXT;
ALTER TABLE storage_areas ADD COLUMN blocked_at      TIMESTAMPTZ;
ALTER TABLE storage_areas ADD COLUMN blocked_by      UUID REFERENCES profiles(id);
```

### 2.3 `lots` — Lote (unidade de rastreabilidade)
```sql
CREATE TYPE lot_status AS ENUM ('open', 'in_treatment', 'closed');
CREATE TYPE lqi_letter AS ENUM ('A', 'B', 'C', 'D', 'E');

CREATE TABLE lots (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  UUID REFERENCES organizations(id) NOT NULL,
  park_id                 UUID REFERENCES parks(id) NOT NULL,
  lot_number              TEXT NOT NULL,           -- "L-2025-001"
  name                    TEXT,                    -- "Papel/Cartão Março"
  status                  lot_status DEFAULT 'open',
  allowed_ler_codes       TEXT[] DEFAULT '{}',     -- array de strings LER (ex: ["15 01 01"])
  allowed_ler_code_ids    UUID[] DEFAULT '{}',     -- array de UUIDs

  -- Qualidade (calculados automaticamente)
  raw_grade               NUMERIC(3,2),            -- 1.00–5.00
  transformed_grade       NUMERIC(3,2),            -- 1.00–5.00
  yield_rate              NUMERIC(5,2),            -- % (peso_saída/peso_entrada*100)
  lot_quality_index       NUMERIC(3,2),            -- LQI composto
  lqi_grade               lqi_letter,              -- A|B|C|D|E

  -- Totais (actualizados na associação de entradas)
  total_input_kg          NUMERIC DEFAULT 0,
  total_output_kg         NUMERIC,                 -- preenchido ao fechar
  contamination_rate      NUMERIC(5,2),            -- % média ponderada de contaminação

  -- Ligações
  classification_sheet_id UUID REFERENCES classification_sheets(id),

  -- Ciclo de vida
  opened_at               TIMESTAMPTZ DEFAULT now(),
  treatment_started_at    TIMESTAMPTZ,
  closed_at               TIMESTAMPTZ,
  created_by              UUID REFERENCES profiles(id),
  notes                   TEXT,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now(),

  UNIQUE(park_id, lot_number)
);
```

### 2.4 `lot_zones` — Lote ↔ Zonas (N:N)
```sql
CREATE TABLE lot_zones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id      UUID REFERENCES lots(id) NOT NULL,
  zone_id     UUID REFERENCES storage_areas(id) NOT NULL,
  added_at    TIMESTAMPTZ DEFAULT now(),
  removed_at  TIMESTAMPTZ,           -- NULL = zona ainda activa no lote
  UNIQUE(lot_id, zone_id)
);
```

### 2.5 `lot_entries` — Lote ↔ Entradas (N:N)
```sql
CREATE TABLE lot_entries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id           UUID REFERENCES lots(id) NOT NULL,
  entry_id         UUID REFERENCES entries(id) NOT NULL,
  contribution_kg  NUMERIC NOT NULL,   -- net_weight_kg da entrada
  entry_raw_grade  NUMERIC(3,2),       -- grau desta entrada específica
  added_at         TIMESTAMPTZ DEFAULT now(),
  UNIQUE(lot_id, entry_id)
);
```

### 2.6 `supplier_scores` — Score por Fornecedor por Período
```sql
CREATE TABLE supplier_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES organizations(id) NOT NULL,
  client_id       UUID REFERENCES clients(id) NOT NULL,
  park_id         UUID REFERENCES parks(id),        -- NULL = todos os parques
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  lot_count       INTEGER DEFAULT 0,
  avg_raw_grade   NUMERIC(3,2),
  avg_yield_rate  NUMERIC(5,2),
  avg_lqi         NUMERIC(3,2),
  score_letter    lqi_letter,
  total_kg        NUMERIC DEFAULT 0,
  calculated_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, park_id, period_start, period_end)
);
```

### 2.7 `client_production_cycles` — Ciclo de Produção Inferido
```sql
CREATE TABLE client_production_cycles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id             UUID REFERENCES clients(id) NOT NULL,
  park_id               UUID REFERENCES parks(id) NOT NULL,
  avg_interval_days     NUMERIC(6,1),
  std_dev_days          NUMERIC(6,1),
  last_entry_date       DATE,
  next_predicted_date   DATE,
  entry_count           INTEGER DEFAULT 0,
  confidence            NUMERIC(3,2),   -- 0.0–1.0 (aumenta com mais histórico)
  last_calculated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, park_id)
);
```

---

## 3. Lógica de Negócio — Funções DB

### 3.1 Calcular raw_grade do lote (trigger em lot_entries)
```sql
CREATE OR REPLACE FUNCTION recalculate_lot_raw_grade(p_lot_id UUID)
RETURNS void AS $$
  UPDATE lots SET
    raw_grade = (
      SELECT ROUND(
        SUM(le.entry_raw_grade * le.contribution_kg) / NULLIF(SUM(le.contribution_kg), 0),
        2
      )
      FROM lot_entries le
      WHERE le.lot_id = p_lot_id
    ),
    total_input_kg = (
      SELECT COALESCE(SUM(le.contribution_kg), 0)
      FROM lot_entries le WHERE le.lot_id = p_lot_id
    ),
    updated_at = now()
  WHERE id = p_lot_id;
$$ LANGUAGE sql;
```

### 3.2 Calcular LQI ao fechar lote
```sql
-- yield_rate_normalized = min(yield_rate/100 * 5, 5)
-- lqi = raw_grade*0.30 + yield_rate_normalized*0.40 + transformed_grade*0.30
-- A: >=4.5 | B: >=3.5 | C: >=2.5 | D: >=1.5 | E: <1.5
```

### 3.3 Criação automática de lote
```sql
-- Função chamada no servidor ao alocar entrada a uma zona
-- Se não existe lote aberto compatível na zona → cria automaticamente
-- Se lote existente está cheio e há zona livre → cria novo lote e associa zona
```

---

## 4. Integração nos Módulos Existentes

### 4.1 Wizard de Entradas — Passo 6 (Alocação de Armazenamento)

**Antes:** selecionar área de armazém
**Depois:** selecionar zona → ver lote ativo → confirmar ou criar novo lote

```
Passo 6: Alocação
┌─────────────────────────────────────────────────────────────────┐
│ Zona de Destino                                                  │
│ [Zona A1 — Armazém Norte ▼]                                     │
│                                                                  │
│ Lote Activo na Zona                                              │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ 🗂 L-2025-008 — Papel/Cartão Março                         │  │
│ │ LER: 15 01 01, 15 01 02 · 12.4t / 20t · Raw Grade: 4.2   │  │
│ │ [✓ Associar a este lote]  [+ Criar novo lote]             │  │
│ └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Folha de Classificação — Ligação ao Lote

- Ao criar folha de classificação, selecionar lote de origem
- Ao fechar folha → lote transita para `in_treatment`
- Ao completar folha → registar `transformed_grade` + `total_output_kg` → lote fecha

### 4.3 Saídas — Rastreabilidade

- `delivery_lines` já tem `source_area_id` (zona)
- Via zona → `lot_zones` → `lots` → rastreabilidade completa

### 4.4 Stocks — Vista por Lote

- Página de stocks existente: adicionar toggle "ver por área" / "ver por lote"
- Vista por lote: LQI, zonas ocupadas, entradas, estado

### 4.5 Clientes — Separador Fornecedor

- `/clients/[id]` já tem tabs; adicionar tab "Qualidade"
- Mostrar: score histórico, LQI médio, yield médio, próxima entrega prevista

---

## 5. Novas Rotas

```
/lots                    — lista de lotes (filtros: estado, parque, zona)
/lots/new                — criar lote manualmente
/lots/[id]               — detalhe do lote (entradas, zonas, qualidade)
/lots/[id]/close         — fechar lote + registar transformed_grade
/settings/zones          — gestão de zonas e grupos de áreas
```

**Sidebar:** Adicionar "Lotes" entre "Classificação" e "Saídas"

---

## 6. Novas Server Actions

**`src/actions/lots.ts`**
- `createLot(formData)` — criação manual
- `autoAssignLot(entryId, zoneId)` — lógica automática
- `addEntryToLot(lotId, entryId, grade)` — associar entrada
- `startTreatment(lotId)` — transição open → in_treatment + bloquear zonas
- `closeLot(formData)` — registar qualidade final + calcular LQI + libertar zonas
- `releaseZone(zoneId, reason?)` — libertação manual de zona

**`src/actions/settings.ts`** (extensão)
- `createAreaGroup(formData)`
- `updateAreaGroup(id, formData)`
- `deleteAreaGroup(id)`
- `assignZoneToGroup(zoneId, groupId)`

---

## 7. Novos Hooks

**`src/hooks/use-lot-suggestions.ts`**
- Dado um `zoneId` e `lerCode`, retorna lotes abertos compatíveis
- Indica se lote está cheio e se há zona alternativa disponível

---

## 8. Diagrama de Dependências (Implementação)

```
[00009_lots_quality.sql]
         ↓
[src/actions/lots.ts]     [src/actions/settings.ts + area_groups]
         ↓                           ↓
[/settings/zones]         [/lots] [/lots/new] [/lots/[id]]
         ↓                           ↓
[entries/new — Passo 6]   [classification/sheets — Ligação Lote]
         ↓                           ↓
[/clients/[id] — Tab Qualidade]   [/stock — Vista por Lote]
         ↓
[Dashboard — Alertas Ciclo + Qualidade]
```

---

## 9. Plano de Implementação Detalhado

### FASE A — Fundação (Prerequisito)

**A1. Migration `00009_lots_quality.sql`**
- Criar tipos ENUM: `lot_status`, `lqi_letter`
- Criar tabelas: `area_groups`, `lots`, `lot_zones`, `lot_entries`, `supplier_scores`, `client_production_cycles`
- Alterar `storage_areas`: adicionar `area_group_id`, `is_blocked`, `blocked_*`
- Criar funções: `recalculate_lot_raw_grade()`, `calculate_lot_lqi()`, `auto_create_lot()`
- Criar trigger: `lot_entries_after_insert` → chama `recalculate_lot_raw_grade()`
- RLS: todas as novas tabelas filtradas por `org_id`
- Regenerar `src/types/database.ts`

**A2. Server Actions — Grupos de Áreas**
- `createAreaGroup`, `updateAreaGroup`, `deleteAreaGroup`, `assignZoneToGroup`
- Ficheiro: extensão de `src/actions/settings.ts`

**A3. Settings — Gestão de Zonas**
- Rota: `/settings/zones`
- UI: lista de grupos de áreas + zonas dentro de cada grupo (drag-and-drop ou select)
- Adicionar item "Zonas" ao sidebar de settings

**A4. Server Actions — Lotes**
- Ficheiro: `src/actions/lots.ts`
- Todas as 6 acções descritas na secção 6

**Estimativa:** ~3 sessões de trabalho

---

### FASE B — Integração com Entradas

**B1. Hook `use-lot-suggestions.ts`**
- Dado `zoneId` + `lerCode[]`, query lotes abertos compatíveis
- Retorna: lotesDisponíveis[], zonaCheia (bool), zonaAlternativa (storage_area | null)

**B2. Wizard de Entradas — Passo 6 Actualizado**
- Mostrar lote ativo da zona selecionada
- Opção: associar a lote existente / criar novo lote
- Se zona bloqueada: mostrar aviso + sugerir zona alternativa

**B3. Auto-associação de Entrada ao Lote**
- Ao confirmar entrada (status = "confirmed"): criar registo em `lot_entries`
- Calcular `entry_raw_grade` a partir do resultado da inspeção:
  - `approved` + sem divergências → grau 5
  - `approved` + divergências minor → grau 4
  - `approved_with_divergence` major → grau 3
  - `approved_with_divergence` critical → grau 2
  - `rejected` → grau 1

**Estimativa:** ~2 sessões de trabalho

---

### FASE C — Qualidade e Encerramento de Lotes

**C1. Páginas de Lotes**
- `/lots` — lista com filtros (status, parque, zona, LQI)
- `/lots/new` — formulário: nome, LER codes, zonas
- `/lots/[id]` — detalhe: entradas, zonas, raw_grade, estado, timeline

**C2. Encerramento do Lote**
- `/lots/[id]` → botão "Iniciar Tratamento" → status = `in_treatment` + bloqueio de zonas
- `/lots/[id]` → botão "Fechar Lote" → formulário: `transformed_grade` + `total_output_kg`
- Ao fechar: calcular `yield_rate`, `lot_quality_index`, `lqi_grade` → status = `closed`
- Libertar zonas automaticamente

**C3. Ligação Folha de Classificação ↔ Lote**
- Na folha de classificação: campo "Lote" (select de lotes abertos)
- Ao completar folha → propor fechar lote associado

**Estimativa:** ~3 sessões de trabalho

---

### FASE D — Inteligência de Fornecedores

**D1. Cálculo de Score de Fornecedor**
- Server action: `recalculateSupplierScore(clientId, parkId, period)`
- Executado: ao fechar lote (automático) + manualmente pelo gestor
- Período por defeito: últimos 90 dias

**D2. Inferência do Ciclo de Produção**
- Server action: `recalculateProductionCycle(clientId, parkId)`
- Algoritmo: calcular média + desvio padrão dos intervalos entre entradas
- Guardar em `client_production_cycles`
- Executado: a cada nova entrada confirmada do cliente

**D3. Tab "Qualidade" em `/clients/[id]`**
- Score atual (1-5 + letra)
- Gráfico de evolução de LQI (últimos 6 meses)
- Tabela de lotes históricos onde o cliente participou
- Ciclo de produção: média, próxima previsão, confiança

**D4. Ranking de Fornecedores**
- Componente no dashboard: top fornecedores por score
- Página `/clients` com coluna "Score" e ordenação

**Estimativa:** ~3 sessões de trabalho

---

### FASE E — Alertas e Rastreabilidade

**E1. Alertas Proativos (Dashboard)**
- "Fornecedor próximo do ciclo": `next_predicted_date <= hoje + 3 dias`
- "Zona bloqueada há X dias": `blocked_at < hoje - N dias`
- "Lote próximo da capacidade": `total_input_kg / capacidade_zona > 80%`
- "Qualidade abaixo do esperado": `raw_grade < threshold configurado`

**E2. Rastreabilidade Inversa**
- Em `/exits/[id]`: mostrar lote de origem (via `delivery_lines.source_area_id` → `lot_zones` → `lot`)
- Em `/lots/[id]`: mostrar entradas com link para fornecedor
- Em `/clients/[id]` → tab Qualidade: link para cada lote

**Estimativa:** ~2 sessões de trabalho

---

## 10. Resumo das Fases

| Fase | Conteúdo | Impacto | Ficheiros Novos | Ficheiros Alterados |
|---|---|---|---|---|
| A | DB + Settings Zonas + Actions Lotes | Infra | migration, actions/lots.ts, settings/zones | settings.ts, sidebar |
| B | Integração Entradas | Operacional | hooks/use-lot-suggestions.ts | entries/new/page.tsx |
| C | Páginas Lotes + Encerramento | Operacional | lots/*, classification/sheets/[id] | classification code |
| D | Score Fornecedores + Ciclos | Analítico | — | clients/[id], dashboard |
| E | Alertas + Rastreabilidade | Analítico | — | dashboard, exits/[id] |

**Ordem de prioridade:** A → B → C → D → E
**Fases A+B+C** são o núcleo operacional (necessárias para usar lotes no dia-a-dia).
**Fases D+E** são a camada analítica (necessárias para scoring e rastreabilidade completa).

---

## 11. Pontos de Atenção

1. **Sem breaking changes**: toda a implementação é aditiva. `storage_areas` continua a funcionar como antes nas páginas existentes.
2. **Migration sequencial**: `00009` depende das tabelas `00001`–`00007` (já existentes).
3. **RLS**: todas as novas tabelas precisam de políticas RLS com `org_id`.
4. **Tipos TypeScript**: regenerar `database.ts` após cada migration.
5. **Lote automático**: a lógica de criação automática deve ter fallback gracioso — se não conseguir criar, o operador cria manualmente.
6. **Compatibilidade com seed data**: o seed existente não tem lotes — OK, são criados a partir daqui.
