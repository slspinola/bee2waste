-- ============================================================
-- Bee2Waste — Market Prices & Valuations (Migration 00010)
-- Supports manual price entry and future feed integration
-- ============================================================

CREATE TABLE market_prices (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  park_id        UUID NOT NULL REFERENCES parks(id) ON DELETE CASCADE,
  ler_code       VARCHAR(8) NOT NULL,
  product_type   VARCHAR(100),
  price_per_ton  DECIMAL(10, 2) NOT NULL CHECK (price_per_ton >= 0),
  currency       VARCHAR(3) NOT NULL DEFAULT 'EUR',
  effective_date DATE NOT NULL,
  source         VARCHAR(50) NOT NULL DEFAULT 'manual',
  notes          TEXT,
  created_by     UUID REFERENCES profiles(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for efficient latest-price-per-LER queries
CREATE INDEX idx_market_prices_park_ler_date
  ON market_prices(park_id, ler_code, effective_date DESC);

-- Enable Row Level Security
ALTER TABLE market_prices ENABLE ROW LEVEL SECURITY;

-- Park members can manage their park's market prices
CREATE POLICY "park_members_manage_market_prices"
  ON market_prices
  FOR ALL
  USING (
    park_id IN (
      SELECT park_id FROM user_park_access WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    park_id IN (
      SELECT park_id FROM user_park_access WHERE user_id = auth.uid()
    )
  );
