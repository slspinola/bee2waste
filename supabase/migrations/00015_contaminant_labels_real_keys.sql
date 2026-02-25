-- Migration 00015: Seed real BrighterBins contamination key labels (PT-PT)
-- These are the actual keys returned by the BrighterBins Vision API.

INSERT INTO contaminant_labels (api_key, label_pt, label_en) VALUES
  ('C&D_debris',              'Resíduos de Construção e Demolição', 'Construction & Demolition Debris'),
  ('Cardboard&packaging waste','Cartão e Embalagens',               'Cardboard & Packaging Waste'),
  ('covered_truck',           'Camião com Cobertura',               'Covered Truck'),
  ('empty_truck',             'Camião Vazio',                       'Empty Truck'),
  ('general_mixed_waste',     'Resíduos Mistos Gerais',             'General Mixed Waste'),
  ('metal_waste',             'Resíduos Metálicos',                 'Metal Waste'),
  ('no_truck',                'Sem Camião',                         'No Truck'),
  ('wood_waste',              'Resíduos de Madeira',                'Wood Waste')
ON CONFLICT (api_key) DO UPDATE
  SET label_pt   = EXCLUDED.label_pt,
      label_en   = EXCLUDED.label_en,
      updated_at = NOW();
