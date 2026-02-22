const { Client } = require("pg");

// Run with: node --env-file=.env.local scripts/seed-demo-data.js
// DATABASE_URL must be set in .env.local, e.g.:
//   DATABASE_URL=postgresql://postgres.ref:password@pooler.supabase.com:6543/postgres
if (!process.env.DATABASE_URL) {
  console.error("ERROR: DATABASE_URL env var is required. Run with: node --env-file=.env.local scripts/seed-demo-data.js");
  process.exit(1);
}

const c = new Client({ connectionString: process.env.DATABASE_URL });

const ORG = "11111111-1111-1111-1111-111111111111";
const PS = "22222222-2222-2222-2222-222222222222";
const SN = "33333333-3333-3333-3333-333333333333";
const USER = "c23d5d77-c603-4bbf-b1d1-bad9173e7750";

const SUP1 = "fc554777-78d1-4515-902a-5e4de4951c99";
const SUP2 = "44843e58-5d78-46a9-a532-001ab530e418";
const BUY1 = "381d6ac1-9282-4d25-8334-2a79a217c209";
const BUY2 = "a56ca964-a1ee-4a19-8c01-2895addb5d7b";
const BOTH = "5845b9a2-d20a-4368-8680-9ffcb21cbc12";

// Areas Setúbal
const A_REC = "6a660b3d-0863-45f9-b183-bb8daa82eaa2";
const A_MF = "d8576651-61d8-44a2-bba4-a87525d12b70";
const A_MNF = "1fb501ce-fda2-4768-8445-b4f41a3e3200";
const A_PAP = "d780cd70-545d-4189-8ff4-3b288c98762b";
const A_PLA = "9322da5a-9527-4e4a-8d5b-e1f5c0449f43";
const A_VID = "fe0f938e-3806-47d8-9b46-4b77e996f3f2";
const A_VFV = "48fb3345-2ec6-4c59-963a-56479f3d74a1";

// Areas Sines
const S_REC = "ae45f81a-a0f3-4e02-bf79-6aeb869358b6";
const S_MET = "c9afe47b-544f-47b6-8b3e-16065685a8c8";
const S_MIS = "9bdbc642-0652-4484-a15f-01a6c43db029";

const LER = {
  papel_emb: "733c441c-e619-4bce-8b0f-2fbe18561c13",
  plast_emb: "284096fd-921c-49dc-a918-fe1b1870aea9",
  metal_emb: "ad78dd54-fb5d-4f7a-8281-2478e7366a14",
  mistas_emb: "0eb67ae8-f34e-4a02-8658-ea8b239e5f3e",
  vidro_emb: "ade54afc-7668-4beb-9e32-7140a4fa1b25",
  vfv_per: "35ab3581-f5a9-4a0e-9f12-e2a0bf29f67e",
  vfv_nper: "04ecf220-e70b-4ec2-ae21-85e6cc7776bc",
  met_ferr: "ab967125-3375-4d1c-9814-4186a27c87b5",
  met_nferr: "614e94f0-3384-485b-9037-abcb9b2c8212",
  ferro_aco: "89d6c1be-0000-42b7-9038-5718236221df",
  papel: "10c13fda-05d5-4736-a222-078eb364ce1e",
  metferr19: "ebe97885-f4a7-4a74-b597-7b8162b4e24c",
  metnferr19: "46258fea-5ec2-4492-add7-e48b929d8e61",
};

async function seed() {
  await c.connect();

  // Clean existing demo data
  await c.query("DELETE FROM stock_movements WHERE org_id = $1", [ORG]);
  await c.query("DELETE FROM classification_sheets WHERE org_id = $1", [ORG]);
  await c.query("DELETE FROM exits WHERE org_id = $1", [ORG]);
  await c.query("DELETE FROM entries WHERE org_id = $1", [ORG]);
  console.log("Cleaned existing data");

  const plates = ["45-AB-12","78-CD-34","12-EF-56","90-GH-78","34-IJ-90","56-KL-12","23-MN-45","67-OP-89","11-QR-22","33-ST-44"];
  const drivers = ["Manuel Silva","António Costa","João Pereira","Carlos Santos","Pedro Oliveira","Miguel Ferreira","Rui Rodrigues","André Martins","Paulo Almeida","Tiago Sousa"];

  const lerChoicesPS = [
    { id: LER.ferro_aco, code: "17 04 05", haz: false, area: A_MF },
    { id: LER.met_ferr, code: "16 01 17", haz: false, area: A_MF },
    { id: LER.met_nferr, code: "16 01 18", haz: false, area: A_MNF },
    { id: LER.papel_emb, code: "15 01 01", haz: false, area: A_PAP },
    { id: LER.plast_emb, code: "15 01 02", haz: false, area: A_PLA },
    { id: LER.vidro_emb, code: "15 01 07", haz: false, area: A_VID },
    { id: LER.vfv_nper, code: "16 01 06", haz: false, area: A_VFV },
    { id: LER.vfv_per, code: "16 01 04*", haz: true, area: A_VFV },
    { id: LER.mistas_emb, code: "15 01 06", haz: false, area: A_REC },
    { id: LER.metal_emb, code: "15 01 04", haz: false, area: A_MF },
  ];

  const lerChoicesSN = [
    { id: LER.ferro_aco, code: "17 04 05", haz: false, area: S_MET },
    { id: LER.met_ferr, code: "16 01 17", haz: false, area: S_MET },
    { id: LER.mistas_emb, code: "15 01 06", haz: false, area: S_MIS },
    { id: LER.papel_emb, code: "15 01 01", haz: false, area: S_REC },
  ];

  const suppliers = [SUP1, SUP2, BOTH];
  const inspections = ["approved", "approved", "approved", "approved_with_divergence", "rejected"];
  const now = new Date();

  // 25 entries for Setúbal
  for (let i = 0; i < 25; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(7 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60));

    const ler = lerChoicesPS[i % lerChoicesPS.length];
    const gross = Math.round(8000 + Math.random() * 32000);
    const tare = Math.round(gross * (0.3 + Math.random() * 0.25));
    const net = gross - tare;
    const insp = inspections[Math.floor(Math.random() * inspections.length)];
    const status = insp === "rejected" ? "cancelled" : "confirmed";
    const seq = String(i + 1).padStart(5, "0");

    await c.query(
      `INSERT INTO entries (org_id, park_id, entry_number, status, vehicle_plate, driver_name, egar_number,
        ler_code_id, ler_code, is_hazardous, gross_weight_kg, tare_weight_kg, net_weight_kg,
        inspection_result, inspection_notes, storage_area_id, client_id, operator_id,
        confirmed_at, cancelled_at, cancellation_reason, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)`,
      [
        ORG, PS, "PS01-E-2026-" + seq, status,
        plates[i % plates.length], drivers[i % drivers.length],
        "eGAR-2026-" + String(100000 + i),
        ler.id, ler.code, ler.haz, gross, tare, net,
        insp,
        insp === "approved_with_divergence" ? "Material com contaminação ligeira" : null,
        ler.area, suppliers[i % suppliers.length], USER,
        status === "confirmed" ? d.toISOString() : null,
        status === "cancelled" ? d.toISOString() : null,
        status === "cancelled" ? "Material rejeitado na inspeção" : null,
        d.toISOString(),
      ]
    );
  }
  console.log("Inserted 25 entries for Setúbal");

  // 8 entries for Sines
  for (let i = 0; i < 8; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(7 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60));

    const ler = lerChoicesSN[i % lerChoicesSN.length];
    const gross = Math.round(8000 + Math.random() * 25000);
    const tare = Math.round(gross * (0.3 + Math.random() * 0.25));
    const net = gross - tare;
    const seq = String(i + 1).padStart(5, "0");

    await c.query(
      `INSERT INTO entries (org_id, park_id, entry_number, status, vehicle_plate, driver_name, egar_number,
        ler_code_id, ler_code, is_hazardous, gross_weight_kg, tare_weight_kg, net_weight_kg,
        inspection_result, storage_area_id, client_id, operator_id, confirmed_at, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
      [
        ORG, SN, "SN01-E-2026-" + seq, "confirmed",
        plates[(i + 5) % plates.length], drivers[(i + 3) % drivers.length],
        "eGAR-2026-" + String(200000 + i),
        ler.id, ler.code, ler.haz, gross, tare, net,
        "approved", ler.area, suppliers[i % suppliers.length], USER,
        d.toISOString(), d.toISOString(),
      ]
    );
  }
  console.log("Inserted 8 entries for Sines");

  // Stock movements from confirmed entries
  const allEntries = await c.query(
    "SELECT id, park_id, net_weight_kg, ler_code_id, ler_code, storage_area_id FROM entries WHERE org_id = $1 AND status = 'confirmed' ORDER BY created_at",
    [ORG]
  );

  for (const ent of allEntries.rows) {
    await c.query(
      `INSERT INTO stock_movements (org_id, park_id, area_id, ler_code_id, ler_code, movement_type, quantity_kg, balance_after_kg, entry_id, operator_id)
       VALUES ($1,$2,$3,$4,$5,'entry',$6,$6,$7,$8)`,
      [ORG, ent.park_id, ent.storage_area_id, ent.ler_code_id, ent.ler_code, ent.net_weight_kg, ent.id, USER]
    );
  }
  console.log("Inserted", allEntries.rows.length, "stock movements");

  // Update storage area stock levels
  await c.query(`
    UPDATE storage_areas sa SET current_stock_kg = COALESCE((
      SELECT SUM(sm.quantity_kg) FROM stock_movements sm WHERE sm.area_id = sa.id AND sm.movement_type = 'entry'
    ), 0)
  `);
  console.log("Updated area stock levels");

  // Classification sheets (10 for Setúbal)
  const confirmedPS = allEntries.rows.filter((e) => e.park_id === PS).slice(0, 10);
  for (let i = 0; i < confirmedPS.length; i++) {
    const ent = confirmedPS[i];
    const outputKg = Math.round(ent.net_weight_kg * (0.85 + Math.random() * 0.1));
    const lossKg = ent.net_weight_kg - outputKg;
    const seq = String(i + 1).padStart(5, "0");
    const status = i < 8 ? "completed" : "in_progress";

    await c.query(
      `INSERT INTO classification_sheets (org_id, park_id, entry_id, sheet_number, status, source_ler_code, source_weight_kg, total_output_kg, loss_kg, operator_id, completed_at, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        ORG, PS, ent.id, "PS01-C-2026-" + seq, status,
        ent.ler_code, ent.net_weight_kg, outputKg, lossKg, USER,
        status === "completed" ? new Date().toISOString() : null,
        status === "completed" ? "Classificação concluída" : "Em processamento",
      ]
    );
  }
  console.log("Inserted 10 classification sheets");

  // Exits (6 for Setúbal, 2 for Sines)
  const exitData = [
    { park: PS, kg: 12500, days: 5 },
    { park: PS, kg: 8200, days: 8 },
    { park: PS, kg: 4300, days: 3 },
    { park: PS, kg: 6700, days: 12 },
    { park: PS, kg: 3100, days: 2 },
    { park: PS, kg: 15800, days: 1 },
    { park: SN, kg: 9400, days: 7 },
    { park: SN, kg: 5600, days: 4 },
  ];

  for (let i = 0; i < exitData.length; i++) {
    const ex = exitData[i];
    const d = new Date(now);
    d.setDate(d.getDate() - ex.days);
    const gross = ex.kg + Math.round(ex.kg * 0.4);
    const tare = gross - ex.kg;
    const parkCode = ex.park === PS ? "PS01" : "SN01";
    const seq = String(i + 1).padStart(5, "0");

    await c.query(
      `INSERT INTO exits (org_id, park_id, exit_number, egar_number, gross_weight_kg, tare_weight_kg, net_weight_kg, guide_number, guide_date, confirmed_at, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        ORG, ex.park, parkCode + "-S-2026-" + seq,
        "eGAR-S-2026-" + String(300000 + i),
        gross, tare, ex.kg,
        "GR-2026-" + String(500 + i),
        d.toISOString().slice(0, 10),
        d.toISOString(), d.toISOString(),
      ]
    );
  }
  console.log("Inserted 8 exits");

  // Final counts
  for (const t of ["entries", "exits", "classification_sheets", "stock_movements"]) {
    const r = await c.query("SELECT COUNT(*) FROM " + t);
    console.log(t + ":", r.rows[0].count);
  }

  await c.end();
  console.log("Done!");
}

seed().catch((e) => {
  console.error(e.message);
  c.end();
});
