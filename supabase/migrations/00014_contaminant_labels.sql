-- Migration 00014: Global contaminant type label mappings
-- These are not per-park — they are system-wide readable/admin-editable labels
-- for the raw API keys returned by the BrighterBins Vision API.

CREATE TABLE IF NOT EXISTS contaminant_labels (
  api_key    TEXT        PRIMARY KEY,
  label_pt   TEXT        NOT NULL,
  label_en   TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE contaminant_labels ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read
CREATE POLICY "contaminant_labels_select"
  ON contaminant_labels FOR SELECT
  USING (auth.role() = 'authenticated');

-- All authenticated users can insert/update/delete (global config, trust the user base)
CREATE POLICY "contaminant_labels_write"
  ON contaminant_labels FOR ALL
  USING (auth.role() = 'authenticated');

-- Seed with PT-PT defaults (do nothing on conflict so manual overrides survive re-runs)
INSERT INTO contaminant_labels (api_key, label_pt, label_en) VALUES
  ('general_mixed_waste',  'Resíduos Mistos Gerais',       'General Mixed Waste'),
  ('paper',                'Papel',                         'Paper'),
  ('paper_cardboard',      'Papel e Cartão',                'Paper & Cardboard'),
  ('cardboard',            'Cartão',                        'Cardboard'),
  ('plastic',              'Plástico',                      'Plastic'),
  ('glass',                'Vidro',                         'Glass'),
  ('metal',                'Metal',                         'Metal'),
  ('aluminium',            'Alumínio',                      'Aluminium'),
  ('steel',                'Aço',                           'Steel'),
  ('organic',              'Orgânicos',                     'Organic'),
  ('organic_waste',        'Resíduos Orgânicos',            'Organic Waste'),
  ('food_waste',           'Resíduos Alimentares',          'Food Waste'),
  ('textile',              'Têxtil',                        'Textile'),
  ('textiles',             'Têxteis',                       'Textiles'),
  ('wood',                 'Madeira',                       'Wood'),
  ('rubber',               'Borracha',                      'Rubber'),
  ('liquid',               'Líquido',                       'Liquid'),
  ('electronics',          'Eletrodomésticos / REEE',       'Electronics / WEEE'),
  ('electronic',           'Eletrónico',                    'Electronic'),
  ('hazardous',            'Perigoso',                      'Hazardous'),
  ('hazardous_waste',      'Resíduos Perigosos',            'Hazardous Waste'),
  ('batteries',            'Pilhas e Baterias',             'Batteries'),
  ('construction',         'Construção',                    'Construction'),
  ('construction_waste',   'Resíduos de Construção',        'Construction Waste'),
  ('unknown',              'Desconhecido',                  'Unknown'),
  ('other',                'Outros',                        'Other')
ON CONFLICT (api_key) DO NOTHING;
