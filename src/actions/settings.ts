"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ============================================================
// PARK CRUD
// ============================================================
const parkSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1).max(10),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  license_number: z.string().optional(),
  license_expiry: z.string().optional(),
});

export async function createPark(formData: z.infer<typeof parkSchema>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const orgId = user.app_metadata?.org_id;
  if (!orgId) throw new Error("No organization");

  const validated = parkSchema.parse(formData);

  const { data, error } = await supabase
    .from("parks")
    .insert({ ...validated, org_id: orgId })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/settings/parks");
  return data;
}

export async function updatePark(id: string, formData: z.infer<typeof parkSchema>) {
  const supabase = await createClient();
  const validated = parkSchema.parse(formData);

  const { error } = await supabase
    .from("parks")
    .update(validated)
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/settings/parks");
}

export async function deletePark(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("parks")
    .update({ is_active: false })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/settings/parks");
}

// ============================================================
// STORAGE AREA CRUD
// ============================================================
const areaSchema = z.object({
  park_id: z.string().uuid(),
  code: z.string().min(1).max(10),
  name: z.string().min(1),
  area_type: z.enum(["physical", "logical", "vfv", "sorting_line", "warehouse"]),
  capacity_kg: z.number().positive().optional(),
  location_description: z.string().optional(),
});

export async function createStorageArea(formData: z.infer<typeof areaSchema>) {
  const supabase = await createClient();
  const validated = areaSchema.parse(formData);

  const { data, error } = await supabase
    .from("storage_areas")
    .insert(validated)
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/settings/areas");
  return data;
}

export async function updateStorageArea(id: string, formData: z.infer<typeof areaSchema>) {
  const supabase = await createClient();
  const validated = areaSchema.parse(formData);

  const { error } = await supabase
    .from("storage_areas")
    .update(validated)
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/settings/areas");
}

export async function deleteStorageArea(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("storage_areas")
    .update({ is_active: false })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/settings/areas");
}

// ============================================================
// SCALE CRUD
// ============================================================
const scaleSchema = z.object({
  park_id: z.string().uuid(),
  code: z.string().min(1).max(10),
  name: z.string().min(1),
  scale_type: z.enum(["platform", "floor", "bench", "crane"]),
  max_capacity_kg: z.number().positive(),
  min_capacity_kg: z.number().min(0).default(0),
  precision_kg: z.number().positive().default(0.5),
  last_calibration: z.string().optional(),
  next_calibration: z.string().optional(),
  mock_endpoint_url: z.string().optional(),
});

export async function createScale(formData: z.infer<typeof scaleSchema>) {
  const supabase = await createClient();
  const validated = scaleSchema.parse(formData);

  const { data, error } = await supabase
    .from("scales")
    .insert(validated)
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/settings/scales");
  return data;
}

export async function updateScale(id: string, formData: z.infer<typeof scaleSchema>) {
  const supabase = await createClient();
  const validated = scaleSchema.parse(formData);

  const { error } = await supabase
    .from("scales")
    .update(validated)
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/settings/scales");
}

export async function deleteScale(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("scales")
    .update({ is_active: false })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/settings/scales");
}

// ============================================================
// LER AUTHORIZATION CRUD
// ============================================================
const lerAuthSchema = z.object({
  park_id: z.string().uuid(),
  ler_code_id: z.string().uuid(),
  operation_type: z.enum(["reception", "treatment", "storage", "valorization", "elimination"]),
  max_capacity_kg: z.number().positive().optional(),
  annual_limit_kg: z.number().positive().optional(),
  notes: z.string().optional(),
});

export async function createLerAuthorization(formData: z.infer<typeof lerAuthSchema>) {
  const supabase = await createClient();
  const validated = lerAuthSchema.parse(formData);

  const { data, error } = await supabase
    .from("park_ler_authorizations")
    .insert(validated)
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/settings/ler-codes");
  return data;
}

export async function deleteLerAuthorization(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("park_ler_authorizations")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/settings/ler-codes");
}

// ============================================================
// USER MANAGEMENT
// ============================================================
const inviteUserSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1),
  park_id: z.string().uuid(),
  role: z.enum(["admin", "park_manager", "scale_operator", "classifier", "commercial_manager"]),
});

export async function inviteUser(formData: z.infer<typeof inviteUserSchema>) {
  const supabase = await createClient();
  const validated = inviteUserSchema.parse(formData);

  // For MVP, just create the access record
  // In production, this would send an email invite
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Note: In production, use admin client to invite user via Supabase Auth
  // orgId available via user.app_metadata?.org_id
  revalidatePath("/settings/users");
  return validated;
}

export async function updateUserRole(accessId: string, role: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("user_park_access")
    .update({ role })
    .eq("id", accessId);

  if (error) throw new Error(error.message);
  revalidatePath("/settings/users");
}

export async function removeUserAccess(accessId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("user_park_access")
    .update({ is_active: false })
    .eq("id", accessId);

  if (error) throw new Error(error.message);
  revalidatePath("/settings/users");
}
