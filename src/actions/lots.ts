"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ============================================================
// AREA GROUPS
// ============================================================
const areaGroupSchema = z.object({
  park_id: z.string().uuid(),
  name: z.string().min(1),
  code: z.string().min(1).max(20),
  description: z.string().optional(),
});

export async function createAreaGroup(formData: z.infer<typeof areaGroupSchema>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const validated = areaGroupSchema.parse(formData);
  const { data, error } = await supabase
    .from("area_groups")
    .insert(validated)
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/settings/zones");
  return data;
}

export async function updateAreaGroup(id: string, formData: Partial<z.infer<typeof areaGroupSchema>>) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("area_groups")
    .update({ ...formData, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/settings/zones");
}

export async function deleteAreaGroup(id: string) {
  const supabase = await createClient();
  // Unlink zones first
  await supabase
    .from("storage_areas")
    .update({ area_group_id: null })
    .eq("area_group_id", id);

  const { error } = await supabase
    .from("area_groups")
    .update({ is_active: false })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/settings/zones");
}

export async function assignZoneToGroup(zoneId: string, groupId: string | null) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("storage_areas")
    .update({ area_group_id: groupId })
    .eq("id", zoneId);

  if (error) throw new Error(error.message);
  revalidatePath("/settings/zones");
}

// ============================================================
// LOT CRUD
// ============================================================
const createLotSchema = z.object({
  park_id: z.string().uuid(),
  name: z.string().optional(),
  allowed_ler_codes: z.array(z.string()).min(1),
  allowed_ler_code_ids: z.array(z.string().uuid()),
  zone_ids: z.array(z.string().uuid()).min(1),
  notes: z.string().optional(),
});

export async function createLot(formData: z.infer<typeof createLotSchema>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const orgId = user.app_metadata?.org_id;
  if (!orgId) throw new Error("No organization");

  const validated = createLotSchema.parse(formData);

  // Generate lot number via DB function
  const { data: numData, error: numError } = await supabase
    .rpc("generate_lot_number", { p_park_id: validated.park_id });
  if (numError) throw new Error(numError.message);

  const { data: lot, error: lotError } = await supabase
    .from("lots")
    .insert({
      org_id: orgId,
      park_id: validated.park_id,
      lot_number: numData as string,
      name: validated.name,
      allowed_ler_codes: validated.allowed_ler_codes,
      allowed_ler_code_ids: validated.allowed_ler_code_ids,
      notes: validated.notes,
      created_by: user.id,
    })
    .select()
    .single();

  if (lotError) throw new Error(lotError.message);

  // Associate zones
  if (validated.zone_ids.length > 0) {
    const { error: zonesError } = await supabase
      .from("lot_zones")
      .insert(validated.zone_ids.map((zid) => ({ lot_id: lot.id, zone_id: zid })));
    if (zonesError) throw new Error(zonesError.message);
  }

  revalidatePath("/lots");
  return lot;
}

// ============================================================
// AUTO-ASSIGN LOT TO ENTRY
// Finds open compatible lot in zone, or creates one automatically
// ============================================================
export async function autoAssignLot(
  entryId: string,
  zoneId: string,
  lerCode: string,
  lerCodeId: string,
  parkId: string
): Promise<{ lot_id: string; created: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const orgId = user.app_metadata?.org_id;
  if (!orgId) throw new Error("No organization");

  // Find open lot in this zone compatible with the LER code
  const { data: existingLot } = await supabase
    .from("lot_zones")
    .select("lot_id, lots!inner(id, status, allowed_ler_codes, total_input_kg)")
    .eq("zone_id", zoneId)
    .is("removed_at", null)
    .eq("lots.status", "open")
    .single();

  if (existingLot) {
    const lot = existingLot.lots as unknown as { id: string; allowed_ler_codes: string[] };
    // Check LER compatibility
    if ((lot.allowed_ler_codes as string[]).includes(lerCode) ||
        (lot.allowed_ler_codes as string[]).length === 0) {
      return { lot_id: lot.id, created: false };
    }
  }

  // No compatible lot — create one automatically
  const { data: numData } = await supabase
    .rpc("generate_lot_number", { p_park_id: parkId });

  const { data: newLot, error } = await supabase
    .from("lots")
    .insert({
      org_id: orgId,
      park_id: parkId,
      lot_number: numData as string,
      name: `Lote automático — ${lerCode}`,
      allowed_ler_codes: [lerCode],
      allowed_ler_code_ids: [lerCodeId],
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Link zone to new lot
  await supabase.from("lot_zones").insert({ lot_id: newLot.id, zone_id: zoneId });

  revalidatePath("/lots");
  return { lot_id: newLot.id, created: true };
}

// ============================================================
// ADD ENTRY TO LOT
// ============================================================
const addEntrySchema = z.object({
  lot_id: z.string().uuid(),
  entry_id: z.string().uuid(),
  contribution_kg: z.number().positive(),
  inspection_result: z.enum(["approved", "approved_with_divergence", "rejected"]),
  has_major_divergence: z.boolean().default(false),
  has_critical_divergence: z.boolean().default(false),
});

export async function addEntryToLot(formData: z.infer<typeof addEntrySchema>) {
  const supabase = await createClient();
  const validated = addEntrySchema.parse(formData);

  // Calculate entry grade
  let grade = 5.0;
  if (validated.inspection_result === "rejected") {
    grade = 1.0;
  } else if (validated.inspection_result === "approved_with_divergence") {
    if (validated.has_critical_divergence) grade = 2.0;
    else if (validated.has_major_divergence) grade = 3.0;
    else grade = 3.5;
  }

  const { error } = await supabase.from("lot_entries").insert({
    lot_id: validated.lot_id,
    entry_id: validated.entry_id,
    contribution_kg: validated.contribution_kg,
    entry_raw_grade: grade,
  });

  if (error) throw new Error(error.message);
  // Trigger recalculates raw_grade automatically via DB trigger
  revalidatePath(`/lots/${validated.lot_id}`);
}

// ============================================================
// START TREATMENT (open → in_treatment, block zones)
// ============================================================
export async function startTreatment(lotId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Get lot zones
  const { data: zones } = await supabase
    .from("lot_zones")
    .select("zone_id")
    .eq("lot_id", lotId)
    .is("removed_at", null);

  // Block all zones
  if (zones && zones.length > 0) {
    await supabase
      .from("storage_areas")
      .update({
        is_blocked: true,
        blocked_reason: `Lote ${lotId} em tratamento`,
        blocked_at: new Date().toISOString(),
        blocked_by: user.id,
      })
      .in("id", zones.map((z) => z.zone_id));
  }

  // Update lot status
  const { error } = await supabase
    .from("lots")
    .update({
      status: "in_treatment",
      treatment_started_at: new Date().toISOString(),
    })
    .eq("id", lotId);

  if (error) throw new Error(error.message);
  revalidatePath(`/lots/${lotId}`);
  revalidatePath("/lots");
}

// ============================================================
// CLOSE LOT (in_treatment → closed, calculate LQI, release zones)
// ============================================================
const closeLotSchema = z.object({
  lot_id: z.string().uuid(),
  transformed_grade: z.number().min(1).max(5),
  total_output_kg: z.number().nonnegative(),
  classification_sheet_id: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export async function closeLot(formData: z.infer<typeof closeLotSchema>) {
  const supabase = await createClient();
  const validated = closeLotSchema.parse(formData);

  // Get current lot data
  const { data: lot, error: lotFetchError } = await supabase
    .from("lots")
    .select("total_input_kg, raw_grade")
    .eq("id", validated.lot_id)
    .single();

  if (lotFetchError) throw new Error(lotFetchError.message);

  const yieldRate = lot.total_input_kg > 0
    ? Math.round((validated.total_output_kg / lot.total_input_kg) * 10000) / 100
    : 0;

  // Update lot with final values
  const { error: updateError } = await supabase
    .from("lots")
    .update({
      status: "closed",
      transformed_grade: validated.transformed_grade,
      total_output_kg: validated.total_output_kg,
      yield_rate: yieldRate,
      classification_sheet_id: validated.classification_sheet_id,
      closed_at: new Date().toISOString(),
      notes: validated.notes,
    })
    .eq("id", validated.lot_id);

  if (updateError) throw new Error(updateError.message);

  // Calculate LQI via DB function
  await supabase.rpc("calculate_lot_lqi", { p_lot_id: validated.lot_id });

  // Release zones
  await releaseZonesByLot(validated.lot_id);

  revalidatePath(`/lots/${validated.lot_id}`);
  revalidatePath("/lots");
}

// ============================================================
// RELEASE ZONE (manual or auto on lot close)
// ============================================================
export async function releaseZone(zoneId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("storage_areas")
    .update({
      is_blocked: false,
      blocked_reason: null,
      blocked_at: null,
      blocked_by: null,
    })
    .eq("id", zoneId);

  if (error) throw new Error(error.message);
  revalidatePath("/lots");
  revalidatePath("/settings/zones");
}

async function releaseZonesByLot(lotId: string) {
  const supabase = await createClient();

  const { data: zones } = await supabase
    .from("lot_zones")
    .select("zone_id")
    .eq("lot_id", lotId)
    .is("removed_at", null);

  if (!zones || zones.length === 0) return;

  await supabase
    .from("storage_areas")
    .update({
      is_blocked: false,
      blocked_reason: null,
      blocked_at: null,
      blocked_by: null,
    })
    .in("id", zones.map((z) => z.zone_id));

  // Mark zones as removed from lot
  await supabase
    .from("lot_zones")
    .update({ removed_at: new Date().toISOString() })
    .eq("lot_id", lotId)
    .is("removed_at", null);
}

// ============================================================
// RECALCULATE SUPPLIER SCORE
// ============================================================
export async function recalculateSupplierScore(
  clientId: string,
  parkId: string,
  periodDays = 90
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const orgId = user.app_metadata?.org_id;
  if (!orgId) throw new Error("No organization");

  const periodEnd = new Date();
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - periodDays);

  // Get all closed lots where this client contributed
  const { data: contributions } = await supabase
    .from("lot_entries")
    .select(`
      contribution_kg,
      entry_raw_grade,
      lots!inner(
        id, park_id, lot_quality_index, yield_rate, lqi_grade, status, closed_at
      )
    `)
    .eq("lots.park_id", parkId)
    .eq("lots.status", "closed")
    .gte("lots.closed_at", periodStart.toISOString())
    .eq("entries.client_id", clientId);

  if (!contributions || contributions.length === 0) return;

  const totalKg = contributions.reduce((s, c) => s + Number(c.contribution_kg), 0);
  const avgRaw = contributions.reduce(
    (s, c) => s + Number(c.entry_raw_grade ?? 0) * Number(c.contribution_kg), 0
  ) / (totalKg || 1);

  const lots = contributions.map((c) => c.lots as unknown as { lot_quality_index: number; yield_rate: number });
  const avgYield = lots.reduce((s, l) => s + Number(l.yield_rate ?? 0), 0) / lots.length;
  const avgLqi   = lots.reduce((s, l) => s + Number(l.lot_quality_index ?? 0), 0) / lots.length;

  const letter = avgLqi >= 4.5 ? "A" : avgLqi >= 3.5 ? "B" : avgLqi >= 2.5 ? "C" : avgLqi >= 1.5 ? "D" : "E";

  await supabase.from("supplier_scores").upsert({
    org_id: orgId,
    client_id: clientId,
    park_id: parkId,
    period_start: periodStart.toISOString().split("T")[0],
    period_end: periodEnd.toISOString().split("T")[0],
    lot_count: lots.length,
    avg_raw_grade: Math.round(avgRaw * 100) / 100,
    avg_yield_rate: Math.round(avgYield * 100) / 100,
    avg_lqi: Math.round(avgLqi * 100) / 100,
    score_letter: letter,
    total_kg: totalKg,
    calculated_at: new Date().toISOString(),
  }, { onConflict: "client_id,park_id,period_start,period_end" });

  revalidatePath(`/clients/${clientId}`);
}

// ============================================================
// RECALCULATE PRODUCTION CYCLE
// ============================================================
export async function recalculateProductionCycle(clientId: string, parkId: string) {
  const supabase = await createClient();

  // Get last 20 confirmed entry dates for this client in this park
  const { data: entries } = await supabase
    .from("entries")
    .select("created_at")
    .eq("client_id", clientId)
    .eq("park_id", parkId)
    .eq("status", "confirmed")
    .order("created_at", { ascending: true })
    .limit(20);

  if (!entries || entries.length < 2) return;

  const dates = entries.map((e) => new Date(e.created_at).getTime());
  const intervals: number[] = [];
  for (let i = 1; i < dates.length; i++) {
    intervals.push((dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24)); // days
  }

  const avg = intervals.reduce((s, d) => s + d, 0) / intervals.length;
  const variance = intervals.reduce((s, d) => s + Math.pow(d - avg, 2), 0) / intervals.length;
  const stdDev = Math.sqrt(variance);
  const confidence = Math.min(entries.length / 10, 1); // max confidence at 10+ entries

  const lastDate = new Date(entries[entries.length - 1].created_at);
  const nextDate = new Date(lastDate.getTime() + avg * 24 * 60 * 60 * 1000);

  await supabase.from("client_production_cycles").upsert({
    client_id: clientId,
    park_id: parkId,
    avg_interval_days: Math.round(avg * 10) / 10,
    std_dev_days: Math.round(stdDev * 10) / 10,
    last_entry_date: lastDate.toISOString().split("T")[0],
    next_predicted_date: nextDate.toISOString().split("T")[0],
    entry_count: entries.length,
    confidence: Math.round(confidence * 100) / 100,
    last_calculated_at: new Date().toISOString(),
  }, { onConflict: "client_id,park_id" });
}
