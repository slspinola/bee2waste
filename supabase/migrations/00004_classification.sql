-- ============================================================
-- Bee2Waste MVP — Classification & Treatment Migration
-- Classification Sheets, Area Transfers, Non-Conformities
-- ============================================================

-- ============================================================
-- CLASSIFICATION SHEETS
-- ============================================================
CREATE TYPE classification_status AS ENUM (
  'draft',
  'in_progress',
  'completed',
  'cancelled'
);

CREATE TABLE classification_sheets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  park_id UUID NOT NULL REFERENCES parks(id),
  entry_id UUID NOT NULL REFERENCES entries(id),
  sheet_number TEXT NOT NULL,
  status classification_status NOT NULL DEFAULT 'draft',
  source_ler_code TEXT,
  source_weight_kg NUMERIC,
  total_output_kg NUMERIC DEFAULT 0,
  loss_kg NUMERIC DEFAULT 0,
  operator_id UUID REFERENCES profiles(id),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_class_sheets_park ON classification_sheets(park_id);
CREATE INDEX idx_class_sheets_entry ON classification_sheets(entry_id);

-- ============================================================
-- CLASSIFICATION LINES (Output Materials)
-- ============================================================
CREATE TABLE classification_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sheet_id UUID NOT NULL REFERENCES classification_sheets(id) ON DELETE CASCADE,
  output_ler_code_id UUID REFERENCES ler_codes(id),
  output_ler_code TEXT NOT NULL,
  weight_kg NUMERIC NOT NULL,
  destination_area_id UUID REFERENCES storage_areas(id),
  weighing_id UUID REFERENCES weighing_records(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_class_lines_sheet ON classification_lines(sheet_id);

-- ============================================================
-- AREA TRANSFERS
-- ============================================================
CREATE TYPE transfer_status AS ENUM (
  'pending',
  'in_transit',
  'completed',
  'cancelled'
);

CREATE TABLE area_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  park_id UUID NOT NULL REFERENCES parks(id),
  transfer_number TEXT NOT NULL,
  status transfer_status NOT NULL DEFAULT 'pending',
  from_area_id UUID NOT NULL REFERENCES storage_areas(id),
  to_area_id UUID NOT NULL REFERENCES storage_areas(id),
  ler_code_id UUID REFERENCES ler_codes(id),
  ler_code TEXT,
  weight_kg NUMERIC NOT NULL,
  weighing_id UUID REFERENCES weighing_records(id),
  operator_id UUID REFERENCES profiles(id),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transfers_park ON area_transfers(park_id);
CREATE INDEX idx_transfers_from ON area_transfers(from_area_id);
CREATE INDEX idx_transfers_to ON area_transfers(to_area_id);

-- ============================================================
-- NON-CONFORMITIES
-- ============================================================
CREATE TYPE nc_status AS ENUM (
  'open',
  'investigating',
  'resolved',
  'closed'
);

CREATE TYPE nc_type AS ENUM (
  'weight_discrepancy',
  'ler_code_mismatch',
  'contamination',
  'documentation',
  'equipment_failure',
  'process_deviation',
  'other'
);

CREATE TYPE nc_severity AS ENUM (
  'low',
  'medium',
  'high',
  'critical'
);

CREATE TABLE non_conformities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  park_id UUID NOT NULL REFERENCES parks(id),
  nc_number TEXT NOT NULL,
  nc_type nc_type NOT NULL,
  severity nc_severity NOT NULL DEFAULT 'medium',
  status nc_status NOT NULL DEFAULT 'open',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  entry_id UUID REFERENCES entries(id),
  sheet_id UUID REFERENCES classification_sheets(id),
  corrective_action TEXT,
  preventive_action TEXT,
  resolution_notes TEXT,
  photos TEXT[],
  reported_by UUID REFERENCES profiles(id),
  assigned_to UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_nc_park ON non_conformities(park_id);
CREATE INDEX idx_nc_status ON non_conformities(status);
CREATE INDEX idx_nc_entry ON non_conformities(entry_id);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
CREATE TRIGGER set_updated_at_classification_sheets
  BEFORE UPDATE ON classification_sheets FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_area_transfers
  BEFORE UPDATE ON area_transfers FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_non_conformities
  BEFORE UPDATE ON non_conformities FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE classification_sheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view classification sheets in their org"
  ON classification_sheets FOR SELECT USING (org_id = get_user_org_id());
CREATE POLICY "Users can manage classification sheets in their org"
  ON classification_sheets FOR ALL USING (org_id = get_user_org_id());

ALTER TABLE classification_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view classification lines in their org"
  ON classification_lines FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM classification_sheets cs
    WHERE cs.id = classification_lines.sheet_id AND cs.org_id = get_user_org_id()
  ));
CREATE POLICY "Users can manage classification lines in their org"
  ON classification_lines FOR ALL
  USING (EXISTS (
    SELECT 1 FROM classification_sheets cs
    WHERE cs.id = classification_lines.sheet_id AND cs.org_id = get_user_org_id()
  ));

ALTER TABLE area_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view area transfers in their org"
  ON area_transfers FOR SELECT USING (org_id = get_user_org_id());
CREATE POLICY "Users can manage area transfers in their org"
  ON area_transfers FOR ALL USING (org_id = get_user_org_id());

ALTER TABLE non_conformities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view non-conformities in their org"
  ON non_conformities FOR SELECT USING (org_id = get_user_org_id());
CREATE POLICY "Users can manage non-conformities in their org"
  ON non_conformities FOR ALL USING (org_id = get_user_org_id());
