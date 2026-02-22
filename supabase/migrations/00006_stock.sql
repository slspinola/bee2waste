-- ============================================================
-- Bee2Waste MVP — Stock Management Migration
-- Stock Movements Ledger, Current Stock View
-- ============================================================

-- ============================================================
-- STOCK MOVEMENT TYPES
-- ============================================================
CREATE TYPE stock_movement_type AS ENUM (
  'entry',
  'exit',
  'transfer_in',
  'transfer_out',
  'classification_in',
  'classification_out',
  'adjustment'
);

-- ============================================================
-- STOCK MOVEMENTS (Ledger)
-- ============================================================
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  park_id UUID NOT NULL REFERENCES parks(id),
  area_id UUID NOT NULL REFERENCES storage_areas(id),
  ler_code_id UUID REFERENCES ler_codes(id),
  ler_code TEXT NOT NULL,

  movement_type stock_movement_type NOT NULL,
  quantity_kg NUMERIC NOT NULL,
  balance_after_kg NUMERIC NOT NULL DEFAULT 0,

  -- Source references
  entry_id UUID REFERENCES entries(id),
  exit_id UUID REFERENCES exits(id),
  delivery_request_id UUID REFERENCES delivery_requests(id),
  transfer_id UUID REFERENCES area_transfers(id),
  classification_sheet_id UUID REFERENCES classification_sheets(id),

  -- Metadata
  notes TEXT,
  operator_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_movements_park ON stock_movements(park_id);
CREATE INDEX idx_stock_movements_area ON stock_movements(area_id);
CREATE INDEX idx_stock_movements_ler ON stock_movements(ler_code);
CREATE INDEX idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX idx_stock_movements_created ON stock_movements(created_at DESC);

-- ============================================================
-- CURRENT STOCK (Materialized View)
-- ============================================================
CREATE MATERIALIZED VIEW current_stock AS
SELECT
  sm.org_id,
  sm.park_id,
  sm.area_id,
  sm.ler_code_id,
  sm.ler_code,
  sa.code AS area_code,
  sa.name AS area_name,
  sa.capacity_kg AS area_capacity_kg,
  SUM(sm.quantity_kg) AS total_kg,
  MAX(sm.created_at) AS last_movement_at,
  COUNT(*) AS movement_count
FROM stock_movements sm
JOIN storage_areas sa ON sa.id = sm.area_id
GROUP BY sm.org_id, sm.park_id, sm.area_id, sm.ler_code_id, sm.ler_code,
         sa.code, sa.name, sa.capacity_kg;

CREATE UNIQUE INDEX idx_current_stock_unique
  ON current_stock(park_id, area_id, ler_code);
CREATE INDEX idx_current_stock_park ON current_stock(park_id);

-- ============================================================
-- REFRESH FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION refresh_current_stock()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY current_stock;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER refresh_stock_on_movement
  AFTER INSERT OR UPDATE OR DELETE ON stock_movements
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_current_stock();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view stock movements in their org"
  ON stock_movements FOR SELECT USING (org_id = get_user_org_id());
CREATE POLICY "Users can manage stock movements in their org"
  ON stock_movements FOR ALL USING (org_id = get_user_org_id());
