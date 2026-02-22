-- ============================================================
-- Bee2Waste MVP — Park Configuration Migration
-- LER Codes, Park Authorizations, Storage Areas, Scales
-- ============================================================

-- ============================================================
-- LER CODES (EU Waste Classification)
-- ============================================================
CREATE TABLE ler_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  chapter TEXT NOT NULL,
  sub_chapter TEXT,
  description_pt TEXT NOT NULL,
  description_en TEXT,
  is_hazardous BOOLEAN NOT NULL DEFAULT false,
  is_mirror BOOLEAN NOT NULL DEFAULT false,
  parent_code TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ler_codes_code ON ler_codes(code);
CREATE INDEX idx_ler_codes_chapter ON ler_codes(chapter);

-- ============================================================
-- PARK LER AUTHORIZATIONS
-- ============================================================
CREATE TYPE ler_operation_type AS ENUM (
  'reception',
  'treatment',
  'storage',
  'valorization',
  'elimination'
);

CREATE TABLE park_ler_authorizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  park_id UUID NOT NULL REFERENCES parks(id) ON DELETE CASCADE,
  ler_code_id UUID NOT NULL REFERENCES ler_codes(id) ON DELETE CASCADE,
  operation_type ler_operation_type NOT NULL DEFAULT 'reception',
  max_capacity_kg NUMERIC,
  annual_limit_kg NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(park_id, ler_code_id, operation_type)
);

CREATE INDEX idx_park_ler_auth_park ON park_ler_authorizations(park_id);

-- ============================================================
-- STORAGE AREAS
-- ============================================================
CREATE TYPE area_type AS ENUM (
  'physical',
  'logical',
  'vfv',
  'sorting_line',
  'warehouse'
);

CREATE TABLE storage_areas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  park_id UUID NOT NULL REFERENCES parks(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  area_type area_type NOT NULL DEFAULT 'physical',
  capacity_kg NUMERIC,
  current_stock_kg NUMERIC NOT NULL DEFAULT 0,
  allowed_ler_codes UUID[],
  location_description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(park_id, code)
);

CREATE INDEX idx_storage_areas_park ON storage_areas(park_id);

-- ============================================================
-- SCALES (Weighing Equipment)
-- ============================================================
CREATE TYPE scale_type AS ENUM ('platform', 'floor', 'bench', 'crane');

CREATE TABLE scales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  park_id UUID NOT NULL REFERENCES parks(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  scale_type scale_type NOT NULL DEFAULT 'platform',
  max_capacity_kg NUMERIC NOT NULL,
  min_capacity_kg NUMERIC NOT NULL DEFAULT 0,
  precision_kg NUMERIC NOT NULL DEFAULT 0.5,
  last_calibration DATE,
  next_calibration DATE,
  calibration_certificate TEXT,
  mock_endpoint_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(park_id, code)
);

CREATE INDEX idx_scales_park ON scales(park_id);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
CREATE TRIGGER set_updated_at_park_ler_authorizations
  BEFORE UPDATE ON park_ler_authorizations FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_storage_areas
  BEFORE UPDATE ON storage_areas FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_scales
  BEFORE UPDATE ON scales FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE ler_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "LER codes are viewable by all authenticated users"
  ON ler_codes FOR SELECT
  USING (auth.uid() IS NOT NULL);

ALTER TABLE park_ler_authorizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view park LER authorizations in their org"
  ON park_ler_authorizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM parks WHERE parks.id = park_ler_authorizations.park_id
      AND parks.org_id = get_user_org_id()
    )
  );
CREATE POLICY "Admins can manage park LER authorizations"
  ON park_ler_authorizations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM parks WHERE parks.id = park_ler_authorizations.park_id
      AND parks.org_id = get_user_org_id()
    )
  );

ALTER TABLE storage_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view storage areas in their org"
  ON storage_areas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM parks WHERE parks.id = storage_areas.park_id
      AND parks.org_id = get_user_org_id()
    )
  );
CREATE POLICY "Admins can manage storage areas"
  ON storage_areas FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM parks WHERE parks.id = storage_areas.park_id
      AND parks.org_id = get_user_org_id()
    )
  );

ALTER TABLE scales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view scales in their org"
  ON scales FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM parks WHERE parks.id = scales.park_id
      AND parks.org_id = get_user_org_id()
    )
  );
CREATE POLICY "Admins can manage scales"
  ON scales FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM parks WHERE parks.id = scales.park_id
      AND parks.org_id = get_user_org_id()
    )
  );

-- ============================================================
-- SEED: Sample LER Codes (key chapters for waste management)
-- ============================================================
INSERT INTO ler_codes (code, chapter, sub_chapter, description_pt, description_en, is_hazardous) VALUES
-- Chapter 02: Agriculture & Food
('02', '02', NULL, 'Resíduos da agricultura, horticultura, aquacultura, silvicultura, caça e pesca', 'Wastes from agriculture, horticulture, aquaculture, forestry, hunting and fishing', false),
('02 01 10', '02', '02 01', 'Resíduos metálicos', 'Waste metals', false),
-- Chapter 15: Packaging
('15', '15', NULL, 'Embalagens e resíduos de embalagens', 'Packaging wastes', false),
('15 01 01', '15', '15 01', 'Embalagens de papel e cartão', 'Paper and cardboard packaging', false),
('15 01 02', '15', '15 01', 'Embalagens de plástico', 'Plastic packaging', false),
('15 01 03', '15', '15 01', 'Embalagens de madeira', 'Wooden packaging', false),
('15 01 04', '15', '15 01', 'Embalagens de metal', 'Metallic packaging', false),
('15 01 06', '15', '15 01', 'Embalagens mistas', 'Mixed packaging', false),
('15 01 07', '15', '15 01', 'Embalagens de vidro', 'Glass packaging', false),
('15 01 10*', '15', '15 01', 'Embalagens contendo ou contaminadas por resíduos de substâncias perigosas', 'Packaging containing residues of or contaminated by hazardous substances', true),
-- Chapter 16: Various
('16', '16', NULL, 'Resíduos não especificados em outros capítulos', 'Wastes not otherwise specified', false),
('16 01 04*', '16', '16 01', 'Veículos em fim de vida (VFV)', 'End-of-life vehicles', true),
('16 01 06', '16', '16 01', 'Veículos em fim de vida esvaziados de líquidos e outros componentes perigosos', 'End-of-life vehicles drained of liquids and other hazardous components', false),
('16 01 17', '16', '16 01', 'Metais ferrosos', 'Ferrous metals', false),
('16 01 18', '16', '16 01', 'Metais não ferrosos', 'Non-ferrous metals', false),
('16 01 19', '16', '16 01', 'Plástico', 'Plastic', false),
('16 01 20', '16', '16 01', 'Vidro', 'Glass', false),
-- Chapter 17: Construction
('17', '17', NULL, 'Resíduos de construção e demolição', 'Construction and demolition wastes', false),
('17 01 01', '17', '17 01', 'Betão', 'Concrete', false),
('17 02 01', '17', '17 02', 'Madeira', 'Wood', false),
('17 04 05', '17', '17 04', 'Ferro e aço', 'Iron and steel', false),
-- Chapter 19: Treatment
('19', '19', NULL, 'Resíduos de instalações de gestão de resíduos', 'Wastes from waste management facilities', false),
('19 10 01', '19', '19 10', 'Resíduos de ferro e aço', 'Iron and steel waste', false),
('19 10 02', '19', '19 10', 'Resíduos de metais não ferrosos', 'Non-ferrous waste', false),
('19 12 01', '19', '19 12', 'Papel e cartão', 'Paper and cardboard', false),
('19 12 02', '19', '19 12', 'Metais ferrosos', 'Ferrous metals', false),
('19 12 03', '19', '19 12', 'Metais não ferrosos', 'Non-ferrous metals', false),
('19 12 04', '19', '19 12', 'Plástico e borracha', 'Plastic and rubber', false),
('19 12 05', '19', '19 12', 'Vidro', 'Glass', false),
-- Chapter 20: Municipal
('20', '20', NULL, 'Resíduos urbanos e equiparados', 'Municipal wastes', false),
('20 01 01', '20', '20 01', 'Papel e cartão', 'Paper and cardboard', false),
('20 01 36', '20', '20 01', 'Equipamento eléctrico e electrónico fora de uso', 'Discarded electrical and electronic equipment', false),
('20 01 39', '20', '20 01', 'Plásticos', 'Plastics', false),
('20 01 40', '20', '20 01', 'Metais', 'Metals', false),
('20 03 01', '20', '20 03', 'Mistura de resíduos urbanos e equiparados', 'Mixed municipal waste', false);
