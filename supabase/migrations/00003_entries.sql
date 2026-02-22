-- ============================================================
-- Bee2Waste MVP — Entries Module Migration
-- e-GAR Records, Weighing Records, Entries, Inspection Divergences
-- ============================================================

-- ============================================================
-- E-GAR RECORDS (Electronic Waste Tracking Guides)
-- ============================================================
CREATE TYPE egar_status AS ENUM (
  'pending',
  'validated',
  'confirmed',
  'rejected',
  'cancelled'
);

CREATE TYPE egar_type AS ENUM (
  'reception',
  'expedition'
);

CREATE TABLE egar_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  park_id UUID NOT NULL REFERENCES parks(id),
  egar_number TEXT NOT NULL,
  egar_type egar_type NOT NULL DEFAULT 'reception',
  status egar_status NOT NULL DEFAULT 'pending',
  origin_name TEXT,
  origin_nif TEXT,
  origin_address TEXT,
  destination_name TEXT,
  destination_nif TEXT,
  destination_address TEXT,
  transporter_name TEXT,
  transporter_nif TEXT,
  transporter_plate TEXT,
  ler_code TEXT,
  ler_code_id UUID REFERENCES ler_codes(id),
  declared_weight_kg NUMERIC,
  actual_weight_kg NUMERIC,
  silamb_response JSONB,
  validated_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_egar_records_park ON egar_records(park_id);
CREATE INDEX idx_egar_records_number ON egar_records(egar_number);
CREATE INDEX idx_egar_records_status ON egar_records(status);

-- ============================================================
-- WEIGHING RECORDS
-- ============================================================
CREATE TYPE weighing_type AS ENUM (
  'gross',
  'tare',
  'internal'
);

CREATE TABLE weighing_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  park_id UUID NOT NULL REFERENCES parks(id),
  scale_id UUID REFERENCES scales(id),
  weighing_type weighing_type NOT NULL,
  weight_kg NUMERIC NOT NULL,
  is_stable BOOLEAN NOT NULL DEFAULT true,
  is_manual BOOLEAN NOT NULL DEFAULT false,
  operator_id UUID REFERENCES profiles(id),
  entry_id UUID,  -- FK added after entries table
  exit_id UUID,   -- FK added after exits table
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_weighing_records_park ON weighing_records(park_id);
CREATE INDEX idx_weighing_records_entry ON weighing_records(entry_id);

-- ============================================================
-- ENTRIES
-- ============================================================
CREATE TYPE entry_status AS ENUM (
  'draft',
  'vehicle_arrived',
  'gross_weighed',
  'egar_validated',
  'inspected',
  'tare_weighed',
  'classified',
  'stored',
  'confirmed',
  'cancelled'
);

CREATE TYPE inspection_result AS ENUM (
  'approved',
  'approved_with_divergence',
  'rejected'
);

CREATE TABLE entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  park_id UUID NOT NULL REFERENCES parks(id),
  entry_number TEXT NOT NULL,
  status entry_status NOT NULL DEFAULT 'draft',

  -- Vehicle
  vehicle_plate TEXT,
  driver_name TEXT,

  -- e-GAR
  egar_id UUID REFERENCES egar_records(id),
  egar_number TEXT,

  -- LER Classification
  ler_code_id UUID REFERENCES ler_codes(id),
  ler_code TEXT,
  is_hazardous BOOLEAN NOT NULL DEFAULT false,

  -- Weighing
  gross_weight_kg NUMERIC,
  tare_weight_kg NUMERIC,
  net_weight_kg NUMERIC,
  gross_weighing_id UUID REFERENCES weighing_records(id),
  tare_weighing_id UUID REFERENCES weighing_records(id),

  -- Inspection
  inspection_result inspection_result,
  inspection_notes TEXT,
  inspection_photos TEXT[],
  inspected_at TIMESTAMPTZ,
  inspected_by UUID REFERENCES profiles(id),

  -- Storage
  storage_area_id UUID REFERENCES storage_areas(id),

  -- VFV (End-of-Life Vehicles) specific
  vfv_data JSONB,

  -- Financial
  requires_invoice BOOLEAN NOT NULL DEFAULT false,
  client_id UUID,

  -- Metadata
  operator_id UUID REFERENCES profiles(id),
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_entries_park ON entries(park_id);
CREATE INDEX idx_entries_status ON entries(status);
CREATE INDEX idx_entries_number ON entries(entry_number);
CREATE INDEX idx_entries_egar ON entries(egar_id);
CREATE INDEX idx_entries_ler ON entries(ler_code_id);
CREATE INDEX idx_entries_storage ON entries(storage_area_id);

-- Add FK from weighing_records to entries
ALTER TABLE weighing_records
  ADD CONSTRAINT fk_weighing_entry FOREIGN KEY (entry_id) REFERENCES entries(id);

-- Sequence for entry numbers (per park)
CREATE OR REPLACE FUNCTION generate_entry_number(p_park_id UUID)
RETURNS TEXT AS $$
DECLARE
  park_code TEXT;
  seq_num INTEGER;
  year_str TEXT;
BEGIN
  SELECT code INTO park_code FROM parks WHERE id = p_park_id;
  year_str := to_char(now(), 'YYYY');

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(entry_number FROM '[0-9]+$') AS INTEGER)
  ), 0) + 1
  INTO seq_num
  FROM entries
  WHERE park_id = p_park_id
    AND entry_number LIKE park_code || '-E-' || year_str || '-%';

  RETURN park_code || '-E-' || year_str || '-' || LPAD(seq_num::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- INSPECTION DIVERGENCES
-- ============================================================
CREATE TYPE divergence_type AS ENUM (
  'weight_mismatch',
  'ler_code_mismatch',
  'contamination',
  'packaging_issue',
  'documentation_issue',
  'other'
);

CREATE TYPE divergence_severity AS ENUM (
  'minor',
  'major',
  'critical'
);

CREATE TABLE inspection_divergences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  divergence_type divergence_type NOT NULL,
  severity divergence_severity NOT NULL DEFAULT 'minor',
  description TEXT NOT NULL,
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),
  photos TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_divergences_entry ON inspection_divergences(entry_id);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
CREATE TRIGGER set_updated_at_egar_records
  BEFORE UPDATE ON egar_records FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_entries
  BEFORE UPDATE ON entries FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE egar_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view e-GAR records in their org"
  ON egar_records FOR SELECT
  USING (org_id = get_user_org_id());
CREATE POLICY "Users can manage e-GAR records in their org"
  ON egar_records FOR ALL
  USING (org_id = get_user_org_id());

ALTER TABLE weighing_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view weighing records in their org"
  ON weighing_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM parks WHERE parks.id = weighing_records.park_id
      AND parks.org_id = get_user_org_id()
    )
  );
CREATE POLICY "Users can manage weighing records in their org"
  ON weighing_records FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM parks WHERE parks.id = weighing_records.park_id
      AND parks.org_id = get_user_org_id()
    )
  );

ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view entries in their org"
  ON entries FOR SELECT
  USING (org_id = get_user_org_id());
CREATE POLICY "Users can manage entries in their org"
  ON entries FOR ALL
  USING (org_id = get_user_org_id());

ALTER TABLE inspection_divergences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view divergences in their org"
  ON inspection_divergences FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM entries WHERE entries.id = inspection_divergences.entry_id
      AND entries.org_id = get_user_org_id()
    )
  );
CREATE POLICY "Users can manage divergences in their org"
  ON inspection_divergences FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM entries WHERE entries.id = inspection_divergences.entry_id
      AND entries.org_id = get_user_org_id()
    )
  );
