-- ============================================================
-- Bee2Waste MVP — Lots, Quality & Traceability Migration
-- area_groups, lots, lot_zones, lot_entries,
-- supplier_scores, client_production_cycles
-- ============================================================

-- ============================================================
-- HELPER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE lot_status AS ENUM ('open', 'in_treatment', 'closed');
CREATE TYPE lqi_letter AS ENUM ('A', 'B', 'C', 'D', 'E');

-- ============================================================
-- AREA GROUPS
-- Logical grouping of storage zones within a park
-- (e.g. "Armazém Norte" groups zones A1, A2, A3)
-- ============================================================
CREATE TABLE area_groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  park_id     UUID NOT NULL REFERENCES parks(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  code        TEXT NOT NULL,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(park_id, code)
);

CREATE INDEX idx_area_groups_park ON area_groups(park_id);

-- ============================================================
-- EXTEND storage_areas WITH ZONE FIELDS
-- storage_areas become "zones" (leaf storage units)
-- ============================================================
ALTER TABLE storage_areas
  ADD COLUMN area_group_id UUID REFERENCES area_groups(id) ON DELETE SET NULL,
  ADD COLUMN is_blocked    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN blocked_reason TEXT,
  ADD COLUMN blocked_at    TIMESTAMPTZ,
  ADD COLUMN blocked_by    UUID REFERENCES profiles(id);

CREATE INDEX idx_storage_areas_group ON storage_areas(area_group_id);

-- ============================================================
-- LOTS
-- Core traceability unit grouping N entries of the same type
-- ============================================================
CREATE TABLE lots (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                   UUID NOT NULL REFERENCES organizations(id),
  park_id                  UUID NOT NULL REFERENCES parks(id) ON DELETE CASCADE,
  lot_number               TEXT NOT NULL,
  name                     TEXT,
  status                   lot_status NOT NULL DEFAULT 'open',

  -- LER codes accepted in this lot
  allowed_ler_codes        TEXT[]  NOT NULL DEFAULT '{}',
  allowed_ler_code_ids     UUID[]  NOT NULL DEFAULT '{}',

  -- Quality metrics (auto-calculated)
  raw_grade                NUMERIC(3,2),   -- 1.00–5.00, weighted avg of entry grades
  transformed_grade        NUMERIC(3,2),   -- 1.00–5.00, recorded at closure
  yield_rate               NUMERIC(5,2),   -- % output_kg / input_kg * 100
  lot_quality_index        NUMERIC(3,2),   -- LQI composite score
  lqi_grade                lqi_letter,     -- A | B | C | D | E

  -- Weight totals
  total_input_kg           NUMERIC NOT NULL DEFAULT 0,
  total_output_kg          NUMERIC,

  -- Links
  classification_sheet_id  UUID REFERENCES classification_sheets(id),

  -- Lifecycle
  opened_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  treatment_started_at     TIMESTAMPTZ,
  closed_at                TIMESTAMPTZ,
  created_by               UUID REFERENCES profiles(id),
  notes                    TEXT,

  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(park_id, lot_number)
);

CREATE INDEX idx_lots_park    ON lots(park_id);
CREATE INDEX idx_lots_status  ON lots(park_id, status);
CREATE INDEX idx_lots_org     ON lots(org_id);

-- ============================================================
-- LOT ZONES (N:N — a lot can span multiple zones)
-- ============================================================
CREATE TABLE lot_zones (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id     UUID NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
  zone_id    UUID NOT NULL REFERENCES storage_areas(id) ON DELETE CASCADE,
  added_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  removed_at TIMESTAMPTZ,              -- NULL = zone still active in lot
  UNIQUE(lot_id, zone_id)
);

CREATE INDEX idx_lot_zones_lot  ON lot_zones(lot_id);
CREATE INDEX idx_lot_zones_zone ON lot_zones(zone_id);

-- ============================================================
-- LOT ENTRIES (N:N — a lot aggregates N entries)
-- ============================================================
CREATE TABLE lot_entries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id           UUID NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
  entry_id         UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  contribution_kg  NUMERIC NOT NULL,   -- net_weight_kg from entry
  entry_raw_grade  NUMERIC(3,2),       -- quality grade for this specific entry
  added_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(lot_id, entry_id)
);

CREATE INDEX idx_lot_entries_lot   ON lot_entries(lot_id);
CREATE INDEX idx_lot_entries_entry ON lot_entries(entry_id);

-- ============================================================
-- SUPPLIER SCORES (computed per client per period)
-- ============================================================
CREATE TABLE supplier_scores (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID NOT NULL REFERENCES organizations(id),
  client_id      UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  park_id        UUID REFERENCES parks(id),       -- NULL = all parks combined
  period_start   DATE NOT NULL,
  period_end     DATE NOT NULL,
  lot_count      INTEGER NOT NULL DEFAULT 0,
  avg_raw_grade  NUMERIC(3,2),
  avg_yield_rate NUMERIC(5,2),
  avg_lqi        NUMERIC(3,2),
  score_letter   lqi_letter,
  total_kg       NUMERIC NOT NULL DEFAULT 0,
  calculated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, park_id, period_start, period_end)
);

CREATE INDEX idx_supplier_scores_client ON supplier_scores(client_id);
CREATE INDEX idx_supplier_scores_org    ON supplier_scores(org_id);

-- ============================================================
-- CLIENT PRODUCTION CYCLES (inferred from history)
-- ============================================================
CREATE TABLE client_production_cycles (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id          UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  park_id            UUID NOT NULL REFERENCES parks(id) ON DELETE CASCADE,
  avg_interval_days  NUMERIC(6,1),
  std_dev_days       NUMERIC(6,1),
  last_entry_date    DATE,
  next_predicted_date DATE,
  entry_count        INTEGER NOT NULL DEFAULT 0,
  confidence         NUMERIC(3,2),    -- 0.00–1.00 (increases with more history)
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, park_id)
);

CREATE INDEX idx_client_cycles_client ON client_production_cycles(client_id);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Calculate lot number (sequential per park)
CREATE OR REPLACE FUNCTION generate_lot_number(p_park_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_year    TEXT := TO_CHAR(now(), 'YYYY');
  v_seq     INTEGER;
  v_code    TEXT;
BEGIN
  SELECT code INTO v_code FROM parks WHERE id = p_park_id;
  SELECT COUNT(*) + 1 INTO v_seq
    FROM lots
   WHERE park_id = p_park_id
     AND TO_CHAR(created_at, 'YYYY') = v_year;
  RETURN v_code || '-L-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Recalculate lot raw_grade and total_input_kg from lot_entries
CREATE OR REPLACE FUNCTION recalculate_lot_raw_grade(p_lot_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE lots SET
    raw_grade = (
      SELECT ROUND(
        SUM(le.entry_raw_grade * le.contribution_kg)
          / NULLIF(SUM(le.contribution_kg), 0),
        2
      )
      FROM lot_entries le
      WHERE le.lot_id = p_lot_id
        AND le.entry_raw_grade IS NOT NULL
    ),
    total_input_kg = (
      SELECT COALESCE(SUM(le.contribution_kg), 0)
      FROM lot_entries le
      WHERE le.lot_id = p_lot_id
    ),
    updated_at = now()
  WHERE id = p_lot_id;
END;
$$ LANGUAGE plpgsql;

-- Calculate LQI and lqi_grade when closing a lot
CREATE OR REPLACE FUNCTION calculate_lot_lqi(p_lot_id UUID)
RETURNS void AS $$
DECLARE
  v_raw         NUMERIC(3,2);
  v_transformed NUMERIC(3,2);
  v_yield       NUMERIC(5,2);
  v_yield_norm  NUMERIC(5,2);
  v_lqi         NUMERIC(3,2);
  v_letter      lqi_letter;
BEGIN
  SELECT raw_grade, transformed_grade, yield_rate
    INTO v_raw, v_transformed, v_yield
    FROM lots WHERE id = p_lot_id;

  -- Normalise yield to 1–5 scale
  v_yield_norm := LEAST(COALESCE(v_yield, 0) / 100.0 * 5.0, 5.0);

  -- Composite LQI: raw×30% + yield×40% + transformed×30%
  v_lqi := ROUND(
    COALESCE(v_raw, 0)         * 0.30
    + v_yield_norm              * 0.40
    + COALESCE(v_transformed, 0) * 0.30,
    2
  );

  -- Map to letter grade
  v_letter := CASE
    WHEN v_lqi >= 4.5 THEN 'A'
    WHEN v_lqi >= 3.5 THEN 'B'
    WHEN v_lqi >= 2.5 THEN 'C'
    WHEN v_lqi >= 1.5 THEN 'D'
    ELSE                    'E'
  END::lqi_letter;

  UPDATE lots SET
    lot_quality_index = v_lqi,
    lqi_grade         = v_letter,
    updated_at        = now()
  WHERE id = p_lot_id;
END;
$$ LANGUAGE plpgsql;

-- Map entry inspection result to a raw grade (1–5)
CREATE OR REPLACE FUNCTION entry_inspection_to_grade(
  p_inspection_result TEXT,
  p_has_major_divergence BOOLEAN DEFAULT false,
  p_has_critical_divergence BOOLEAN DEFAULT false
)
RETURNS NUMERIC(3,2) AS $$
BEGIN
  RETURN CASE
    WHEN p_inspection_result = 'rejected'                                      THEN 1.00
    WHEN p_inspection_result = 'approved_with_divergence' AND p_has_critical_divergence THEN 2.00
    WHEN p_inspection_result = 'approved_with_divergence' AND p_has_major_divergence    THEN 3.00
    WHEN p_inspection_result = 'approved_with_divergence'                      THEN 3.50
    WHEN p_inspection_result = 'approved'                                      THEN 5.00
    ELSE 3.00
  END;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Recalculate raw_grade after lot_entries insert/update/delete
CREATE OR REPLACE FUNCTION trg_lot_entries_recalculate()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalculate_lot_raw_grade(OLD.lot_id);
  ELSE
    PERFORM recalculate_lot_raw_grade(NEW.lot_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lot_entries_after_change
  AFTER INSERT OR UPDATE OR DELETE ON lot_entries
  FOR EACH ROW EXECUTE FUNCTION trg_lot_entries_recalculate();

-- Auto-update updated_at on lots
CREATE OR REPLACE FUNCTION trg_update_lots_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lots_updated_at
  BEFORE UPDATE ON lots
  FOR EACH ROW EXECUTE FUNCTION trg_update_lots_timestamp();

CREATE TRIGGER area_groups_updated_at
  BEFORE UPDATE ON area_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE area_groups              ENABLE ROW LEVEL SECURITY;
ALTER TABLE lots                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE lot_zones                ENABLE ROW LEVEL SECURITY;
ALTER TABLE lot_entries              ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_scores          ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_production_cycles ENABLE ROW LEVEL SECURITY;

-- area_groups: scoped by park's org
CREATE POLICY area_groups_org_policy ON area_groups
  USING (park_id IN (SELECT id FROM parks WHERE org_id = get_user_org_id()));

-- lots: scoped by org_id
CREATE POLICY lots_org_policy ON lots
  USING (org_id = get_user_org_id());

-- lot_zones: via lot's org
CREATE POLICY lot_zones_org_policy ON lot_zones
  USING (lot_id IN (SELECT id FROM lots WHERE org_id = get_user_org_id()));

-- lot_entries: via lot's org
CREATE POLICY lot_entries_org_policy ON lot_entries
  USING (lot_id IN (SELECT id FROM lots WHERE org_id = get_user_org_id()));

-- supplier_scores: scoped by org_id
CREATE POLICY supplier_scores_org_policy ON supplier_scores
  USING (org_id = get_user_org_id());

-- client_production_cycles: via client's org
CREATE POLICY client_cycles_org_policy ON client_production_cycles
  USING (client_id IN (SELECT id FROM clients WHERE org_id = get_user_org_id()));
