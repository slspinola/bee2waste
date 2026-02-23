"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const driverSchema = z.object({
  park_id: z.string().uuid(),
  nome: z.string().min(1),
  telefone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  numero_licenca: z.string().optional(),
  categorias_licenca: z.array(z.string()).default([]),
  licenca_validade: z.string().optional(),
  adr_certificado: z.boolean().default(false),
  viatura_default_id: z.string().uuid().optional().or(z.literal("")),
  turno_inicio: z.string().optional(),
  turno_fim: z.string().optional(),
});

export async function createMotorista(data: z.infer<typeof driverSchema>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");
  const org_id = user.app_metadata?.org_id;
  if (!org_id) throw new Error("Organização não encontrada");

  const validated = driverSchema.parse(data);

  // Clean empty strings for optional UUID and string fields
  const payload = {
    ...validated,
    org_id,
    viatura_default_id: validated.viatura_default_id || null,
    email: validated.email || null,
    licenca_validade: validated.licenca_validade || null,
  };

  const { data: motorista, error } = await supabase
    .from("motoristas")
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/logistica/motoristas");
  return motorista;
}

export async function updateMotorista(
  id: string,
  data: Partial<z.infer<typeof driverSchema>>
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");

  const payload = {
    ...data,
    viatura_default_id: data.viatura_default_id || null,
    email: data.email || null,
    updated_at: new Date().toISOString(),
  };

  const { data: motorista, error } = await supabase
    .from("motoristas")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/logistica/motoristas");
  revalidatePath(`/logistica/motoristas/${id}`);
  return motorista;
}

const shiftSchema = z.object({
  motorista_id: z.string().uuid(),
  viatura_id: z.string().uuid().optional(),
  data_turno: z.string(),
  hora_inicio_planeada: z.string().optional(),
  hora_fim_planeada: z.string().optional(),
  notas: z.string().optional(),
});

export async function setTurnoMotorista(
  data: z.infer<typeof shiftSchema>
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");

  const validated = shiftSchema.parse(data);

  const { data: turno, error } = await supabase
    .from("turnos_motoristas")
    .upsert(validated, { onConflict: "motorista_id,data_turno" })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/logistica/motoristas");
  return turno;
}
