import { createClient } from '@supabase/supabase-js';

// Run with: node --env-file=.env.local scripts/run-seed.mjs
// Requires in .env.local: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
  console.error('Run with: node --env-file=.env.local scripts/run-seed.mjs');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

function daysAgo(n) {
  return new Date(Date.now() - n * 86400000).toISOString();
}
function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}
function todayOffset(n = 0) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

async function q(label, fn) {
  const { data, error } = await fn();
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

async function main() {
  // ── Core entities ───────────────────────────────────────────────
  const [org] = await q('org', () => sb.from('organizations').select('id').limit(1));
  const [park] = await q('park', () => sb.from('parks').select('id, code').limit(1));
  const [profile] = await q('profile', () => sb.from('profiles').select('id').limit(1));

  const orgId = org.id;
  const parkId = park.id;
  const parkCode = park.code;
  const userId = profile.id;
  console.log(`✓ Park: ${parkCode} (${parkId})`);

  // ── LER codes ───────────────────────────────────────────────────
  const lerRows = await q('ler_codes', () =>
    sb.from('ler_codes').select('id, code').in('code', ['15 01 01', '15 01 02', '15 01 07', '17 04 05'])
  );
  const ler = Object.fromEntries(lerRows.map(r => [r.code, r.id]));
  if (!ler['15 01 01']) throw new Error('LER codes missing from ler_codes table');
  console.log('✓ LER codes found');

  // ── LER authorizations ──────────────────────────────────────────
  const { error: authErr } = await sb.from('park_ler_authorizations').upsert([
    { park_id: parkId, ler_code_id: ler['15 01 01'], operation_type: 'reception' },
    { park_id: parkId, ler_code_id: ler['15 01 01'], operation_type: 'treatment' },
    { park_id: parkId, ler_code_id: ler['15 01 02'], operation_type: 'reception' },
    { park_id: parkId, ler_code_id: ler['15 01 02'], operation_type: 'treatment' },
    { park_id: parkId, ler_code_id: ler['15 01 07'], operation_type: 'reception' },
    { park_id: parkId, ler_code_id: ler['17 04 05'], operation_type: 'reception' },
    { park_id: parkId, ler_code_id: ler['17 04 05'], operation_type: 'treatment' },
  ], { onConflict: 'park_id,ler_code_id,operation_type', ignoreDuplicates: true });
  if (authErr) console.warn('  LER auth:', authErr.message);
  console.log('✓ LER authorizations');

  // ── Area groups ─────────────────────────────────────────────────
  const { error: grpErr } = await sb.from('area_groups').upsert([
    { park_id: parkId, name: 'Armazém Norte', code: 'AN', description: 'Zona de recepção e triagem de recicláveis' },
    { park_id: parkId, name: 'Armazém Sul',   code: 'AS', description: 'Zona de tratamento e expedição' },
  ], { onConflict: 'park_id,code', ignoreDuplicates: true });
  if (grpErr) console.warn('  Area groups:', grpErr.message);
  const grpRows = await q('groups', () => sb.from('area_groups').select('id, code').eq('park_id', parkId).in('code', ['AN','AS']));
  const grp = Object.fromEntries(grpRows.map(g => [g.code, g.id]));
  console.log('✓ Area groups');

  // ── Storage areas ───────────────────────────────────────────────
  const { error: areaErr } = await sb.from('storage_areas').upsert([
    { park_id: parkId, area_group_id: grp['AN'], code: 'AN-01', name: 'Zona Papel/Cartão',     area_type: 'warehouse',    capacity_kg: 50000 },
    { park_id: parkId, area_group_id: grp['AN'], code: 'AN-02', name: 'Zona Plástico',          area_type: 'warehouse',    capacity_kg: 30000 },
    { park_id: parkId, area_group_id: grp['AN'], code: 'AN-03', name: 'Zona Vidro',             area_type: 'warehouse',    capacity_kg: 40000 },
    { park_id: parkId, area_group_id: grp['AS'], code: 'AS-01', name: 'Zona Ferro/Metais',      area_type: 'physical',     capacity_kg: 80000 },
    { park_id: parkId, area_group_id: grp['AS'], code: 'AS-02', name: 'Zona PVC/Plástico Duro', area_type: 'physical',     capacity_kg: 25000 },
    { park_id: parkId, area_group_id: grp['AS'], code: 'AS-03', name: 'Linha de Triagem 1',     area_type: 'sorting_line', capacity_kg: 20000 },
  ], { onConflict: 'park_id,code', ignoreDuplicates: true });
  if (areaErr) console.warn('  Storage areas:', areaErr.message);
  const areaRows = await q('areas', () =>
    sb.from('storage_areas').select('id, code').eq('park_id', parkId)
      .in('code', ['AN-01','AN-02','AN-03','AS-01','AS-02','AS-03'])
  );
  const area = Object.fromEntries(areaRows.map(a => [a.code, a.id]));
  console.log('✓ Storage areas');

  // ── Clients ─────────────────────────────────────────────────────
  const existingClients = await q('clients check', () =>
    sb.from('clients').select('id, nif').eq('org_id', orgId)
      .in('nif', ['501234567','502345678','503456789','504567890','505678901','506789012'])
  );
  const existingNifs = new Set(existingClients.map(c => c.nif));
  const allClients = [
    { org_id: orgId, name: 'Reciclagem do Norte, Lda',     nif: '501234567', client_type: 'supplier', city: 'Braga',   phone: '+351 253 100 200', email: 'geral@recnorte.pt',     contact_person: 'António Silva', payment_terms_days: 30 },
    { org_id: orgId, name: 'EcoMat Portugal, SA',           nif: '502345678', client_type: 'supplier', city: 'Porto',   phone: '+351 222 300 400', email: 'info@ecomat.pt',         contact_person: 'Maria Santos',  payment_terms_days: 45 },
    { org_id: orgId, name: 'Indústrias Verde, SA',          nif: '503456789', client_type: 'both',     city: 'Lisboa',  phone: '+351 212 500 600', email: 'verde@iverde.pt',        contact_person: 'João Ferreira', payment_terms_days: 30 },
    { org_id: orgId, name: 'Gestão Resíduos Alentejo, Lda', nif: '504567890', client_type: 'supplier', city: 'Évora',   phone: '+351 266 700 800', email: 'gra@gralentejo.pt',     contact_person: 'Ana Costa',     payment_terms_days: 60 },
    { org_id: orgId, name: 'Papelaria Industrial, Lda',     nif: '505678901', client_type: 'buyer',    city: 'Setúbal', phone: '+351 265 100 200', email: 'compras@papelind.pt',   contact_person: 'Carlos Neves',  payment_terms_days: 30 },
    { org_id: orgId, name: 'Sucata Metais Lisboa, Lda',     nif: '506789012', client_type: 'buyer',    city: 'Lisboa',  phone: '+351 218 200 300', email: 'metal@sucatalisboa.pt', contact_person: 'Pedro Gomes',   payment_terms_days: 30 },
  ];
  const toInsert = allClients.filter(c => !existingNifs.has(c.nif));
  if (toInsert.length) {
    const { error: cliErr } = await sb.from('clients').insert(toInsert);
    if (cliErr) console.warn('  Clients insert:', cliErr.message);
  }
  const clientRows = await q('clients', () =>
    sb.from('clients').select('id, nif').eq('org_id', orgId)
      .in('nif', ['501234567','502345678','503456789','504567890','505678901','506789012'])
  );
  const cMap = Object.fromEntries(clientRows.map(c => [c.nif, c.id]));
  const [sup1, sup2, sup3, sup4, buy1, buy2] = ['501234567','502345678','503456789','504567890','505678901','506789012'].map(n => cMap[n]);
  if (!sup1) throw new Error('Clients not found after insert');
  console.log('✓ Clients (6)');

  // ── Client-park associations ─────────────────────────────────────
  const { error: assocErr } = await sb.from('client_park_associations').upsert(
    [sup1,sup2,sup3,sup4,buy1,buy2].map(id => ({ client_id: id, park_id: parkId })),
    { onConflict: 'client_id,park_id', ignoreDuplicates: true }
  );
  if (assocErr) console.warn('  Associations:', assocErr.message);
  console.log('✓ Client-park associations');

  // ── Entries ─────────────────────────────────────────────────────
  const entryDefs = [
    // num, client, plate, driver, lerCode, gross, tare, net, result, areaCode, daysAgo
    ['2025-00001',sup1,'00-AB-12','Rui Mendes',   '15 01 01',14200,5800, 8400,'approved',               'AN-01',150],
    ['2025-00002',sup1,'00-AB-12','Rui Mendes',   '15 01 01',15000,5900, 9100,'approved',               'AN-01',120],
    ['2025-00003',sup2,'11-EF-56','José Lima',    '15 01 01',13800,5700, 8100,'approved',               'AN-01',105],
    ['2025-00004',sup1,'00-AB-12','Rui Mendes',   '15 01 01',16200,6000,10200,'approved_with_divergence','AN-01',90],
    ['2025-00005',sup3,'22-GH-78','Marco Pinto',  '15 01 01',14500,5800, 8700,'approved',               'AN-01',60],
    ['2025-00006',sup2,'33-IJ-90','Sara Fonseca', '15 01 02',11000,5200, 5800,'approved',               'AN-02',140],
    ['2025-00007',sup2,'33-IJ-90','Sara Fonseca', '15 01 02',10500,5100, 5400,'approved',               'AN-02',110],
    ['2025-00008',sup3,'44-KL-11','Marco Pinto',  '15 01 02',12000,5400, 6600,'approved_with_divergence','AN-02',85],
    ['2025-00009',sup2,'33-IJ-90','Sara Fonseca', '15 01 02',11800,5300, 6500,'approved',               'AN-02',40],
    ['2025-00010',sup4,'55-MN-22','Paulo Vieira', '17 04 05',22000,7000,15000,'approved',               'AS-01',135],
    ['2025-00011',sup4,'55-MN-22','Paulo Vieira', '17 04 05',24500,7200,17300,'approved',               'AS-01',100],
    ['2025-00012',sup1,'66-OP-33','Rui Mendes',   '17 04 05',20000,6800,13200,'approved_with_divergence','AS-01',70],
    ['2025-00013',sup4,'55-MN-22','Paulo Vieira', '17 04 05',23000,7100,15900,'approved',               'AS-01',30],
    ['2025-00014',sup3,'77-QR-44','Marco Pinto',  '15 01 07',18000,6500,11500,'approved',               'AN-03',125],
    ['2025-00015',sup3,'77-QR-44','Marco Pinto',  '15 01 07',17500,6400,11100,'approved',               'AN-03',80],
    ['2025-00016',sup2,'88-ST-55','Sara Fonseca', '15 01 07',19000,6600,12400,'approved',               'AN-03',35],
    ['2026-00001',sup1,'00-AB-12','Rui Mendes',   '15 01 01',15500,5900, 9600,'approved',               'AN-01',12],
    ['2026-00002',sup2,'33-IJ-90','Sara Fonseca', '15 01 02',12500,5500, 7000,'approved',               'AN-02',7],
    ['2026-00003',sup4,'55-MN-22','Paulo Vieira', '17 04 05',25000,7400,17600,'approved',               'AS-01',3],
    ['2026-00004',sup3,'22-GH-78','Marco Pinto',  '15 01 01',14800,5800, 9000,'approved_with_divergence','AN-01',1],
  ];

  const entryNums = entryDefs.map(([num]) => `${parkCode}-E-${num}`);
  const existingEntries = await q('entries check', () =>
    sb.from('entries').select('entry_number').eq('park_id', parkId).in('entry_number', entryNums)
  );
  const existingEntryNums = new Set(existingEntries.map(e => e.entry_number));
  const entriesToInsert = entryDefs
    .filter(([num]) => !existingEntryNums.has(`${parkCode}-E-${num}`))
    .map(([num, clientId, plate, driver, lerCode, gross, tare, net, result, areaCode, ago]) => ({
      org_id: orgId, park_id: parkId,
      entry_number: `${parkCode}-E-${num}`,
      status: 'confirmed',
      client_id: clientId,
      vehicle_plate: plate,
      driver_name: driver,
      ler_code_id: ler[lerCode],
      ler_code: lerCode,
      gross_weight_kg: gross, tare_weight_kg: tare, net_weight_kg: net,
      inspection_result: result,
      storage_area_id: area[areaCode],
      operator_id: userId,
      created_at: daysAgo(ago),
      confirmed_at: daysAgo(ago),
    }));

  if (entriesToInsert.length) {
    const { error: entErr } = await sb.from('entries').insert(entriesToInsert);
    if (entErr) throw new Error('Entries: ' + entErr.message);
    console.log(`✓ Entries inserted (${entriesToInsert.length})`);
  } else {
    console.log('  Entries already exist, skipping');
  }

  // Fetch all entry IDs by number
  const allEntryRows = await q('all entries', () =>
    sb.from('entries').select('id, entry_number').eq('park_id', parkId).in('entry_number', entryNums)
  );
  const eByNum = Object.fromEntries(allEntryRows.map(e => [e.entry_number.replace(`${parkCode}-E-`, ''), e.id]));
  const e = (suffix) => eByNum[suffix];

  // ── Stock movements ──────────────────────────────────────────────
  const { count: stockCount } = await sb.from('stock_movements').select('id', { count: 'exact', head: true }).eq('park_id', parkId);
  if (!stockCount) {
    const { error: smErr } = await sb.from('stock_movements').insert([
      { org_id: orgId, park_id: parkId, area_id: area['AN-01'], ler_code_id: ler['15 01 01'], ler_code: '15 01 01', movement_type: 'entry', quantity_kg:  8400, balance_after_kg:  8400, entry_id: e('2025-00001'), created_at: daysAgo(150) },
      { org_id: orgId, park_id: parkId, area_id: area['AN-01'], ler_code_id: ler['15 01 01'], ler_code: '15 01 01', movement_type: 'entry', quantity_kg:  9100, balance_after_kg: 17500, entry_id: e('2025-00002'), created_at: daysAgo(120) },
      { org_id: orgId, park_id: parkId, area_id: area['AN-01'], ler_code_id: ler['15 01 01'], ler_code: '15 01 01', movement_type: 'entry', quantity_kg:  8100, balance_after_kg: 25600, entry_id: e('2025-00003'), created_at: daysAgo(105) },
      { org_id: orgId, park_id: parkId, area_id: area['AN-01'], ler_code_id: ler['15 01 01'], ler_code: '15 01 01', movement_type: 'entry', quantity_kg: 10200, balance_after_kg: 35800, entry_id: e('2025-00004'), created_at: daysAgo(90) },
      { org_id: orgId, park_id: parkId, area_id: area['AN-01'], ler_code_id: ler['15 01 01'], ler_code: '15 01 01', movement_type: 'entry', quantity_kg:  8700, balance_after_kg: 44500, entry_id: e('2025-00005'), created_at: daysAgo(60) },
      { org_id: orgId, park_id: parkId, area_id: area['AN-02'], ler_code_id: ler['15 01 02'], ler_code: '15 01 02', movement_type: 'entry', quantity_kg:  5800, balance_after_kg:  5800, entry_id: e('2025-00006'), created_at: daysAgo(140) },
      { org_id: orgId, park_id: parkId, area_id: area['AN-02'], ler_code_id: ler['15 01 02'], ler_code: '15 01 02', movement_type: 'entry', quantity_kg:  5400, balance_after_kg: 11200, entry_id: e('2025-00007'), created_at: daysAgo(110) },
      { org_id: orgId, park_id: parkId, area_id: area['AN-02'], ler_code_id: ler['15 01 02'], ler_code: '15 01 02', movement_type: 'entry', quantity_kg:  6600, balance_after_kg: 17800, entry_id: e('2025-00008'), created_at: daysAgo(85) },
      { org_id: orgId, park_id: parkId, area_id: area['AN-02'], ler_code_id: ler['15 01 02'], ler_code: '15 01 02', movement_type: 'entry', quantity_kg:  6500, balance_after_kg: 24300, entry_id: e('2025-00009'), created_at: daysAgo(40) },
      { org_id: orgId, park_id: parkId, area_id: area['AS-01'], ler_code_id: ler['17 04 05'], ler_code: '17 04 05', movement_type: 'entry', quantity_kg: 15000, balance_after_kg: 15000, entry_id: e('2025-00010'), created_at: daysAgo(135) },
      { org_id: orgId, park_id: parkId, area_id: area['AS-01'], ler_code_id: ler['17 04 05'], ler_code: '17 04 05', movement_type: 'entry', quantity_kg: 17300, balance_after_kg: 32300, entry_id: e('2025-00011'), created_at: daysAgo(100) },
      { org_id: orgId, park_id: parkId, area_id: area['AS-01'], ler_code_id: ler['17 04 05'], ler_code: '17 04 05', movement_type: 'entry', quantity_kg: 13200, balance_after_kg: 45500, entry_id: e('2025-00012'), created_at: daysAgo(70) },
      { org_id: orgId, park_id: parkId, area_id: area['AS-01'], ler_code_id: ler['17 04 05'], ler_code: '17 04 05', movement_type: 'entry', quantity_kg: 15900, balance_after_kg: 61400, entry_id: e('2025-00013'), created_at: daysAgo(30) },
      { org_id: orgId, park_id: parkId, area_id: area['AN-03'], ler_code_id: ler['15 01 07'], ler_code: '15 01 07', movement_type: 'entry', quantity_kg: 11500, balance_after_kg: 11500, entry_id: e('2025-00014'), created_at: daysAgo(125) },
      { org_id: orgId, park_id: parkId, area_id: area['AN-03'], ler_code_id: ler['15 01 07'], ler_code: '15 01 07', movement_type: 'entry', quantity_kg: 11100, balance_after_kg: 22600, entry_id: e('2025-00015'), created_at: daysAgo(80) },
      { org_id: orgId, park_id: parkId, area_id: area['AN-03'], ler_code_id: ler['15 01 07'], ler_code: '15 01 07', movement_type: 'entry', quantity_kg: 12400, balance_after_kg: 35000, entry_id: e('2025-00016'), created_at: daysAgo(35) },
      { org_id: orgId, park_id: parkId, area_id: area['AN-01'], ler_code_id: ler['15 01 01'], ler_code: '15 01 01', movement_type: 'entry', quantity_kg:  9600, balance_after_kg: 54100, entry_id: e('2026-00001'), created_at: daysAgo(12) },
      { org_id: orgId, park_id: parkId, area_id: area['AN-02'], ler_code_id: ler['15 01 02'], ler_code: '15 01 02', movement_type: 'entry', quantity_kg:  7000, balance_after_kg: 31300, entry_id: e('2026-00002'), created_at: daysAgo(7) },
      { org_id: orgId, park_id: parkId, area_id: area['AS-01'], ler_code_id: ler['17 04 05'], ler_code: '17 04 05', movement_type: 'entry', quantity_kg: 17600, balance_after_kg: 79000, entry_id: e('2026-00003'), created_at: daysAgo(3) },
      { org_id: orgId, park_id: parkId, area_id: area['AN-01'], ler_code_id: ler['15 01 01'], ler_code: '15 01 01', movement_type: 'entry', quantity_kg:  9000, balance_after_kg: 63100, entry_id: e('2026-00004'), created_at: daysAgo(1) },
    ]);
    if (smErr) console.warn('  Stock movements:', smErr.message);
    else console.log('✓ Stock movements (20)');
  } else {
    console.log(`  Stock movements already exist (${stockCount}), skipping`);
  }

  // ── Lots ─────────────────────────────────────────────────────────
  const lotNums = [
    `${parkCode}-L-2026-0001`, `${parkCode}-L-2026-0002`,
    `${parkCode}-L-2025-0003`, `${parkCode}-L-2025-0001`, `${parkCode}-L-2025-0002`,
  ];
  const { error: lotErr } = await sb.from('lots').upsert([
    { org_id: orgId, park_id: parkId, lot_number: lotNums[0], status: 'open',         allowed_ler_codes: ['15 01 01'], allowed_ler_code_ids: [ler['15 01 01']], raw_grade: 3.85, total_input_kg:  63100, opened_at: daysAgo(90),  created_by: userId },
    { org_id: orgId, park_id: parkId, lot_number: lotNums[1], status: 'open',         allowed_ler_codes: ['15 01 02'], allowed_ler_code_ids: [ler['15 01 02']], raw_grade: 3.28, total_input_kg:  31300, opened_at: daysAgo(60),  created_by: userId },
    { org_id: orgId, park_id: parkId, lot_number: lotNums[2], status: 'in_treatment', allowed_ler_codes: ['17 04 05'], allowed_ler_code_ids: [ler['17 04 05']], raw_grade: 4.22, total_input_kg:  79000, opened_at: daysAgo(100), treatment_started_at: daysAgo(40), created_by: userId },
    { org_id: orgId, park_id: parkId, lot_number: lotNums[3], status: 'closed',       allowed_ler_codes: ['15 01 01'], allowed_ler_code_ids: [ler['15 01 01']], raw_grade: 4.00, total_input_kg:  22600, transformed_grade: 3.90, yield_rate: 82.5, lot_quality_index: 3.87, lqi_grade: 'B', total_output_kg: 18645, opened_at: daysAgo(170), treatment_started_at: daysAgo(155), closed_at: daysAgo(130), created_by: userId },
    { org_id: orgId, park_id: parkId, lot_number: lotNums[4], status: 'closed',       allowed_ler_codes: ['15 01 07'], allowed_ler_code_ids: [ler['15 01 07']], raw_grade: 3.10, total_input_kg:  35000, transformed_grade: 2.80, yield_rate: 71.4, lot_quality_index: 2.82, lqi_grade: 'C', total_output_kg: 24990, opened_at: daysAgo(140), treatment_started_at: daysAgo(120), closed_at: daysAgo(95),  created_by: userId },
  ], { onConflict: 'park_id,lot_number', ignoreDuplicates: true });
  if (lotErr) throw new Error('Lots: ' + lotErr.message);

  const lotRows = await q('lots', () => sb.from('lots').select('id, lot_number').eq('park_id', parkId).in('lot_number', lotNums));
  const lotMap = Object.fromEntries(lotRows.map(l => [l.lot_number, l.id]));
  const [lot1, lot2, lot3, lot4, lot5] = lotNums.map(n => lotMap[n]);
  if (!lot1) throw new Error('Lots not found after insert');
  console.log('✓ Lots (5)');

  // ── Lot zones ─────────────────────────────────────────────────────
  const { error: lzErr } = await sb.from('lot_zones').upsert([
    { lot_id: lot1, zone_id: area['AN-01'] },
    { lot_id: lot2, zone_id: area['AN-02'] },
    { lot_id: lot3, zone_id: area['AS-01'] },
    { lot_id: lot4, zone_id: area['AS-03'] },
    { lot_id: lot5, zone_id: area['AN-03'] },
  ], { onConflict: 'lot_id,zone_id', ignoreDuplicates: true });
  if (lzErr) console.warn('  Lot zones:', lzErr.message);
  console.log('✓ Lot zones');

  // ── Block AS-01 ───────────────────────────────────────────────────
  const [as01] = await q('as01', () => sb.from('storage_areas').select('is_blocked').eq('id', area['AS-01']));
  if (!as01?.is_blocked) {
    await sb.from('storage_areas').update({ is_blocked: true, blocked_reason: `Lote ${lotNums[2]} em tratamento`, blocked_at: daysAgo(40), blocked_by: userId }).eq('id', area['AS-01']);
    console.log('✓ Zone AS-01 blocked');
  }

  // ── Lot entries ───────────────────────────────────────────────────
  const { error: leErr } = await sb.from('lot_entries').upsert([
    { lot_id: lot1, entry_id: e('2025-00001'), contribution_kg:  8400, entry_raw_grade: 4.0 },
    { lot_id: lot1, entry_id: e('2025-00002'), contribution_kg:  9100, entry_raw_grade: 4.2 },
    { lot_id: lot1, entry_id: e('2025-00003'), contribution_kg:  8100, entry_raw_grade: 3.8 },
    { lot_id: lot1, entry_id: e('2025-00004'), contribution_kg: 10200, entry_raw_grade: 3.2 },
    { lot_id: lot1, entry_id: e('2025-00005'), contribution_kg:  8700, entry_raw_grade: 4.0 },
    { lot_id: lot1, entry_id: e('2026-00001'), contribution_kg:  9600, entry_raw_grade: 4.1 },
    { lot_id: lot1, entry_id: e('2026-00004'), contribution_kg:  9000, entry_raw_grade: 3.5 },
    { lot_id: lot2, entry_id: e('2025-00006'), contribution_kg:  5800, entry_raw_grade: 3.4 },
    { lot_id: lot2, entry_id: e('2025-00007'), contribution_kg:  5400, entry_raw_grade: 3.4 },
    { lot_id: lot2, entry_id: e('2025-00008'), contribution_kg:  6600, entry_raw_grade: 2.8 },
    { lot_id: lot2, entry_id: e('2025-00009'), contribution_kg:  6500, entry_raw_grade: 3.4 },
    { lot_id: lot2, entry_id: e('2026-00002'), contribution_kg:  7000, entry_raw_grade: 3.4 },
    { lot_id: lot3, entry_id: e('2025-00010'), contribution_kg: 15000, entry_raw_grade: 4.5 },
    { lot_id: lot3, entry_id: e('2025-00011'), contribution_kg: 17300, entry_raw_grade: 4.2 },
    { lot_id: lot3, entry_id: e('2025-00012'), contribution_kg: 13200, entry_raw_grade: 3.8 },
    { lot_id: lot3, entry_id: e('2025-00013'), contribution_kg: 15900, entry_raw_grade: 4.3 },
    { lot_id: lot3, entry_id: e('2026-00003'), contribution_kg: 17600, entry_raw_grade: 4.3 },
    { lot_id: lot4, entry_id: e('2025-00014'), contribution_kg: 11500, entry_raw_grade: 4.0 },
    { lot_id: lot4, entry_id: e('2025-00015'), contribution_kg: 11100, entry_raw_grade: 4.1 },
    { lot_id: lot5, entry_id: e('2025-00016'), contribution_kg: 12400, entry_raw_grade: 3.0 },
  ], { onConflict: 'lot_id,entry_id', ignoreDuplicates: true });
  if (leErr) console.warn('  Lot entries:', leErr.message);
  console.log('✓ Lot entries (20)');

  // ── Market prices ─────────────────────────────────────────────────
  const { count: mpCount } = await sb.from('market_prices').select('id', { count: 'exact', head: true }).eq('park_id', parkId);
  if (!mpCount) {
    const lerPrices = {
      '15 01 01': { product: 'Papel/Cartão',    prices: [85,90,88,95,100,105] },
      '15 01 02': { product: 'Plástico Misto',  prices: [45,48,43,50,47,52]  },
      '17 04 05': { product: 'Ferro/Aço',       prices: [200,195,205,198,210,205] },
      '15 01 07': { product: 'Vidro Misto',     prices: [15,18,12,20,22,25]  },
    };
    const priceRows = [];
    for (const [code, { product, prices }] of Object.entries(lerPrices)) {
      for (let i = 0; i < 6; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() - (5 - i));
        priceRows.push({ park_id: parkId, ler_code: code, product_type: product, price_per_ton: prices[i], effective_date: d.toISOString().split('T')[0], source: 'manual' });
      }
    }
    const { error: mpErr } = await sb.from('market_prices').insert(priceRows);
    if (mpErr) console.warn('  Market prices:', mpErr.message);
    else console.log('✓ Market prices (24)');
  } else {
    console.log(`  Market prices already exist (${mpCount}), skipping`);
  }

  // ── Supplier scores ────────────────────────────────────────────────
  const { error: ssErr } = await sb.from('supplier_scores').upsert([
    { org_id: orgId, client_id: sup1, park_id: parkId, period_start: todayOffset(-90), period_end: todayOffset(0), lot_count: 12, avg_raw_grade: 4.10, avg_yield_rate: 88.3, avg_lqi: 4.12, score_letter: 'A', total_kg: 125000 },
    { org_id: orgId, client_id: sup2, park_id: parkId, period_start: todayOffset(-90), period_end: todayOffset(0), lot_count:  8, avg_raw_grade: 3.52, avg_yield_rate: 79.4, avg_lqi: 3.67, score_letter: 'B', total_kg:  82000 },
    { org_id: orgId, client_id: sup3, park_id: parkId, period_start: todayOffset(-90), period_end: todayOffset(0), lot_count:  6, avg_raw_grade: 3.30, avg_yield_rate: 75.2, avg_lqi: 3.41, score_letter: 'B', total_kg:  61000 },
    { org_id: orgId, client_id: sup4, park_id: parkId, period_start: todayOffset(-90), period_end: todayOffset(0), lot_count:  4, avg_raw_grade: 3.02, avg_yield_rate: 68.1, avg_lqi: 2.91, score_letter: 'C', total_kg:  43000 },
  ], { onConflict: 'client_id,park_id,period_start,period_end', ignoreDuplicates: true });
  if (ssErr) console.warn('  Supplier scores:', ssErr.message);
  console.log('✓ Supplier scores (4)');

  // ── Production cycles ──────────────────────────────────────────────
  const { error: pcErr } = await sb.from('client_production_cycles').upsert([
    { client_id: sup1, park_id: parkId, avg_interval_days: 14.0, std_dev_days: 2.1, last_entry_date: todayOffset(-12), next_predicted_date: todayOffset(2),  entry_count: 18, confidence: 0.88 },
    { client_id: sup2, park_id: parkId, avg_interval_days: 21.0, std_dev_days: 3.5, last_entry_date: todayOffset(-7),  next_predicted_date: todayOffset(14), entry_count: 12, confidence: 0.79 },
    { client_id: sup3, park_id: parkId, avg_interval_days: 30.0, std_dev_days: 5.2, last_entry_date: todayOffset(-34), next_predicted_date: todayOffset(-4), entry_count:  9, confidence: 0.72 },
    { client_id: sup4, park_id: parkId, avg_interval_days: 45.0, std_dev_days: 6.8, last_entry_date: todayOffset(-3),  next_predicted_date: todayOffset(21), entry_count:  7, confidence: 0.65 },
  ], { onConflict: 'client_id,park_id', ignoreDuplicates: true });
  if (pcErr) console.warn('  Production cycles:', pcErr.message);
  console.log('✓ Production cycles (4) — 1 overdue (Indústrias Verde)');

  // ── Non-conformities ───────────────────────────────────────────────
  const { count: ncCount } = await sb.from('non_conformities').select('id', { count: 'exact', head: true }).eq('park_id', parkId);
  if (!ncCount) {
    const { error: ncErr } = await sb.from('non_conformities').insert([
      { org_id: orgId, park_id: parkId, nc_number: `${parkCode}-NC-2026-0001`, nc_type: 'contamination',      severity: 'high',   status: 'open',          title: 'Contaminação detetada em carga de plástico',  description: 'Carga da entrada 00008 (EcoMat) apresentou contaminação por materiais não recicláveis (~8%). Lote AN-02 pode estar comprometido.', entry_id: e('2025-00008'), reported_by: userId, created_at: daysAgo(5) },
      { org_id: orgId, park_id: parkId, nc_number: `${parkCode}-NC-2026-0002`, nc_type: 'weight_discrepancy', severity: 'medium', status: 'investigating',  title: 'Discrepância de peso — entrada 00019',        description: 'Diferença de 480 kg entre peso declarado no e-GAR (18.080 kg) e peso real medido em báscula (17.600 kg). Em investigação com transportador.',     entry_id: e('2026-00003'), reported_by: userId, created_at: daysAgo(2) },
    ]);
    if (ncErr) console.warn('  Non-conformities:', ncErr.message);
    else console.log('✓ Non-conformities (2)');
  } else {
    console.log(`  Non-conformities already exist (${ncCount}), skipping`);
  }

  // ── Delivery requests + lines ──────────────────────────────────────
  const { count: exitCount } = await sb.from('delivery_requests').select('id', { count: 'exact', head: true }).eq('park_id', parkId);
  if (!exitCount) {
    const exit1Id = crypto.randomUUID();
    const exit2Id = crypto.randomUUID();
    const { error: drErr } = await sb.from('delivery_requests').insert([
      { id: exit1Id, org_id: orgId, park_id: parkId, request_number: `${parkCode}-S-2026-0001`, exit_type: 'client', status: 'delivered', client_id: buy1, destination_name: 'Papelaria Industrial, Lda', destination_nif: '505678901', destination_address: 'Rua Industrial, 45, Setúbal', vehicle_plate: '99-UV-66', driver_name: 'Álvaro Cruz', planned_date: todayOffset(-20), total_weight_kg: 17850, operator_id: userId, created_at: daysAgo(22) },
      { id: exit2Id, org_id: orgId, park_id: parkId, request_number: `${parkCode}-S-2026-0002`, exit_type: 'client', status: 'planned',   client_id: buy2, destination_name: 'Sucata Metais Lisboa, Lda', destination_nif: '506789012', destination_address: 'Av. Metalúrgica, 12, Lisboa', planned_date: todayOffset(5), total_weight_kg: 22000, operator_id: userId, created_at: daysAgo(1) },
    ]);
    if (drErr) { console.warn('  Delivery requests:', drErr.message); }
    else {
      await sb.from('delivery_lines').insert([
        { request_id: exit1Id, ler_code_id: ler['15 01 01'], ler_code: '15 01 01', source_area_id: area['AN-01'], planned_weight_kg: 18000, actual_weight_kg: 17850 },
        { request_id: exit2Id, ler_code_id: ler['17 04 05'], ler_code: '17 04 05', source_area_id: area['AS-01'], planned_weight_kg: 22000 },
      ]);
      await sb.from('stock_movements').insert([
        { org_id: orgId, park_id: parkId, area_id: area['AN-01'], ler_code_id: ler['15 01 01'], ler_code: '15 01 01', movement_type: 'exit', quantity_kg: -17850, balance_after_kg: 45250, delivery_request_id: exit1Id, created_at: daysAgo(20) },
      ]);
      console.log('✓ Delivery requests + lines (2)');
    }
  } else {
    console.log(`  Delivery requests already exist (${exitCount}), skipping`);
  }

  console.log('\n✅ Seed concluído com sucesso!');
  console.log('⚠  Nota: execute no SQL Editor do Supabase para actualizar o stock:');
  console.log('   REFRESH MATERIALIZED VIEW CONCURRENTLY current_stock;');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
