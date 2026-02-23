"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const vehicleSchema = z.object({
  park_id: z.string().uuid(),
  matricula: z.string().min(1).max(20),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  tipo: z
    .enum(["open_body", "container", "compactor", "tank", "flatbed", "other"])
    .default("open_body"),
  capacidade_kg: z.coerce.number().positive(),
  capacidade_m3: z.coerce.number().positive().optional(),
  ler_autorizados: z.array(z.string()).default([]),
  notas: z.string().optional(),
});

export async function createViatura(data: z.infer<typeof vehicleSchema>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");
  const org_id = user.app_metadata?.org_id;
  if (!org_id) throw new Error("Organização não encontrada");

  const validated = vehicleSchema.parse(data);

  const { data: viatura, error } = await supabase
    .from("viaturas")
    .insert({ ...validated, org_id, status: "available" })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/logistica/viaturas");
  return viatura;
}

export async function updateViatura(
  id: string,
  data: Partial<z.infer<typeof vehicleSchema>>
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");

  const { data: viatura, error } = await supabase
    .from("viaturas")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/logistica/viaturas");
  revalidatePath(`/logistica/viaturas/${id}`);
  return viatura;
}

export async function updateViaturaStatus(
  id: string,
  status: "available" | "on_route" | "in_maintenance" | "inactive"
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");

  const { error } = await supabase
    .from("viaturas")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/logistica/viaturas");
  return { success: true };
}

const maintenanceSchema = z.object({
  viatura_id: z.string().uuid(),
  tipo: z
    .enum(["scheduled", "corrective", "inspection"])
    .default("scheduled"),
  descricao: z.string().min(1),
  data_agendada: z.string().optional(),
  proxima_data: z.string().optional(),
  custo: z.coerce.number().optional(),
  realizado_por: z.string().optional(),
  notas: z.string().optional(),
});

export async function logMaintenance(
  data: z.infer<typeof maintenanceSchema>
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");

  const validated = maintenanceSchema.parse(data);

  const { data: maintenance, error } = await supabase
    .from("manutencao_viaturas")
    .insert(validated)
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Set vehicle status to in_maintenance when logging maintenance
  await supabase
    .from("viaturas")
    .update({ status: "in_maintenance", updated_at: new Date().toISOString() })
    .eq("id", data.viatura_id);

  revalidatePath("/logistica/viaturas");
  return maintenance;
}
