"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const routeSchema = z.object({
  park_id: z.string().uuid(),
  viatura_id: z.string().uuid().optional(),
  motorista_id: z.string().uuid().optional(),
  data_rota: z.string(),
  hora_partida: z.string().optional(),
  notas: z.string().optional(),
});

const paragensSchema = z.object({
  rota_id: z.string().uuid(),
  pedido_id: z.string().uuid(),
  ordem: z.number().int().positive(),
  hora_chegada_estimada: z.string().optional(),
});

export async function createRota(data: z.infer<typeof routeSchema>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");
  const org_id = user.app_metadata?.org_id;
  if (!org_id) throw new Error("Organização não encontrada");

  const validated = routeSchema.parse(data);
  const { data: numRota } = await supabase.rpc("generate_numero_rota", {
    p_park_id: validated.park_id,
  });

  const { data: rota, error } = await supabase
    .from("rotas")
    .insert({
      ...validated,
      org_id,
      numero_rota: numRota,
      status: "draft",
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/logistica/planeamento");
  return rota;
}

export async function addParagem(data: z.infer<typeof paragensSchema>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");

  const validated = paragensSchema.parse(data);
  const { data: paragem, error } = await supabase
    .from("rota_paragens")
    .insert({ ...validated, status: "pending" })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Update the order's status to "planned"
  await supabase
    .from("pedidos_recolha")
    .update({ status: "planned", updated_at: new Date().toISOString() })
    .eq("id", validated.pedido_id);

  revalidatePath("/logistica/planeamento");
  revalidatePath("/logistica/pedidos");
  return paragem;
}

export async function removeParagem(paragemaId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");

  // Fetch the paragem to know the pedido_id before deleting
  const { data: paragem } = await supabase
    .from("rota_paragens")
    .select("pedido_id")
    .eq("id", paragemaId)
    .single();

  const { error } = await supabase
    .from("rota_paragens")
    .delete()
    .eq("id", paragemaId);

  if (error) throw new Error(error.message);

  // Revert order to pending
  if (paragem?.pedido_id) {
    await supabase
      .from("pedidos_recolha")
      .update({ status: "pending", updated_at: new Date().toISOString() })
      .eq("id", paragem.pedido_id);
  }

  revalidatePath("/logistica/planeamento");
  revalidatePath("/logistica/pedidos");
  return { success: true };
}

export async function reorderParagens(
  rotaId: string,
  orderedIds: string[] // paragem IDs in new order
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");

  // Update each paragem's ordem
  await Promise.all(
    orderedIds.map((id, idx) =>
      supabase
        .from("rota_paragens")
        .update({ ordem: idx + 1 })
        .eq("id", id)
        .eq("rota_id", rotaId)
    )
  );

  revalidatePath("/logistica/planeamento");
  return { success: true };
}

export async function confirmRota(rotaId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");

  const { error } = await supabase
    .from("rotas")
    .update({ status: "confirmed", updated_at: new Date().toISOString() })
    .eq("id", rotaId);

  if (error) throw new Error(error.message);
  revalidatePath("/logistica/planeamento");
  return { success: true };
}

export async function updateRotaAssignment(
  rotaId: string,
  data: {
    viatura_id?: string;
    motorista_id?: string;
    data_rota?: string;
    hora_partida?: string;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");

  const { error } = await supabase
    .from("rotas")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", rotaId);

  if (error) throw new Error(error.message);
  revalidatePath("/logistica/planeamento");
  return { success: true };
}

export async function startRota(rotaId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");
  const { error } = await supabase
    .from("rotas")
    .update({ status: "on_execution", updated_at: new Date().toISOString() })
    .eq("id", rotaId)
    .eq("status", "confirmed");
  if (error) throw new Error(error.message);
  revalidatePath(`/logistica/rotas/${rotaId}`);
  revalidatePath("/logistica/tracking");
  return { success: true };
}

export async function registarChegada(paragemaId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");
  const { error } = await supabase
    .from("rota_paragens")
    .update({
      status: "at_client",
      hora_chegada_real: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", paragemaId);
  if (error) throw new Error(error.message);
  // Update linked order status
  const { data: paragem } = await supabase
    .from("rota_paragens")
    .select("pedido_id")
    .eq("id", paragemaId)
    .single();
  if (paragem?.pedido_id) {
    await supabase
      .from("pedidos_recolha")
      .update({ status: "at_client", updated_at: new Date().toISOString() })
      .eq("id", paragem.pedido_id);
  }
  return { success: true };
}

export async function concluirParagem(
  paragemaId: string,
  data: { quantidade_real_kg: number; notas?: string }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("rota_paragens")
    .update({
      status: "completed",
      hora_saida_real: now,
      quantidade_real_kg: data.quantidade_real_kg,
      notas: data.notas ?? null,
      updated_at: now,
    })
    .eq("id", paragemaId);
  if (error) throw new Error(error.message);
  // Fetch paragem to get pedido id
  const { data: paragem } = await supabase
    .from("rota_paragens")
    .select("pedido_id")
    .eq("id", paragemaId)
    .single();
  if (paragem?.pedido_id) {
    await supabase
      .from("pedidos_recolha")
      .update({ status: "completed", completed_at: now, updated_at: now })
      .eq("id", paragem.pedido_id);
  }
  return { success: true };
}

export async function falharParagem(paragemaId: string, motivo: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("rota_paragens")
    .update({ status: "failed", notas: motivo, updated_at: now })
    .eq("id", paragemaId);
  if (error) throw new Error(error.message);
  const { data: paragem } = await supabase
    .from("rota_paragens")
    .select("pedido_id")
    .eq("id", paragemaId)
    .single();
  if (paragem?.pedido_id) {
    await supabase
      .from("pedidos_recolha")
      .update({ status: "failed", failure_reason: motivo, updated_at: now })
      .eq("id", paragem.pedido_id);
  }
  return { success: true };
}

export async function concludeRota(rotaId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("rotas")
    .update({ status: "completed", hora_chegada: now, updated_at: now })
    .eq("id", rotaId);
  if (error) throw new Error(error.message);
  revalidatePath(`/logistica/rotas/${rotaId}`);
  revalidatePath("/logistica/planeamento");
  return { success: true };
}
