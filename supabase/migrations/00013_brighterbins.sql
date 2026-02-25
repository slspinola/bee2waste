-- ============================================================
-- Bee2Waste — BrighterBins Vision API Integration
-- Tables: park_brighterbins_devices, brighterbins_sync_state,
--         entrada_vision_readings
-- RPC:    get_top_contaminants
-- ============================================================

-- ============================================================
-- PARK → DEVICE ASSOCIATIONS
-- Which BrighterBins cameras are active in each park
-- ============================================================
CREATE TABLE park_brighterbins_devices (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  park_id     UUID        NOT NULL REFERENCES parks(id) ON DELETE CASCADE,
  device_id   TEXT        NOT NULL,
  device_name TEXT        NOT NULL,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  added_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  added_by    UUID        REFERENCES profiles(id) ON DELETE SET NULL,

  UNIQUE(park_id, device_id)
);

CREATE INDEX idx_pbd_park_id        ON park_brighterbins_devices(park_id);
CREATE INDEX idx_pbd_park_active    ON park_brighterbins_devices(park_id, is_active);

ALTER TABLE park_brighterbins_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY pbd_org_policy ON park_brighterbins_devices
  USING (park_id IN (SELECT id FROM parks WHERE org_id = get_user_org_id()));

-- ============================================================
-- SYNC STATE
-- Tracks last synced uplink per device (used to paginate from)
-- Written only by the server-side sync job (service role)
-- ============================================================
CREATE TABLE brighterbins_sync_state (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id       TEXT        UNIQUE NOT NULL,
  device_name     TEXT,
  last_sync_at    TIMESTAMPTZ,
  last_uplink_ts  BIGINT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_brighterbins_sync_state_updated_at
  BEFORE UPDATE ON brighterbins_sync_state FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

ALTER TABLE brighterbins_sync_state ENABLE ROW LEVEL SECURITY;

-- Authenticated users may read sync state (no org scoping — just device timestamps)
-- Service role (used by sync job) bypasses RLS and can write freely
CREATE POLICY sync_state_read_policy ON brighterbins_sync_state
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================
-- VISION READINGS
-- One row per camera uplink snapshot, optionally linked to an entry
-- ============================================================
CREATE TABLE entrada_vision_readings (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  park_id             UUID        NOT NULL REFERENCES parks(id) ON DELETE CASCADE,
  entry_id            UUID        REFERENCES entries(id) ON DELETE SET NULL,

  -- Device identification
  device_id           TEXT        NOT NULL,
  device_name         TEXT,
  bin_id              TEXT,

  -- Timing
  uplink_time         TIMESTAMPTZ NOT NULL,
  uplink_time_ms      BIGINT      NOT NULL,

  -- Images
  image_url           TEXT,
  annotated_img_url   TEXT,

  -- Vision data
  fill_level          NUMERIC(5,2),
  contamination       TEXT[],
  contamination_count INTEGER      NOT NULL DEFAULT 0,

  -- Device telemetry
  battery_level       INTEGER,
  battery_type        TEXT,
  temperature         NUMERIC(5,2),
  flash_on            BOOLEAN,
  orientation         TEXT,
  image_quality       TEXT,
  image_resolution    TEXT,

  -- Metadata
  synced_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(device_id, uplink_time_ms)
);

CREATE INDEX idx_evr_park_id    ON entrada_vision_readings(park_id);
CREATE INDEX idx_evr_entry_id   ON entrada_vision_readings(entry_id);
CREATE INDEX idx_evr_device_id  ON entrada_vision_readings(device_id);
CREATE INDEX idx_evr_uplink     ON entrada_vision_readings(uplink_time DESC);
CREATE INDEX idx_evr_contam     ON entrada_vision_readings USING GIN(contamination);

ALTER TABLE entrada_vision_readings ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read readings in their org's parks
-- Service role (sync job) bypasses RLS and can insert/update freely
CREATE POLICY evr_org_select_policy ON entrada_vision_readings
  FOR SELECT USING (park_id IN (SELECT id FROM parks WHERE org_id = get_user_org_id()));

-- ============================================================
-- RPC: Top contaminants for a park over N days
-- ============================================================
CREATE OR REPLACE FUNCTION get_top_contaminants(p_park_id UUID, days INT)
RETURNS TABLE(contaminant TEXT, count BIGINT) AS $$
  SELECT unnest(contamination) AS contaminant, COUNT(*) AS count
  FROM entrada_vision_readings
  WHERE park_id = p_park_id
    AND uplink_time >= now() - (days || ' days')::interval
    AND contamination IS NOT NULL
  GROUP BY contaminant
  ORDER BY count DESC
  LIMIT 10;
$$ LANGUAGE sql STABLE;
