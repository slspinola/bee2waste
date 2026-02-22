-- ============================================================
-- Bee2Waste — Demo Seed Data
-- Populates all 6 dashboard tabs with realistic Portuguese data
-- Run via: Supabase SQL Editor (service role)
-- ============================================================

DO $$
DECLARE
  v_org_id   UUID;
  v_park_id  UUID;
  v_user_id  UUID;
  v_park_code TEXT;

  -- LER code IDs
  v_ler_papel    UUID;
  v_ler_plastico UUID;
  v_ler_vidro    UUID;
  v_ler_ferro    UUID;

  -- Area groups
  v_group_a UUID;
  v_group_b UUID;

  -- Storage areas
  v_area_a1 UUID;
  v_area_a2 UUID;
  v_area_a3 UUID;
  v_area_b1 UUID;
  v_area_b2 UUID;
  v_area_c1 UUID;

  -- Clients
  v_sup_1 UUID;
  v_sup_2 UUID;
  v_sup_3 UUID;
  v_sup_4 UUID;
  v_buy_1 UUID;
  v_buy_2 UUID;

  -- Entries (20)
  v_e UUID[] := ARRAY[
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()
  ];

  -- Lots
  v_lot_1 UUID;
  v_lot_2 UUID;
  v_lot_3 UUID;
  v_lot_4 UUID;
  v_lot_5 UUID;

  -- Exits
  v_exit_1 UUID;
  v_exit_2 UUID;

BEGIN
  -- ============================================================
  -- RESOLVE EXISTING CORE ENTITIES
  -- ============================================================
  SELECT id INTO v_org_id   FROM organizations LIMIT 1;
  SELECT id INTO v_park_id  FROM parks         LIMIT 1;
  SELECT id INTO v_user_id  FROM profiles      LIMIT 1;
  SELECT code INTO v_park_code FROM parks WHERE id = v_park_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Sem organização. Configure o parque primeiro na aplicação.';
  END IF;

  RAISE NOTICE 'A carregar seed para org=% park=% (%)', v_org_id, v_park_id, v_park_code;

  -- ============================================================
  -- LER CODES
  -- ============================================================
  SELECT id INTO v_ler_papel    FROM ler_codes WHERE code = '15 01 01';
  SELECT id INTO v_ler_plastico FROM ler_codes WHERE code = '15 01 02';
  SELECT id INTO v_ler_vidro    FROM ler_codes WHERE code = '15 01 07';
  SELECT id INTO v_ler_ferro    FROM ler_codes WHERE code = '17 04 05';

  INSERT INTO park_ler_authorizations (park_id, ler_code_id, operation_type)
  SELECT v_park_id, ler_id, op
  FROM (VALUES
    (v_ler_papel,    'reception'::ler_operation_type),
    (v_ler_papel,    'treatment'::ler_operation_type),
    (v_ler_plastico, 'reception'::ler_operation_type),
    (v_ler_plastico, 'treatment'::ler_operation_type),
    (v_ler_vidro,    'reception'::ler_operation_type),
    (v_ler_ferro,    'reception'::ler_operation_type),
    (v_ler_ferro,    'treatment'::ler_operation_type)
  ) AS t(ler_id, op)
  ON CONFLICT (park_id, ler_code_id, operation_type) DO NOTHING;

  -- ============================================================
  -- AREA GROUPS
  -- ============================================================
  INSERT INTO area_groups (id, park_id, name, code, description)
  VALUES
    (gen_random_uuid(), v_park_id, 'Armazém Norte', 'AN', 'Zona de recepção e triagem de recicláveis'),
    (gen_random_uuid(), v_park_id, 'Armazém Sul',   'AS', 'Zona de tratamento e expedição')
  ON CONFLICT (park_id, code) DO NOTHING;

  SELECT id INTO v_group_a FROM area_groups WHERE park_id = v_park_id AND code = 'AN';
  SELECT id INTO v_group_b FROM area_groups WHERE park_id = v_park_id AND code = 'AS';

  -- ============================================================
  -- STORAGE AREAS (ZONES)
  -- ============================================================
  INSERT INTO storage_areas (id, park_id, area_group_id, code, name, area_type, capacity_kg, current_stock_kg)
  VALUES
    (gen_random_uuid(), v_park_id, v_group_a, 'AN-01', 'Zona Papel/Cartão',     'warehouse',    50000, 0),
    (gen_random_uuid(), v_park_id, v_group_a, 'AN-02', 'Zona Plástico',          'warehouse',    30000, 0),
    (gen_random_uuid(), v_park_id, v_group_a, 'AN-03', 'Zona Vidro',             'warehouse',    40000, 0),
    (gen_random_uuid(), v_park_id, v_group_b, 'AS-01', 'Zona Ferro/Metais',      'physical',     80000, 0),
    (gen_random_uuid(), v_park_id, v_group_b, 'AS-02', 'Zona PVC/Plástico Duro', 'physical',     25000, 0),
    (gen_random_uuid(), v_park_id, v_group_b, 'AS-03', 'Linha de Triagem 1',     'sorting_line', 20000, 0)
  ON CONFLICT (park_id, code) DO NOTHING;

  SELECT id INTO v_area_a1 FROM storage_areas WHERE park_id = v_park_id AND code = 'AN-01';
  SELECT id INTO v_area_a2 FROM storage_areas WHERE park_id = v_park_id AND code = 'AN-02';
  SELECT id INTO v_area_a3 FROM storage_areas WHERE park_id = v_park_id AND code = 'AN-03';
  SELECT id INTO v_area_b1 FROM storage_areas WHERE park_id = v_park_id AND code = 'AS-01';
  SELECT id INTO v_area_b2 FROM storage_areas WHERE park_id = v_park_id AND code = 'AS-02';
  SELECT id INTO v_area_c1 FROM storage_areas WHERE park_id = v_park_id AND code = 'AS-03';

  -- ============================================================
  -- CLIENTS
  -- ============================================================
  INSERT INTO clients (id, org_id, name, nif, client_type, city, phone, email, contact_person, payment_terms_days)
  VALUES
    (gen_random_uuid(), v_org_id, 'Reciclagem do Norte, Lda',     '501234567', 'supplier', 'Braga',   '+351 253 100 200', 'geral@recnorte.pt',    'António Silva',  30),
    (gen_random_uuid(), v_org_id, 'EcoMat Portugal, SA',           '502345678', 'supplier', 'Porto',   '+351 222 300 400', 'info@ecomat.pt',        'Maria Santos',   45),
    (gen_random_uuid(), v_org_id, 'Indústrias Verde, SA',          '503456789', 'both',     'Lisboa',  '+351 212 500 600', 'verde@iverde.pt',       'João Ferreira',  30),
    (gen_random_uuid(), v_org_id, 'Gestão Resíduos Alentejo, Lda', '504567890', 'supplier', 'Évora',   '+351 266 700 800', 'gra@gralentejo.pt',    'Ana Costa',      60),
    (gen_random_uuid(), v_org_id, 'Papelaria Industrial, Lda',     '505678901', 'buyer',    'Setúbal', '+351 265 100 200', 'compras@papelind.pt',  'Carlos Neves',   30),
    (gen_random_uuid(), v_org_id, 'Sucata Metais Lisboa, Lda',     '506789012', 'buyer',    'Lisboa',  '+351 218 200 300', 'metal@sucatalisboa.pt','Pedro Gomes',    30)
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_sup_1 FROM clients WHERE org_id = v_org_id AND nif = '501234567';
  SELECT id INTO v_sup_2 FROM clients WHERE org_id = v_org_id AND nif = '502345678';
  SELECT id INTO v_sup_3 FROM clients WHERE org_id = v_org_id AND nif = '503456789';
  SELECT id INTO v_sup_4 FROM clients WHERE org_id = v_org_id AND nif = '504567890';
  SELECT id INTO v_buy_1 FROM clients WHERE org_id = v_org_id AND nif = '505678901';
  SELECT id INTO v_buy_2 FROM clients WHERE org_id = v_org_id AND nif = '506789012';

  INSERT INTO client_park_associations (client_id, park_id)
  VALUES (v_sup_1,v_park_id),(v_sup_2,v_park_id),(v_sup_3,v_park_id),(v_sup_4,v_park_id),
         (v_buy_1,v_park_id),(v_buy_2,v_park_id)
  ON CONFLICT (client_id, park_id) DO NOTHING;

  -- ============================================================
  -- ENTRIES — 20 confirmed entries over last 5 months
  -- ============================================================

  -- Papel/Cartão (15 01 01) — zona AN-01
  INSERT INTO entries (id, org_id, park_id, entry_number, status, client_id,
    vehicle_plate, driver_name, ler_code_id, ler_code,
    gross_weight_kg, tare_weight_kg, net_weight_kg,
    inspection_result, storage_area_id, operator_id, created_at, confirmed_at)
  VALUES
    (v_e[1],  v_org_id, v_park_id, v_park_code||'-E-2025-00001', 'confirmed', v_sup_1, '00-AB-12', 'Rui Mendes',   v_ler_papel,    '15 01 01', 14200, 5800,  8400, 'approved',               v_area_a1, v_user_id, NOW()-INTERVAL'150 days', NOW()-INTERVAL'150 days'),
    (v_e[2],  v_org_id, v_park_id, v_park_code||'-E-2025-00002', 'confirmed', v_sup_1, '00-AB-12', 'Rui Mendes',   v_ler_papel,    '15 01 01', 15000, 5900,  9100, 'approved',               v_area_a1, v_user_id, NOW()-INTERVAL'120 days', NOW()-INTERVAL'120 days'),
    (v_e[3],  v_org_id, v_park_id, v_park_code||'-E-2025-00003', 'confirmed', v_sup_2, '11-EF-56', 'José Lima',    v_ler_papel,    '15 01 01', 13800, 5700,  8100, 'approved',               v_area_a1, v_user_id, NOW()-INTERVAL'105 days', NOW()-INTERVAL'105 days'),
    (v_e[4],  v_org_id, v_park_id, v_park_code||'-E-2025-00004', 'confirmed', v_sup_1, '00-AB-12', 'Rui Mendes',   v_ler_papel,    '15 01 01', 16200, 6000, 10200, 'approved_with_divergence',v_area_a1, v_user_id, NOW()-INTERVAL'90 days',  NOW()-INTERVAL'90 days'),
    (v_e[5],  v_org_id, v_park_id, v_park_code||'-E-2025-00005', 'confirmed', v_sup_3, '22-GH-78', 'Marco Pinto',  v_ler_papel,    '15 01 01', 14500, 5800,  8700, 'approved',               v_area_a1, v_user_id, NOW()-INTERVAL'60 days',  NOW()-INTERVAL'60 days')
  ON CONFLICT (entry_number) DO NOTHING;

  -- Plástico (15 01 02) — zona AN-02
  INSERT INTO entries (id, org_id, park_id, entry_number, status, client_id,
    vehicle_plate, driver_name, ler_code_id, ler_code,
    gross_weight_kg, tare_weight_kg, net_weight_kg,
    inspection_result, storage_area_id, operator_id, created_at, confirmed_at)
  VALUES
    (v_e[6],  v_org_id, v_park_id, v_park_code||'-E-2025-00006', 'confirmed', v_sup_2, '33-IJ-90', 'Sara Fonseca', v_ler_plastico, '15 01 02', 11000, 5200,  5800, 'approved',               v_area_a2, v_user_id, NOW()-INTERVAL'140 days', NOW()-INTERVAL'140 days'),
    (v_e[7],  v_org_id, v_park_id, v_park_code||'-E-2025-00007', 'confirmed', v_sup_2, '33-IJ-90', 'Sara Fonseca', v_ler_plastico, '15 01 02', 10500, 5100,  5400, 'approved',               v_area_a2, v_user_id, NOW()-INTERVAL'110 days', NOW()-INTERVAL'110 days'),
    (v_e[8],  v_org_id, v_park_id, v_park_code||'-E-2025-00008', 'confirmed', v_sup_3, '44-KL-11', 'Marco Pinto',  v_ler_plastico, '15 01 02', 12000, 5400,  6600, 'approved_with_divergence',v_area_a2, v_user_id, NOW()-INTERVAL'85 days',  NOW()-INTERVAL'85 days'),
    (v_e[9],  v_org_id, v_park_id, v_park_code||'-E-2025-00009', 'confirmed', v_sup_2, '33-IJ-90', 'Sara Fonseca', v_ler_plastico, '15 01 02', 11800, 5300,  6500, 'approved',               v_area_a2, v_user_id, NOW()-INTERVAL'40 days',  NOW()-INTERVAL'40 days')
  ON CONFLICT (entry_number) DO NOTHING;

  -- Ferro (17 04 05) — zona AS-01
  INSERT INTO entries (id, org_id, park_id, entry_number, status, client_id,
    vehicle_plate, driver_name, ler_code_id, ler_code,
    gross_weight_kg, tare_weight_kg, net_weight_kg,
    inspection_result, storage_area_id, operator_id, created_at, confirmed_at)
  VALUES
    (v_e[10], v_org_id, v_park_id, v_park_code||'-E-2025-00010', 'confirmed', v_sup_4, '55-MN-22', 'Paulo Vieira', v_ler_ferro,    '17 04 05', 22000, 7000, 15000, 'approved',               v_area_b1, v_user_id, NOW()-INTERVAL'135 days', NOW()-INTERVAL'135 days'),
    (v_e[11], v_org_id, v_park_id, v_park_code||'-E-2025-00011', 'confirmed', v_sup_4, '55-MN-22', 'Paulo Vieira', v_ler_ferro,    '17 04 05', 24500, 7200, 17300, 'approved',               v_area_b1, v_user_id, NOW()-INTERVAL'100 days', NOW()-INTERVAL'100 days'),
    (v_e[12], v_org_id, v_park_id, v_park_code||'-E-2025-00012', 'confirmed', v_sup_1, '66-OP-33', 'Rui Mendes',   v_ler_ferro,    '17 04 05', 20000, 6800, 13200, 'approved_with_divergence',v_area_b1, v_user_id, NOW()-INTERVAL'70 days',  NOW()-INTERVAL'70 days'),
    (v_e[13], v_org_id, v_park_id, v_park_code||'-E-2025-00013', 'confirmed', v_sup_4, '55-MN-22', 'Paulo Vieira', v_ler_ferro,    '17 04 05', 23000, 7100, 15900, 'approved',               v_area_b1, v_user_id, NOW()-INTERVAL'30 days',  NOW()-INTERVAL'30 days')
  ON CONFLICT (entry_number) DO NOTHING;

  -- Vidro (15 01 07) — zona AN-03
  INSERT INTO entries (id, org_id, park_id, entry_number, status, client_id,
    vehicle_plate, driver_name, ler_code_id, ler_code,
    gross_weight_kg, tare_weight_kg, net_weight_kg,
    inspection_result, storage_area_id, operator_id, created_at, confirmed_at)
  VALUES
    (v_e[14], v_org_id, v_park_id, v_park_code||'-E-2025-00014', 'confirmed', v_sup_3, '77-QR-44', 'Marco Pinto',  v_ler_vidro,    '15 01 07', 18000, 6500, 11500, 'approved',               v_area_a3, v_user_id, NOW()-INTERVAL'125 days', NOW()-INTERVAL'125 days'),
    (v_e[15], v_org_id, v_park_id, v_park_code||'-E-2025-00015', 'confirmed', v_sup_3, '77-QR-44', 'Marco Pinto',  v_ler_vidro,    '15 01 07', 17500, 6400, 11100, 'approved',               v_area_a3, v_user_id, NOW()-INTERVAL'80 days',  NOW()-INTERVAL'80 days'),
    (v_e[16], v_org_id, v_park_id, v_park_code||'-E-2025-00016', 'confirmed', v_sup_2, '88-ST-55', 'Sara Fonseca', v_ler_vidro,    '15 01 07', 19000, 6600, 12400, 'approved',               v_area_a3, v_user_id, NOW()-INTERVAL'35 days',  NOW()-INTERVAL'35 days')
  ON CONFLICT (entry_number) DO NOTHING;

  -- Recent entries (last 2 weeks)
  INSERT INTO entries (id, org_id, park_id, entry_number, status, client_id,
    vehicle_plate, driver_name, ler_code_id, ler_code,
    gross_weight_kg, tare_weight_kg, net_weight_kg,
    inspection_result, storage_area_id, operator_id, created_at, confirmed_at)
  VALUES
    (v_e[17], v_org_id, v_park_id, v_park_code||'-E-2026-00001', 'confirmed', v_sup_1, '00-AB-12', 'Rui Mendes',   v_ler_papel,    '15 01 01', 15500, 5900,  9600, 'approved',               v_area_a1, v_user_id, NOW()-INTERVAL'12 days', NOW()-INTERVAL'12 days'),
    (v_e[18], v_org_id, v_park_id, v_park_code||'-E-2026-00002', 'confirmed', v_sup_2, '33-IJ-90', 'Sara Fonseca', v_ler_plastico, '15 01 02', 12500, 5500,  7000, 'approved',               v_area_a2, v_user_id, NOW()-INTERVAL'7 days',  NOW()-INTERVAL'7 days'),
    (v_e[19], v_org_id, v_park_id, v_park_code||'-E-2026-00003', 'confirmed', v_sup_4, '55-MN-22', 'Paulo Vieira', v_ler_ferro,    '17 04 05', 25000, 7400, 17600, 'approved',               v_area_b1, v_user_id, NOW()-INTERVAL'3 days',  NOW()-INTERVAL'3 days'),
    (v_e[20], v_org_id, v_park_id, v_park_code||'-E-2026-00004', 'confirmed', v_sup_3, '22-GH-78', 'Marco Pinto',  v_ler_papel,    '15 01 01', 14800, 5800,  9000, 'approved_with_divergence',v_area_a1, v_user_id, NOW()-INTERVAL'1 day',  NOW()-INTERVAL'1 day')
  ON CONFLICT (entry_number) DO NOTHING;

  -- ============================================================
  -- STOCK MOVEMENTS
  -- ============================================================
  INSERT INTO stock_movements (org_id, park_id, area_id, ler_code_id, ler_code,
    movement_type, quantity_kg, balance_after_kg, entry_id, created_at)
  VALUES
    (v_org_id, v_park_id, v_area_a1, v_ler_papel,    '15 01 01', 'entry',  8400, 8400,  v_e[1],  NOW()-INTERVAL'150 days'),
    (v_org_id, v_park_id, v_area_a1, v_ler_papel,    '15 01 01', 'entry',  9100, 17500, v_e[2],  NOW()-INTERVAL'120 days'),
    (v_org_id, v_park_id, v_area_a1, v_ler_papel,    '15 01 01', 'entry',  8100, 25600, v_e[3],  NOW()-INTERVAL'105 days'),
    (v_org_id, v_park_id, v_area_a1, v_ler_papel,    '15 01 01', 'entry', 10200, 35800, v_e[4],  NOW()-INTERVAL'90 days'),
    (v_org_id, v_park_id, v_area_a1, v_ler_papel,    '15 01 01', 'entry',  8700, 44500, v_e[5],  NOW()-INTERVAL'60 days'),
    (v_org_id, v_park_id, v_area_a2, v_ler_plastico, '15 01 02', 'entry',  5800,  5800, v_e[6],  NOW()-INTERVAL'140 days'),
    (v_org_id, v_park_id, v_area_a2, v_ler_plastico, '15 01 02', 'entry',  5400, 11200, v_e[7],  NOW()-INTERVAL'110 days'),
    (v_org_id, v_park_id, v_area_a2, v_ler_plastico, '15 01 02', 'entry',  6600, 17800, v_e[8],  NOW()-INTERVAL'85 days'),
    (v_org_id, v_park_id, v_area_a2, v_ler_plastico, '15 01 02', 'entry',  6500, 24300, v_e[9],  NOW()-INTERVAL'40 days'),
    (v_org_id, v_park_id, v_area_b1, v_ler_ferro,    '17 04 05', 'entry', 15000, 15000, v_e[10], NOW()-INTERVAL'135 days'),
    (v_org_id, v_park_id, v_area_b1, v_ler_ferro,    '17 04 05', 'entry', 17300, 32300, v_e[11], NOW()-INTERVAL'100 days'),
    (v_org_id, v_park_id, v_area_b1, v_ler_ferro,    '17 04 05', 'entry', 13200, 45500, v_e[12], NOW()-INTERVAL'70 days'),
    (v_org_id, v_park_id, v_area_b1, v_ler_ferro,    '17 04 05', 'entry', 15900, 61400, v_e[13], NOW()-INTERVAL'30 days'),
    (v_org_id, v_park_id, v_area_a3, v_ler_vidro,    '15 01 07', 'entry', 11500, 11500, v_e[14], NOW()-INTERVAL'125 days'),
    (v_org_id, v_park_id, v_area_a3, v_ler_vidro,    '15 01 07', 'entry', 11100, 22600, v_e[15], NOW()-INTERVAL'80 days'),
    (v_org_id, v_park_id, v_area_a3, v_ler_vidro,    '15 01 07', 'entry', 12400, 35000, v_e[16], NOW()-INTERVAL'35 days'),
    (v_org_id, v_park_id, v_area_a1, v_ler_papel,    '15 01 01', 'entry',  9600, 54100, v_e[17], NOW()-INTERVAL'12 days'),
    (v_org_id, v_park_id, v_area_a2, v_ler_plastico, '15 01 02', 'entry',  7000, 31300, v_e[18], NOW()-INTERVAL'7 days'),
    (v_org_id, v_park_id, v_area_b1, v_ler_ferro,    '17 04 05', 'entry', 17600, 79000, v_e[19], NOW()-INTERVAL'3 days'),
    (v_org_id, v_park_id, v_area_a1, v_ler_papel,    '15 01 01', 'entry',  9000, 63100, v_e[20], NOW()-INTERVAL'1 day')
  ;

  -- ============================================================
  -- LOTS
  -- ============================================================
  v_lot_1 := gen_random_uuid();
  v_lot_2 := gen_random_uuid();
  v_lot_3 := gen_random_uuid();
  v_lot_4 := gen_random_uuid();
  v_lot_5 := gen_random_uuid();

  INSERT INTO lots (id, org_id, park_id, lot_number, status,
    allowed_ler_codes, allowed_ler_code_ids,
    raw_grade, total_input_kg, opened_at, created_by)
  VALUES
    (v_lot_1, v_org_id, v_park_id, v_park_code||'-L-2026-0001', 'open',
     ARRAY['15 01 01'], ARRAY[v_ler_papel]::UUID[],
     3.85, 63100, NOW()-INTERVAL'90 days', v_user_id),
    (v_lot_2, v_org_id, v_park_id, v_park_code||'-L-2026-0002', 'open',
     ARRAY['15 01 02'], ARRAY[v_ler_plastico]::UUID[],
     3.28, 31300, NOW()-INTERVAL'60 days', v_user_id),
    (v_lot_3, v_org_id, v_park_id, v_park_code||'-L-2025-0003', 'in_treatment',
     ARRAY['17 04 05'], ARRAY[v_ler_ferro]::UUID[],
     4.22, 79000, NOW()-INTERVAL'100 days', v_user_id),
    (v_lot_4, v_org_id, v_park_id, v_park_code||'-L-2025-0001', 'closed',
     ARRAY['15 01 01'], ARRAY[v_ler_papel]::UUID[],
     4.00, 22600, NOW()-INTERVAL'170 days', v_user_id),
    (v_lot_5, v_org_id, v_park_id, v_park_code||'-L-2025-0002', 'closed',
     ARRAY['15 01 07'], ARRAY[v_ler_vidro]::UUID[],
     3.10, 35000, NOW()-INTERVAL'140 days', v_user_id)
  ON CONFLICT (park_id, lot_number) DO NOTHING;

  SELECT id INTO v_lot_1 FROM lots WHERE park_id = v_park_id AND lot_number = v_park_code||'-L-2026-0001';
  SELECT id INTO v_lot_2 FROM lots WHERE park_id = v_park_id AND lot_number = v_park_code||'-L-2026-0002';
  SELECT id INTO v_lot_3 FROM lots WHERE park_id = v_park_id AND lot_number = v_park_code||'-L-2025-0003';
  SELECT id INTO v_lot_4 FROM lots WHERE park_id = v_park_id AND lot_number = v_park_code||'-L-2025-0001';
  SELECT id INTO v_lot_5 FROM lots WHERE park_id = v_park_id AND lot_number = v_park_code||'-L-2025-0002';

  -- Finalize closed lots
  UPDATE lots SET
    transformed_grade = 3.90, yield_rate = 82.5, lot_quality_index = 3.87, lqi_grade = 'B',
    total_output_kg = 18645, closed_at = NOW()-INTERVAL'130 days',
    treatment_started_at = NOW()-INTERVAL'155 days'
  WHERE id = v_lot_4 AND status = 'closed';

  UPDATE lots SET
    transformed_grade = 2.80, yield_rate = 71.4, lot_quality_index = 2.82, lqi_grade = 'C',
    total_output_kg = 24990, closed_at = NOW()-INTERVAL'95 days',
    treatment_started_at = NOW()-INTERVAL'120 days'
  WHERE id = v_lot_5 AND status = 'closed';

  -- Set treatment start for in_treatment lot
  UPDATE lots SET treatment_started_at = NOW()-INTERVAL'40 days'
  WHERE id = v_lot_3 AND status = 'in_treatment' AND treatment_started_at IS NULL;

  -- ============================================================
  -- LOT ZONES
  -- ============================================================
  INSERT INTO lot_zones (lot_id, zone_id)
  VALUES
    (v_lot_1, v_area_a1),
    (v_lot_2, v_area_a2),
    (v_lot_3, v_area_b1),
    (v_lot_4, v_area_c1),
    (v_lot_5, v_area_a3)
  ON CONFLICT (lot_id, zone_id) DO NOTHING;

  -- Block AS-01 (lot in treatment)
  UPDATE storage_areas
  SET is_blocked     = true,
      blocked_reason = 'Lote '||v_park_code||'-L-2025-0003 em tratamento',
      blocked_at     = NOW()-INTERVAL'40 days',
      blocked_by     = v_user_id
  WHERE id = v_area_b1 AND is_blocked = false;

  -- ============================================================
  -- LOT ENTRIES
  -- ============================================================
  INSERT INTO lot_entries (lot_id, entry_id, contribution_kg, entry_raw_grade)
  VALUES
    (v_lot_1, v_e[1],   8400, 4.0),
    (v_lot_1, v_e[2],   9100, 4.2),
    (v_lot_1, v_e[3],   8100, 3.8),
    (v_lot_1, v_e[4],  10200, 3.2),
    (v_lot_1, v_e[5],   8700, 4.0),
    (v_lot_1, v_e[17],  9600, 4.1),
    (v_lot_1, v_e[20],  9000, 3.5),
    (v_lot_2, v_e[6],   5800, 3.4),
    (v_lot_2, v_e[7],   5400, 3.4),
    (v_lot_2, v_e[8],   6600, 2.8),
    (v_lot_2, v_e[9],   6500, 3.4),
    (v_lot_2, v_e[18],  7000, 3.4),
    (v_lot_3, v_e[10], 15000, 4.5),
    (v_lot_3, v_e[11], 17300, 4.2),
    (v_lot_3, v_e[12], 13200, 3.8),
    (v_lot_3, v_e[13], 15900, 4.3),
    (v_lot_3, v_e[19], 17600, 4.3),
    (v_lot_4, v_e[14], 11500, 4.0),
    (v_lot_4, v_e[15], 11100, 4.1),
    (v_lot_5, v_e[16], 12400, 3.0)
  ON CONFLICT (lot_id, entry_id) DO NOTHING;

  -- ============================================================
  -- MARKET PRICES — 6 months history
  -- ============================================================
  IF NOT EXISTS (SELECT 1 FROM market_prices WHERE park_id = v_park_id AND ler_code = '15 01 01') THEN
    INSERT INTO market_prices (park_id, ler_code, product_type, price_per_ton, effective_date, source)
    VALUES
      (v_park_id,'15 01 01','Papel/Cartão', 85.00, CURRENT_DATE-INTERVAL'5 months','manual'),
      (v_park_id,'15 01 01','Papel/Cartão', 90.00, CURRENT_DATE-INTERVAL'4 months','manual'),
      (v_park_id,'15 01 01','Papel/Cartão', 88.00, CURRENT_DATE-INTERVAL'3 months','manual'),
      (v_park_id,'15 01 01','Papel/Cartão', 95.00, CURRENT_DATE-INTERVAL'2 months','manual'),
      (v_park_id,'15 01 01','Papel/Cartão',100.00, CURRENT_DATE-INTERVAL'1 month', 'manual'),
      (v_park_id,'15 01 01','Papel/Cartão',105.00, CURRENT_DATE,                   'manual');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM market_prices WHERE park_id = v_park_id AND ler_code = '15 01 02') THEN
    INSERT INTO market_prices (park_id, ler_code, product_type, price_per_ton, effective_date, source)
    VALUES
      (v_park_id,'15 01 02','Plástico Misto', 45.00, CURRENT_DATE-INTERVAL'5 months','manual'),
      (v_park_id,'15 01 02','Plástico Misto', 48.00, CURRENT_DATE-INTERVAL'4 months','manual'),
      (v_park_id,'15 01 02','Plástico Misto', 43.00, CURRENT_DATE-INTERVAL'3 months','manual'),
      (v_park_id,'15 01 02','Plástico Misto', 50.00, CURRENT_DATE-INTERVAL'2 months','manual'),
      (v_park_id,'15 01 02','Plástico Misto', 47.00, CURRENT_DATE-INTERVAL'1 month', 'manual'),
      (v_park_id,'15 01 02','Plástico Misto', 52.00, CURRENT_DATE,                   'manual');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM market_prices WHERE park_id = v_park_id AND ler_code = '17 04 05') THEN
    INSERT INTO market_prices (park_id, ler_code, product_type, price_per_ton, effective_date, source)
    VALUES
      (v_park_id,'17 04 05','Ferro/Aço',200.00, CURRENT_DATE-INTERVAL'5 months','manual'),
      (v_park_id,'17 04 05','Ferro/Aço',195.00, CURRENT_DATE-INTERVAL'4 months','manual'),
      (v_park_id,'17 04 05','Ferro/Aço',205.00, CURRENT_DATE-INTERVAL'3 months','manual'),
      (v_park_id,'17 04 05','Ferro/Aço',198.00, CURRENT_DATE-INTERVAL'2 months','manual'),
      (v_park_id,'17 04 05','Ferro/Aço',210.00, CURRENT_DATE-INTERVAL'1 month', 'manual'),
      (v_park_id,'17 04 05','Ferro/Aço',205.00, CURRENT_DATE,                   'manual');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM market_prices WHERE park_id = v_park_id AND ler_code = '15 01 07') THEN
    INSERT INTO market_prices (park_id, ler_code, product_type, price_per_ton, effective_date, source)
    VALUES
      (v_park_id,'15 01 07','Vidro Misto', 15.00, CURRENT_DATE-INTERVAL'5 months','manual'),
      (v_park_id,'15 01 07','Vidro Misto', 18.00, CURRENT_DATE-INTERVAL'4 months','manual'),
      (v_park_id,'15 01 07','Vidro Misto', 12.00, CURRENT_DATE-INTERVAL'3 months','manual'),
      (v_park_id,'15 01 07','Vidro Misto', 20.00, CURRENT_DATE-INTERVAL'2 months','manual'),
      (v_park_id,'15 01 07','Vidro Misto', 22.00, CURRENT_DATE-INTERVAL'1 month', 'manual'),
      (v_park_id,'15 01 07','Vidro Misto', 25.00, CURRENT_DATE,                   'manual');
  END IF;

  -- ============================================================
  -- SUPPLIER SCORES
  -- ============================================================
  INSERT INTO supplier_scores (org_id, client_id, park_id,
    period_start, period_end,
    lot_count, avg_raw_grade, avg_yield_rate, avg_lqi, score_letter, total_kg)
  VALUES
    (v_org_id, v_sup_1, v_park_id, CURRENT_DATE-90, CURRENT_DATE, 12, 4.10, 88.3, 4.12, 'A', 125000),
    (v_org_id, v_sup_2, v_park_id, CURRENT_DATE-90, CURRENT_DATE,  8, 3.52, 79.4, 3.67, 'B',  82000),
    (v_org_id, v_sup_3, v_park_id, CURRENT_DATE-90, CURRENT_DATE,  6, 3.30, 75.2, 3.41, 'B',  61000),
    (v_org_id, v_sup_4, v_park_id, CURRENT_DATE-90, CURRENT_DATE,  4, 3.02, 68.1, 2.91, 'C',  43000)
  ON CONFLICT (client_id, park_id, period_start, period_end) DO NOTHING;

  -- ============================================================
  -- PRODUCTION CYCLES
  -- ============================================================
  INSERT INTO client_production_cycles (client_id, park_id,
    avg_interval_days, std_dev_days,
    last_entry_date, next_predicted_date,
    entry_count, confidence)
  VALUES
    (v_sup_1, v_park_id, 14.0, 2.1, CURRENT_DATE-12, CURRENT_DATE+2,   18, 0.88),
    (v_sup_2, v_park_id, 21.0, 3.5, CURRENT_DATE-7,  CURRENT_DATE+14,  12, 0.79),
    (v_sup_3, v_park_id, 30.0, 5.2, CURRENT_DATE-34, CURRENT_DATE-4,    9, 0.72),
    (v_sup_4, v_park_id, 45.0, 6.8, CURRENT_DATE-3,  CURRENT_DATE+21,   7, 0.65)
  ON CONFLICT (client_id, park_id) DO NOTHING;

  -- ============================================================
  -- NON-CONFORMITIES
  -- ============================================================
  INSERT INTO non_conformities (id, org_id, park_id, nc_number,
    nc_type, severity, status, title, description, entry_id, reported_by, created_at)
  VALUES
    (gen_random_uuid(), v_org_id, v_park_id, v_park_code||'-NC-2026-0001',
     'contamination', 'high', 'open',
     'Contaminação detetada em carga de plástico',
     'Carga da entrada 00008 (EcoMat) apresentou contaminação por materiais não recicláveis (~8%). Lote AN-02 pode estar comprometido.',
     v_e[8], v_user_id, NOW()-INTERVAL'5 days'),
    (gen_random_uuid(), v_org_id, v_park_id, v_park_code||'-NC-2026-0002',
     'weight_discrepancy', 'medium', 'investigating',
     'Discrepância de peso — entrada 00019',
     'Diferença de 480 kg entre peso declarado no e-GAR (18.080 kg) e peso real medido em báscula (17.600 kg). Em investigação com transportador.',
     v_e[19], v_user_id, NOW()-INTERVAL'2 days')
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- EXITS (delivery requests)
  -- ============================================================
  INSERT INTO delivery_requests (id, org_id, park_id, request_number,
    exit_type, status, client_id,
    destination_name, destination_nif, destination_address,
    vehicle_plate, driver_name, planned_date, total_weight_kg, operator_id, created_at)
  VALUES
    (gen_random_uuid(), v_org_id, v_park_id, v_park_code||'-S-2026-0001',
     'client', 'delivered', v_buy_1,
     'Papelaria Industrial, Lda','505678901','Rua Industrial, 45, Setúbal',
     '99-UV-66','Álvaro Cruz', CURRENT_DATE-20, 17850, v_user_id, NOW()-INTERVAL'22 days'),
    (gen_random_uuid(), v_org_id, v_park_id, v_park_code||'-S-2026-0002',
     'client', 'planned', v_buy_2,
     'Sucata Metais Lisboa, Lda','506789012','Av. Metalúrgica, 12, Lisboa',
     NULL, NULL, CURRENT_DATE+5, 22000, v_user_id, NOW()-INTERVAL'1 day')
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_exit_1 FROM delivery_requests WHERE park_id = v_park_id AND request_number = v_park_code||'-S-2026-0001';
  SELECT id INTO v_exit_2 FROM delivery_requests WHERE park_id = v_park_id AND request_number = v_park_code||'-S-2026-0002';

  INSERT INTO delivery_lines (request_id, ler_code_id, ler_code, source_area_id, planned_weight_kg, actual_weight_kg)
  VALUES
    (v_exit_1, v_ler_papel, '15 01 01', v_area_a1, 18000, 17850),
    (v_exit_2, v_ler_ferro, '17 04 05', v_area_b1, 22000, NULL)
  ;

  -- Stock movement for delivered exit
  INSERT INTO stock_movements (org_id, park_id, area_id, ler_code_id, ler_code,
    movement_type, quantity_kg, balance_after_kg, delivery_request_id, created_at)
  VALUES
    (v_org_id, v_park_id, v_area_a1, v_ler_papel, '15 01 01',
     'exit', -17850, 45250, v_exit_1, NOW()-INTERVAL'20 days')
  ;

  -- ============================================================
  -- REFRESH MATERIALIZED VIEW
  -- ============================================================
  REFRESH MATERIALIZED VIEW CONCURRENTLY current_stock;

  RAISE NOTICE '✓ Seed concluído — org=% park=% (%)', v_org_id, v_park_id, v_park_code;

END $$;
