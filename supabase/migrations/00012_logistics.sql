-- ============================================================
-- Bee2Waste MVP — Logistics & Collection Orders Migration
-- Vehicles, Drivers, Collection Orders, Routes, Route Stops,
-- Vehicle Positions, Driver Shifts, Vehicle Maintenance
-- ============================================================

-- ============================================================
-- ENUMS
-- NOTE: ALTER TYPE ADD VALUE cannot run inside a transaction.
-- These statements are intentionally top-level.
-- ============================================================
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'driver';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'logistics_manager';

CREATE TYPE vehicle_status AS ENUM ('available', 'on_route', 'in_maintenance', 'inactive');
CREATE TYPE vehicle_type AS ENUM ('open_body', 'container', 'compactor', 'tank', 'flatbed', 'other');
CREATE TYPE order_status AS ENUM ('draft', 'pending', 'planned', 'on_route', 'at_client', 'completed', 'failed', 'cancelled');
CREATE TYPE order_priority AS ENUM ('normal', 'urgent', 'critical');
CREATE TYPE route_status AS ENUM ('draft', 'confirmed', 'on_execution', 'completed', 'cancelled');
CREATE TYPE stop_status AS ENUM ('pending', 'at_client', 'completed', 'failed', 'skipped');
CREATE TYPE shift_status AS ENUM ('scheduled', 'active', 'completed', 'absent', 'cancelled');
CREATE TYPE maintenance_type AS ENUM ('scheduled', 'corrective', 'inspection');

-- ============================================================
-- VIATURAS (Vehicles)
-- ============================================================
CREATE TABLE viaturas (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES organizations(id),
  park_id               UUID NOT NULL REFERENCES parks(id),
  matricula             TEXT NOT NULL,
  marca                 TEXT,
  modelo                TEXT,
  tipo                  vehicle_type NOT NULL DEFAULT 'open_body',
  capacidade_kg         NUMERIC NOT NULL DEFAULT 0,
  capacidade_m3         NUMERIC,
  ler_autorizados       TEXT[],
  status                vehicle_status NOT NULL DEFAULT 'available',
  current_lat           NUMERIC(10,7),
  current_lng           NUMERIC(10,7),
  position_updated_at   TIMESTAMPTZ,
  notas                 TEXT,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_viaturas_org_id  ON viaturas(org_id);
CREATE INDEX idx_viaturas_park_id ON viaturas(park_id);
CREATE INDEX idx_viaturas_status  ON viaturas(status);

CREATE TRIGGER set_updated_at_viaturas
  BEFORE UPDATE ON viaturas FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

ALTER TABLE viaturas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view viaturas in their org"
  ON viaturas FOR SELECT
  USING (org_id = get_user_org_id());
CREATE POLICY "Users can manage viaturas in their org"
  ON viaturas FOR ALL
  USING (org_id = get_user_org_id());

-- ============================================================
-- MOTORISTAS (Drivers)
-- ============================================================
CREATE TABLE motoristas (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES organizations(id),
  park_id               UUID NOT NULL REFERENCES parks(id),
  profile_id            UUID REFERENCES profiles(id) ON DELETE SET NULL,
  nome                  TEXT NOT NULL,
  telefone              TEXT,
  email                 TEXT,
  numero_licenca        TEXT,
  categorias_licenca    TEXT[],
  licenca_validade      DATE,
  adr_certificado       BOOLEAN NOT NULL DEFAULT false,
  viatura_default_id    UUID REFERENCES viaturas(id) ON DELETE SET NULL,
  turno_inicio          TIME,
  turno_fim             TIME,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_motoristas_org_id     ON motoristas(org_id);
CREATE INDEX idx_motoristas_park_id    ON motoristas(park_id);
CREATE INDEX idx_motoristas_profile_id ON motoristas(profile_id);

CREATE TRIGGER set_updated_at_motoristas
  BEFORE UPDATE ON motoristas FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

ALTER TABLE motoristas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view motoristas in their org"
  ON motoristas FOR SELECT
  USING (org_id = get_user_org_id());
CREATE POLICY "Users can manage motoristas in their org"
  ON motoristas FOR ALL
  USING (org_id = get_user_org_id());

-- ============================================================
-- PEDIDOS_RECOLHA (Collection Orders)
-- ============================================================
CREATE TABLE pedidos_recolha (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                    UUID NOT NULL REFERENCES organizations(id),
  park_id                   UUID NOT NULL REFERENCES parks(id),
  numero_pedido             TEXT NOT NULL,

  -- Client
  client_id                 UUID REFERENCES clients(id) ON DELETE SET NULL,
  submitted_by_client_id    UUID REFERENCES clients(id) ON DELETE SET NULL,

  -- Waste
  ler_code_id               UUID REFERENCES ler_codes(id),
  ler_code                  TEXT,
  quantidade_estimada_kg    NUMERIC,
  descricao_residuo         TEXT,

  -- Collection address
  morada_recolha            TEXT,
  cidade_recolha            TEXT,
  codigo_postal_recolha     TEXT,
  contacto_local            TEXT,
  instrucoes_especiais      TEXT,
  collection_lat            NUMERIC(10,7),
  collection_lng            NUMERIC(10,7),

  -- Status & priority
  status                    order_status NOT NULL DEFAULT 'pending',
  prioridade                order_priority NOT NULL DEFAULT 'normal',

  -- Scheduling
  data_pedido               TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_preferida_inicio     DATE,
  data_preferida_fim        DATE,
  data_agendada             DATE,
  sla_deadline              TIMESTAMPTZ,

  -- Planning
  planning_score            NUMERIC(5,2),
  score_breakdown           JSONB,
  contract_ref              TEXT,

  -- Completion
  entry_id                  UUID REFERENCES entries(id) ON DELETE SET NULL,
  quantidade_real_kg        NUMERIC,
  completed_at              TIMESTAMPTZ,
  failure_reason            TEXT,
  cancelled_at              TIMESTAMPTZ,
  cancellation_reason       TEXT,

  -- Metadata
  created_by                UUID REFERENCES profiles(id),
  approved_by               UUID REFERENCES profiles(id),
  approved_at               TIMESTAMPTZ,
  notas                     TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pedidos_recolha_org_id        ON pedidos_recolha(org_id);
CREATE INDEX idx_pedidos_recolha_park_id       ON pedidos_recolha(park_id);
CREATE INDEX idx_pedidos_recolha_status        ON pedidos_recolha(status);
CREATE INDEX idx_pedidos_recolha_client_id     ON pedidos_recolha(client_id);
CREATE INDEX idx_pedidos_recolha_data_agendada ON pedidos_recolha(data_agendada);

CREATE TRIGGER set_updated_at_pedidos_recolha
  BEFORE UPDATE ON pedidos_recolha FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

ALTER TABLE pedidos_recolha ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view pedidos_recolha in their org"
  ON pedidos_recolha FOR SELECT
  USING (org_id = get_user_org_id());
CREATE POLICY "Users can manage pedidos_recolha in their org"
  ON pedidos_recolha FOR ALL
  USING (org_id = get_user_org_id());

-- ============================================================
-- ROTAS (Collection Routes)
-- ============================================================
CREATE TABLE rotas (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                    UUID NOT NULL REFERENCES organizations(id),
  park_id                   UUID NOT NULL REFERENCES parks(id),
  numero_rota               TEXT NOT NULL,
  data_rota                 DATE NOT NULL,
  viatura_id                UUID REFERENCES viaturas(id) ON DELETE SET NULL,
  motorista_id              UUID REFERENCES motoristas(id) ON DELETE SET NULL,
  status                    route_status NOT NULL DEFAULT 'draft',

  -- Planning
  num_paragens              INTEGER NOT NULL DEFAULT 0,
  peso_total_planeado_kg    NUMERIC,
  distancia_total_km        NUMERIC,
  rota_geojson              JSONB,

  -- Execution
  hora_partida              TIMESTAMPTZ,
  hora_chegada              TIMESTAMPTZ,
  peso_total_real_kg        NUMERIC,

  -- Metadata
  created_by                UUID REFERENCES profiles(id),
  confirmed_by              UUID REFERENCES profiles(id),
  confirmed_at              TIMESTAMPTZ,
  notas                     TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rotas_org_id      ON rotas(org_id);
CREATE INDEX idx_rotas_park_id     ON rotas(park_id);
CREATE INDEX idx_rotas_viatura_id  ON rotas(viatura_id);
CREATE INDEX idx_rotas_motorista_id ON rotas(motorista_id);
CREATE INDEX idx_rotas_data_rota   ON rotas(data_rota);
CREATE INDEX idx_rotas_status      ON rotas(status);

CREATE TRIGGER set_updated_at_rotas
  BEFORE UPDATE ON rotas FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

ALTER TABLE rotas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view rotas in their org"
  ON rotas FOR SELECT
  USING (org_id = get_user_org_id());
CREATE POLICY "Users can manage rotas in their org"
  ON rotas FOR ALL
  USING (org_id = get_user_org_id());

-- ============================================================
-- ROTA_PARAGENS (Route Stops)
-- ============================================================
CREATE TABLE rota_paragens (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rota_id                   UUID NOT NULL REFERENCES rotas(id) ON DELETE CASCADE,
  pedido_id                 UUID NOT NULL REFERENCES pedidos_recolha(id) ON DELETE CASCADE,
  ordem                     INTEGER NOT NULL,
  status                    stop_status NOT NULL DEFAULT 'pending',

  -- Timing
  hora_chegada_estimada     TIMESTAMPTZ,
  hora_chegada_real         TIMESTAMPTZ,
  hora_saida_real           TIMESTAMPTZ,

  -- Collection
  quantidade_real_kg        NUMERIC,
  fotos                     TEXT[],
  assinatura_url            TEXT,
  notas                     TEXT,
  failure_reason            TEXT,

  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(rota_id, pedido_id)
);

CREATE INDEX idx_rota_paragens_rota_id   ON rota_paragens(rota_id);
CREATE INDEX idx_rota_paragens_pedido_id ON rota_paragens(pedido_id);

CREATE TRIGGER set_updated_at_rota_paragens
  BEFORE UPDATE ON rota_paragens FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

ALTER TABLE rota_paragens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view rota_paragens in their org"
  ON rota_paragens FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rotas r
      WHERE r.id = rota_paragens.rota_id
        AND r.org_id = get_user_org_id()
    )
  );
CREATE POLICY "Users can manage rota_paragens in their org"
  ON rota_paragens FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM rotas r
      WHERE r.id = rota_paragens.rota_id
        AND r.org_id = get_user_org_id()
    )
  );

-- ============================================================
-- POSICOES_VIATURAS (Vehicle Positions — insert-only log)
-- Uses BIGSERIAL for high-volume append performance
-- ============================================================
CREATE TABLE posicoes_viaturas (
  id              BIGSERIAL PRIMARY KEY,
  viatura_id      UUID NOT NULL REFERENCES viaturas(id) ON DELETE CASCADE,
  rota_id         UUID REFERENCES rotas(id) ON DELETE SET NULL,
  lat             NUMERIC(10,7) NOT NULL,
  lng             NUMERIC(10,7) NOT NULL,
  velocidade_kmh  NUMERIC,
  heading_deg     NUMERIC,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_posicoes_viaturas_viatura_id  ON posicoes_viaturas(viatura_id);
CREATE INDEX idx_posicoes_viaturas_recorded_at ON posicoes_viaturas(recorded_at);

ALTER TABLE posicoes_viaturas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view posicoes_viaturas in their org"
  ON posicoes_viaturas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM viaturas v
      WHERE v.id = posicoes_viaturas.viatura_id
        AND v.org_id = get_user_org_id()
    )
  );
CREATE POLICY "Users can manage posicoes_viaturas in their org"
  ON posicoes_viaturas FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM viaturas v
      WHERE v.id = posicoes_viaturas.viatura_id
        AND v.org_id = get_user_org_id()
    )
  );

-- ============================================================
-- TURNOS_MOTORISTAS (Driver Shifts)
-- ============================================================
CREATE TABLE turnos_motoristas (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  motorista_id          UUID NOT NULL REFERENCES motoristas(id) ON DELETE CASCADE,
  viatura_id            UUID REFERENCES viaturas(id) ON DELETE SET NULL,
  data_turno            DATE NOT NULL,
  hora_inicio_planeada  TIME,
  hora_fim_planeada     TIME,
  hora_inicio_real      TIMESTAMPTZ,
  hora_fim_real         TIMESTAMPTZ,
  status                shift_status NOT NULL DEFAULT 'scheduled',
  notas                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(motorista_id, data_turno)
);

CREATE INDEX idx_turnos_motoristas_motorista_id ON turnos_motoristas(motorista_id);
CREATE INDEX idx_turnos_motoristas_data_turno   ON turnos_motoristas(data_turno);

ALTER TABLE turnos_motoristas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view turnos_motoristas in their org"
  ON turnos_motoristas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM motoristas m
      WHERE m.id = turnos_motoristas.motorista_id
        AND m.org_id = get_user_org_id()
    )
  );
CREATE POLICY "Users can manage turnos_motoristas in their org"
  ON turnos_motoristas FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM motoristas m
      WHERE m.id = turnos_motoristas.motorista_id
        AND m.org_id = get_user_org_id()
    )
  );

-- ============================================================
-- MANUTENCAO_VIATURAS (Vehicle Maintenance)
-- ============================================================
CREATE TABLE manutencao_viaturas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viatura_id      UUID NOT NULL REFERENCES viaturas(id) ON DELETE CASCADE,
  tipo            maintenance_type NOT NULL DEFAULT 'scheduled',
  descricao       TEXT NOT NULL,
  data_agendada   DATE,
  data_realizada  DATE,
  proximo_km      NUMERIC,
  proxima_data    DATE,
  custo           NUMERIC(10,2),
  realizado_por   TEXT,
  notas           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_manutencao_viaturas_viatura_id ON manutencao_viaturas(viatura_id);

ALTER TABLE manutencao_viaturas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view manutencao_viaturas in their org"
  ON manutencao_viaturas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM viaturas v
      WHERE v.id = manutencao_viaturas.viatura_id
        AND v.org_id = get_user_org_id()
    )
  );
CREATE POLICY "Users can manage manutencao_viaturas in their org"
  ON manutencao_viaturas FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM viaturas v
      WHERE v.id = manutencao_viaturas.viatura_id
        AND v.org_id = get_user_org_id()
    )
  );

-- ============================================================
-- ALTER EXISTING TABLES
-- ============================================================

-- Add geocoding fields to clients
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS lat                  NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS lng                  NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS address_geocoded_at  TIMESTAMPTZ;

-- Link entries to logistics
ALTER TABLE entries
  ADD COLUMN IF NOT EXISTS pedido_recolha_id UUID REFERENCES pedidos_recolha(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rota_id           UUID REFERENCES rotas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_entries_pedido_recolha ON entries(pedido_recolha_id);
CREATE INDEX IF NOT EXISTS idx_entries_rota           ON entries(rota_id);

-- ============================================================
-- HELPER FUNCTIONS — Sequential numbering
-- ============================================================

CREATE OR REPLACE FUNCTION generate_numero_pedido(p_park_id UUID)
RETURNS TEXT AS $$
DECLARE
  park_code TEXT;
  seq_num   INTEGER;
  year_str  TEXT;
BEGIN
  SELECT code INTO park_code FROM parks WHERE id = p_park_id;
  year_str := to_char(now(), 'YYYY');

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(numero_pedido FROM '[0-9]+$') AS INTEGER)
  ), 0) + 1
  INTO seq_num
  FROM pedidos_recolha
  WHERE park_id = p_park_id
    AND numero_pedido LIKE park_code || '-R-' || year_str || '-%';

  RETURN park_code || '-R-' || year_str || '-' || LPAD(seq_num::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_numero_rota(p_park_id UUID)
RETURNS TEXT AS $$
DECLARE
  park_code TEXT;
  seq_num   INTEGER;
  year_str  TEXT;
BEGIN
  SELECT code INTO park_code FROM parks WHERE id = p_park_id;
  year_str := to_char(now(), 'YYYY');

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(numero_rota FROM '[0-9]+$') AS INTEGER)
  ), 0) + 1
  INTO seq_num
  FROM rotas
  WHERE park_id = p_park_id
    AND numero_rota LIKE park_code || '-RT-' || year_str || '-%';

  RETURN park_code || '-RT-' || year_str || '-' || LPAD(seq_num::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;
