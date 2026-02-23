// Bee2Waste — Logistics Seed Script
// Run with: node --env-file=.env.local scripts/seed-logistics.mjs
// Requires in .env.local: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY

// Attempt dotenv fallback if env vars are not already loaded
try {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const { config } = await import("dotenv");
    config({ path: ".env.local" });
  }
} catch {
  // dotenv not installed — rely on --env-file flag or pre-set env vars
}

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  console.error("Run with: node --env-file=.env.local scripts/seed-logistics.mjs");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Date helpers ──────────────────────────────────────────────────────────────
function daysAgo(n) {
  return new Date(Date.now() - n * 86400000).toISOString();
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function dateStr(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
}

// Produce a full ISO timestamp for a given date string and time string (HH:MM)
function dateTimeStr(dateIso, timeHHMM) {
  return `${dateIso}T${timeHHMM}:00.000Z`;
}

async function q(label, fn) {
  const { data, error } = await fn();
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

// ── Collection locations ───────────────────────────────────────────────────────
const LOCATIONS = [
  { morada: "Rua Industrial da Mitrena, 45",         cidade: "Setúbal",  lat: 38.5108, lng: -8.7930 },
  { morada: "Estrada Nacional 10, km 23",             cidade: "Palmela",  lat: 38.5612, lng: -8.7754 },
  { morada: "Zona Industrial de Setúbal, Lote 12",   cidade: "Setúbal",  lat: 38.5244, lng: -8.8882 },
  { morada: "Rua da Fábrica, 8",                      cidade: "Moita",    lat: 38.6484, lng: -8.9819 },
  { morada: "Parque Industrial de Coina, Lote 7",    cidade: "Coina",    lat: 38.6011, lng: -8.9344 },
  { morada: "Avenida das Indústrias, 156",            cidade: "Setúbal",  lat: 38.5195, lng: -8.8800 },
  { morada: "Estrada de Santiago, 34",                cidade: "Alcochete",lat: 38.7524, lng: -8.9639 },
  { morada: "Zona Franca Industrial, Edifício B",    cidade: "Setúbal",  lat: 38.5309, lng: -8.8647 },
];

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  // ── Core entities ──────────────────────────────────────────────────────────
  const [org]  = await q("org",  () => sb.from("organizations").select("id").limit(1));
  const [park] = await q("park", () => sb.from("parks").select("id, code").limit(1));

  const orgId    = org.id;
  const parkId   = park.id;
  const parkCode = park.code;
  console.log(`Park: ${parkCode} (${parkId})`);

  // ── Idempotency check ──────────────────────────────────────────────────────
  const { count: existingViaturas } = await sb
    .from("viaturas")
    .select("*", { count: "exact", head: true })
    .eq("park_id", parkId);

  if (existingViaturas > 0) {
    console.log(`Logistics seed data already exists (${existingViaturas} viaturas), skipping.`);
    process.exit(0);
  }

  // ── LER codes ──────────────────────────────────────────────────────────────
  const lerRows = await q("ler_codes", () =>
    sb.from("ler_codes").select("id, code").in("code", ["15 01 01", "15 01 02", "15 01 07", "17 04 05"])
  );
  const lerMap = Object.fromEntries(lerRows.map(r => [r.code, r.id]));
  // Build an array of { code, id } for distribution across orders
  const lerCodes = lerRows.map(r => ({ code: r.code, id: r.id }));
  console.log(`Found ${lerCodes.length} LER codes`);

  // ── Clients (suppliers only — for collection orders) ───────────────────────
  const clientRows = await q("clients", () =>
    sb.from("clients")
      .select("id, name, client_type")
      .eq("org_id", orgId)
      .in("client_type", ["supplier", "both"])
      .limit(10)
  );
  const clientIds = clientRows.map(c => c.id);
  console.log(`Found ${clientIds.length} supplier clients`);

  // ── 1. Viaturas ────────────────────────────────────────────────────────────
  const viaturaPayloads = [
    {
      org_id: orgId, park_id: parkId,
      matricula: "67-AB-12", tipo: "open_body", capacidade_kg: 15000,
      status: "on_route",
      current_lat: 38.5244, current_lng: -8.8882,
      marca: "Mercedes", modelo: "Actros",
      position_updated_at: new Date().toISOString(),
    },
    {
      org_id: orgId, park_id: parkId,
      matricula: "78-CD-34", tipo: "compactor", capacidade_kg: 8000,
      status: "available",
      current_lat: 38.5195, current_lng: -8.8800,
      marca: "MAN", modelo: "TGS",
      position_updated_at: new Date().toISOString(),
    },
    {
      org_id: orgId, park_id: parkId,
      matricula: "89-EF-56", tipo: "container", capacidade_kg: 20000,
      status: "in_maintenance",
      marca: "Volvo", modelo: "FH",
    },
  ];

  const { data: viaturas, error: vErr } = await sb
    .from("viaturas")
    .insert(viaturaPayloads)
    .select("id, matricula");
  if (vErr) throw new Error("Viaturas: " + vErr.message);

  const vMap = Object.fromEntries(viaturas.map(v => [v.matricula, v.id]));
  const v1Id = vMap["67-AB-12"]; // on_route — Mercedes Actros
  const v2Id = vMap["78-CD-34"]; // available — MAN TGS
  const v3Id = vMap["89-EF-56"]; // in_maintenance — Volvo FH
  console.log("✅ Inserted 3 viaturas");

  // ── Maintenance record for v3 (in_maintenance) ────────────────────────────
  const { error: maintErr } = await sb.from("manutencao_viaturas").insert([
    {
      viatura_id: v3Id,
      tipo: "corrective",
      descricao: "Substituição de travões e revisão do sistema hidráulico",
      data_agendada: dateStr(-2),
      data_realizada: null,
      realizado_por: "Oficina AutoTruck Setúbal",
      notas: "Viatura imobilizada até conclusão da revisão",
    },
  ]);
  if (maintErr) console.warn("  Maintenance record:", maintErr.message);
  else console.log("✅ Inserted 1 maintenance record");

  // ── 2. Motoristas ──────────────────────────────────────────────────────────
  const motoristaPayloads = [
    {
      org_id: orgId, park_id: parkId,
      profile_id: null,
      nome: "João Silva",
      telefone: "912 345 678",
      numero_licenca: "L-123456",
      categorias_licenca: ["C", "CE"],
      adr_certificado: false,
      turno_inicio: "07:00",
      turno_fim: "17:00",
    },
    {
      org_id: orgId, park_id: parkId,
      profile_id: null,
      nome: "António Ferreira",
      telefone: "963 456 789",
      numero_licenca: "L-789012",
      categorias_licenca: ["C", "CE", "ADR"],
      adr_certificado: true,
      turno_inicio: "07:30",
      turno_fim: "16:30",
    },
  ];

  const { data: motoristas, error: mErr } = await sb
    .from("motoristas")
    .insert(motoristaPayloads)
    .select("id, nome");
  if (mErr) throw new Error("Motoristas: " + mErr.message);

  const mMap = Object.fromEntries(motoristas.map(m => [m.nome, m.id]));
  const m1Id = mMap["João Silva"];      // default viatura: 67-AB-12
  const m2Id = mMap["António Ferreira"]; // default viatura: 78-CD-34
  console.log("✅ Inserted 2 motoristas");

  // ── 3. Associate drivers to vehicles ──────────────────────────────────────
  const { error: assoc1Err } = await sb
    .from("motoristas")
    .update({ viatura_default_id: v1Id })
    .eq("id", m1Id);
  if (assoc1Err) console.warn("  Driver-vehicle assoc (João):", assoc1Err.message);

  const { error: assoc2Err } = await sb
    .from("motoristas")
    .update({ viatura_default_id: v2Id })
    .eq("id", m2Id);
  if (assoc2Err) console.warn("  Driver-vehicle assoc (António):", assoc2Err.message);
  console.log("✅ Associated drivers to vehicles");

  // ── 4. Pedidos de Recolha (20 orders) ─────────────────────────────────────
  const today = todayStr();
  const tomorrow = dateStr(1);
  const yesterday = dateStr(-1);

  // Build order payloads in blocks by final status:
  // [0..7]  → 8 pending  (idx 0-1 critical, 2-4 urgent, 5-7 normal)
  // [8..11] → 4 planned  (linked to tomorrow's route)
  // [12..14]→ 3 on_route (linked to today's route)
  // [15..18]→ 4 completed
  // [19]    → 1 failed

  const orderPayloads = Array.from({ length: 20 }, (_, i) => {
    const loc = LOCATIONS[i % LOCATIONS.length];
    const lerEntry = lerCodes[i % lerCodes.length] ?? { code: "17 04 05", id: lerMap["17 04 05"] };

    let status, prioridade, sla_deadline, completed_at, failure_reason, data_agendada;

    if (i < 2) {
      status = "pending"; prioridade = "critical";
      sla_deadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    } else if (i < 5) {
      status = "pending"; prioridade = "urgent";
      sla_deadline = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    } else if (i < 8) {
      status = "pending"; prioridade = "normal";
      sla_deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    } else if (i < 12) {
      status = "planned"; prioridade = "normal";
      data_agendada = tomorrow;
      sla_deadline = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    } else if (i < 15) {
      status = "on_route"; prioridade = i === 12 ? "urgent" : "normal";
      data_agendada = today;
      sla_deadline = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    } else if (i < 19) {
      status = "completed"; prioridade = "normal";
      const daysBack = (i - 14) * 2; // 2, 4, 6, 8 days ago
      completed_at = daysAgo(daysBack);
      data_agendada = dateStr(-(daysBack + 1));
      sla_deadline = new Date(Date.now() - (daysBack - 1) * 24 * 60 * 60 * 1000).toISOString();
    } else {
      // i === 19: failed
      status = "failed"; prioridade = "normal";
      failure_reason = "Cliente ausente no local de recolha";
      data_agendada = dateStr(-3);
      sla_deadline = daysAgo(2);
    }

    return {
      org_id: orgId,
      park_id: parkId,
      client_id: clientIds.length > 0 ? (clientIds[i % clientIds.length] ?? null) : null,
      numero_pedido: `${parkCode}-R-2026-${String(i + 1).padStart(5, "0")}`,
      status,
      prioridade,
      morada_recolha: loc.morada,
      cidade_recolha: loc.cidade,
      collection_lat: loc.lat,
      collection_lng: loc.lng,
      quantidade_estimada_kg: [2500, 5000, 8000, 12000, 3500][i % 5],
      ler_code: lerEntry.code,
      ler_code_id: lerEntry.id,
      sla_deadline,
      data_pedido: daysAgo(Math.floor(Math.random() * 7)),
      data_agendada: data_agendada ?? null,
      completed_at: completed_at ?? null,
      failure_reason: failure_reason ?? null,
      created_by: null,
    };
  });

  const { data: orders, error: oErr } = await sb
    .from("pedidos_recolha")
    .insert(orderPayloads)
    .select("id, numero_pedido, status");
  if (oErr) throw new Error("Pedidos de recolha: " + oErr.message);

  // Index orders by their index position (0-based) for easy stop linking
  const ordersByIdx = orders.sort((a, b) =>
    a.numero_pedido.localeCompare(b.numero_pedido, undefined, { numeric: true })
  );

  // Categorise by status
  const pendingOrders   = ordersByIdx.filter(o => o.status === "pending");
  const plannedOrders   = ordersByIdx.filter(o => o.status === "planned");
  const onRouteOrders   = ordersByIdx.filter(o => o.status === "on_route");
  const completedOrders = ordersByIdx.filter(o => o.status === "completed");

  console.log(`✅ Inserted 20 pedidos de recolha (${pendingOrders.length} pending, ${plannedOrders.length} planned, ${onRouteOrders.length} on_route, ${completedOrders.length} completed, 1 failed)`);

  // ── 5. Rotas ───────────────────────────────────────────────────────────────

  // Rota 1 — Concluída (yesterday), used v3 (now in maintenance)
  const rota1Payload = {
    org_id: orgId, park_id: parkId,
    numero_rota: `${parkCode}-RT-2026-00001`,
    data_rota: yesterday,
    status: "completed",
    viatura_id: v3Id,
    motorista_id: m1Id,
    num_paragens: 4,
    peso_total_planeado_kg: 20000,
    peso_total_real_kg: 18500,
    distancia_total_km: 45.2,
    hora_partida:  dateTimeStr(yesterday, "07:00"),
    hora_chegada:  dateTimeStr(yesterday, "16:30"),
    created_by: null,
  };

  // Rota 2 — Em Execução (today)
  const rota2Payload = {
    org_id: orgId, park_id: parkId,
    numero_rota: `${parkCode}-RT-2026-00002`,
    data_rota: today,
    status: "on_execution",
    viatura_id: v1Id,
    motorista_id: m1Id,
    num_paragens: 3,
    peso_total_planeado_kg: 15000,
    distancia_total_km: 32.5,
    hora_partida: dateTimeStr(today, "07:00"),
    created_by: null,
  };

  // Rota 3 — Confirmada (tomorrow)
  const rota3Payload = {
    org_id: orgId, park_id: parkId,
    numero_rota: `${parkCode}-RT-2026-00003`,
    data_rota: tomorrow,
    status: "confirmed",
    viatura_id: v2Id,
    motorista_id: m2Id,
    num_paragens: 4,
    peso_total_planeado_kg: 22000,
    distancia_total_km: 38.7,
    created_by: null,
  };

  const { data: rotas, error: rErr } = await sb
    .from("rotas")
    .insert([rota1Payload, rota2Payload, rota3Payload])
    .select("id, numero_rota, status");
  if (rErr) throw new Error("Rotas: " + rErr.message);

  const rotaMap = Object.fromEntries(rotas.map(r => [r.numero_rota, r.id]));
  const rota1Id = rotaMap[`${parkCode}-RT-2026-00001`]; // yesterday, completed
  const rota2Id = rotaMap[`${parkCode}-RT-2026-00002`]; // today, on_execution
  const rota3Id = rotaMap[`${parkCode}-RT-2026-00003`]; // tomorrow, confirmed
  console.log("✅ Inserted 3 rotas");

  // ── 6. Rota Paragens ───────────────────────────────────────────────────────

  // Rota 2 (today, on_execution): 3 stops from on_route orders
  const rota2Stops = [];
  if (onRouteOrders[0]) {
    rota2Stops.push({
      rota_id: rota2Id, pedido_id: onRouteOrders[0].id, ordem: 1,
      status: "completed",
      hora_chegada_estimada: dateTimeStr(today, "09:00"),
      hora_chegada_real:     dateTimeStr(today, "09:30"),
      hora_saida_real:       dateTimeStr(today, "10:15"),
      quantidade_real_kg:    4800,
      notas: "Recolha concluída sem incidentes",
    });
  }
  if (onRouteOrders[1]) {
    rota2Stops.push({
      rota_id: rota2Id, pedido_id: onRouteOrders[1].id, ordem: 2,
      status: "at_client",
      hora_chegada_estimada: dateTimeStr(today, "10:45"),
      hora_chegada_real:     dateTimeStr(today, "11:00"),
    });
  }
  if (onRouteOrders[2]) {
    rota2Stops.push({
      rota_id: rota2Id, pedido_id: onRouteOrders[2].id, ordem: 3,
      status: "pending",
      hora_chegada_estimada: dateTimeStr(today, "12:30"),
    });
  }

  // Rota 3 (tomorrow, confirmed): 4 stops from planned orders
  const rota3Stops = plannedOrders.slice(0, 4).map((o, idx) => ({
    rota_id: rota3Id, pedido_id: o.id, ordem: idx + 1,
    status: "pending",
    hora_chegada_estimada: dateTimeStr(tomorrow, `${String(9 + idx * 2).padStart(2, "0")}:00`),
  }));

  // Rota 1 (yesterday, completed): 4 stops from completed orders
  const completedWeights = [4200, 5300, 4800, 4200]; // total ~18500 kg
  const rota1Stops = completedOrders.slice(0, 4).map((o, idx) => ({
    rota_id: rota1Id, pedido_id: o.id, ordem: idx + 1,
    status: "completed",
    hora_chegada_estimada: dateTimeStr(yesterday, `${String(9 + idx * 2).padStart(2, "0")}:00`),
    hora_chegada_real:     dateTimeStr(yesterday, `${String(9 + idx * 2).padStart(2, "0")}:${15 + idx * 5}`),
    hora_saida_real:       dateTimeStr(yesterday, `${String(9 + idx * 2 + 1).padStart(2, "0")}:00`),
    quantidade_real_kg:    completedWeights[idx],
  }));

  const allStops = [...rota1Stops, ...rota2Stops, ...rota3Stops];

  if (allStops.length > 0) {
    const { error: sErr } = await sb.from("rota_paragens").insert(allStops);
    if (sErr) throw new Error("Rota paragens: " + sErr.message);
    console.log(`✅ Inserted ${allStops.length} rota_paragens (${rota1Stops.length} completed, ${rota2Stops.length} active, ${rota3Stops.length} pending)`);
  }

  // ── Update on_route orders to link to rota 2 ──────────────────────────────
  const onRouteIds = onRouteOrders.map(o => o.id);
  if (onRouteIds.length > 0) {
    const { error: updateErr } = await sb
      .from("pedidos_recolha")
      .update({ data_agendada: today })
      .in("id", onRouteIds);
    if (updateErr) console.warn("  Update on_route orders:", updateErr.message);
  }

  console.log("\n✅ Logistics seed complete!");
  console.log(`   Viaturas   : 3 (1 on_route, 1 available, 1 in_maintenance)`);
  console.log(`   Motoristas : 2`);
  console.log(`   Pedidos    : 20 (8 pending, 4 planned, 3 on_route, 4 completed, 1 failed)`);
  console.log(`   Rotas      : 3 (1 completed, 1 on_execution, 1 confirmed)`);
  console.log(`   Paragens   : ${allStops.length}`);
}

main().catch(e => { console.error("❌", e.message); process.exit(1); });
