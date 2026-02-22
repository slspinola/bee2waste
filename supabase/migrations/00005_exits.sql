-- ============================================================
-- Bee2Waste MVP — Exits Module Migration
-- Delivery Requests, Delivery Lines, Exits
-- ============================================================

-- ============================================================
-- DELIVERY REQUESTS
-- ============================================================
CREATE TYPE exit_type AS ENUM (
  'treatment',
  'client',
  'group'
);

CREATE TYPE delivery_status AS ENUM (
  'draft',
  'planned',
  'loading',
  'loaded',
  'in_transit',
  'delivered',
  'confirmed',
  'cancelled'
);

CREATE TABLE delivery_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  park_id UUID NOT NULL REFERENCES parks(id),
  request_number TEXT NOT NULL,
  exit_type exit_type NOT NULL,
  status delivery_status NOT NULL DEFAULT 'draft',

  -- Destination
  destination_name TEXT,
  destination_nif TEXT,
  destination_address TEXT,
  destination_park_id UUID REFERENCES parks(id),

  -- Transport
  transporter_name TEXT,
  transporter_nif TEXT,
  vehicle_plate TEXT,
  driver_name TEXT,

  -- Planning
  planned_date DATE,
  actual_date DATE,

  -- e-GAR
  egar_id UUID REFERENCES egar_records(id),
  egar_number TEXT,

  -- Financial
  total_weight_kg NUMERIC DEFAULT 0,
  total_value NUMERIC(12, 2) DEFAULT 0,
  currency TEXT DEFAULT 'EUR',

  -- Metadata
  operator_id UUID REFERENCES profiles(id),
  confirmed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_delivery_requests_park ON delivery_requests(park_id);
CREATE INDEX idx_delivery_requests_status ON delivery_requests(status);
CREATE INDEX idx_delivery_requests_type ON delivery_requests(exit_type);

-- ============================================================
-- DELIVERY LINES
-- ============================================================
CREATE TABLE delivery_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES delivery_requests(id) ON DELETE CASCADE,
  ler_code_id UUID REFERENCES ler_codes(id),
  ler_code TEXT NOT NULL,
  source_area_id UUID REFERENCES storage_areas(id),
  planned_weight_kg NUMERIC NOT NULL,
  actual_weight_kg NUMERIC,
  weighing_id UUID REFERENCES weighing_records(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_delivery_lines_request ON delivery_lines(request_id);

-- ============================================================
-- EXITS (Finalized)
-- ============================================================
CREATE TABLE exits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  park_id UUID NOT NULL REFERENCES parks(id),
  exit_number TEXT NOT NULL,
  request_id UUID REFERENCES delivery_requests(id),

  -- e-GAR
  egar_id UUID REFERENCES egar_records(id),
  egar_number TEXT,

  -- Weighing
  gross_weight_kg NUMERIC,
  tare_weight_kg NUMERIC,
  net_weight_kg NUMERIC,
  gross_weighing_id UUID REFERENCES weighing_records(id),
  tare_weighing_id UUID REFERENCES weighing_records(id),

  -- Guide
  guide_number TEXT,
  guide_date DATE,

  -- Status
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_exits_park ON exits(park_id);
CREATE INDEX idx_exits_request ON exits(request_id);

-- Add FK from weighing_records to exits
ALTER TABLE weighing_records
  ADD CONSTRAINT fk_weighing_exit FOREIGN KEY (exit_id) REFERENCES exits(id);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
CREATE TRIGGER set_updated_at_delivery_requests
  BEFORE UPDATE ON delivery_requests FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_exits
  BEFORE UPDATE ON exits FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE delivery_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view delivery requests in their org"
  ON delivery_requests FOR SELECT USING (org_id = get_user_org_id());
CREATE POLICY "Users can manage delivery requests in their org"
  ON delivery_requests FOR ALL USING (org_id = get_user_org_id());

ALTER TABLE delivery_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view delivery lines in their org"
  ON delivery_lines FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM delivery_requests dr
    WHERE dr.id = delivery_lines.request_id AND dr.org_id = get_user_org_id()
  ));
CREATE POLICY "Users can manage delivery lines in their org"
  ON delivery_lines FOR ALL
  USING (EXISTS (
    SELECT 1 FROM delivery_requests dr
    WHERE dr.id = delivery_lines.request_id AND dr.org_id = get_user_org_id()
  ));

ALTER TABLE exits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view exits in their org"
  ON exits FOR SELECT USING (org_id = get_user_org_id());
CREATE POLICY "Users can manage exits in their org"
  ON exits FOR ALL USING (org_id = get_user_org_id());
