"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const orderSchema = z.object({
  park_id: z.string().uuid(),
  client_id: z.string().uuid().optional(),
  ler_code_id: z.string().uuid().optional(),
  ler_code: z.string().optional(),
  quantidade_estimada_kg: z.coerce.number().positive().optional(),
  descricao_residuo: z.string().optional(),
  morada_recolha: z.string().min(1),
  cidade_recolha: z.string().optional(),
  codigo_postal_recolha: z.string().optional(),
  contacto_local: z.string().optional(),
  instrucoes_especiais: z.string().optional(),
  collection_lat: z.coerce.number().optional(),
  collection_lng: z.coerce.number().optional(),
  prioridade: z.enum(["normal", "urgent", "critical"]).default("normal"),
  data_preferida_inicio: z.string().optional(),
  data_preferida_fim: z.string().optional(),
  sla_deadline: z.string().optional(),
  contract_ref: z.string().optional(),
  notas: z.string().optional(),
});

async function geocodeAddress(
  morada: string,
  cidade?: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    const q = encodeURIComponent(
      `${morada}${cidade ? ", " + cidade : ""}, Portugal`
    );
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=pt`,
      {
        headers: {
          "User-Agent": "Bee2Waste/1.0 (contact@bee2solutions.pt)",
        },
        next: { revalidate: 86400 },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data[0]) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

export async function createPedidoRecolha(data: z.infer<typeof orderSchema>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");
  const org_id = user.app_metadata?.org_id;
  if (!org_id) throw new Error("Organização não encontrada");

  const validated = orderSchema.parse(data);

  // Generate numero_pedido
  const { data: numPedido } = await supabase.rpc("generate_numero_pedido", {
    p_park_id: validated.park_id,
  });

  // Geocode if no coordinates provided
  let lat = validated.collection_lat;
  let lng = validated.collection_lng;
  if (!lat || !lng) {
    const coords = await geocodeAddress(
      validated.morada_recolha,
      validated.cidade_recolha
    );
    if (coords) {
      lat = coords.lat;
      lng = coords.lng;
    }
  }

  const { data: pedido, error } = await supabase
    .from("pedidos_recolha")
    .insert({
      ...validated,
      org_id,
      numero_pedido: numPedido,
      status: "pending",
      collection_lat: lat,
      collection_lng: lng,
      created_by: user.id,
      client_id: validated.client_id || null,
      ler_code_id: validated.ler_code_id || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/logistica/pedidos");
  return pedido;
}

export async function updatePedidoStatus(
  id: string,
  status:
    | "draft"
    | "pending"
    | "planned"
    | "on_route"
    | "at_client"
    | "completed"
    | "failed"
    | "cancelled",
  extra?: { failure_reason?: string; cancellation_reason?: string }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");

  const update: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === "completed") update.completed_at = new Date().toISOString();
  if (status === "cancelled") {
    update.cancelled_at = new Date().toISOString();
    update.cancellation_reason = extra?.cancellation_reason ?? null;
  }
  if (status === "failed") update.failure_reason = extra?.failure_reason ?? null;

  const { error } = await supabase
    .from("pedidos_recolha")
    .update(update)
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/logistica/pedidos");
  revalidatePath(`/logistica/pedidos/${id}`);
  return { success: true };
}

export async function cancelPedido(id: string, reason: string) {
  return updatePedidoStatus(id, "cancelled", { cancellation_reason: reason });
}

export async function approvePedido(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");

  const { error } = await supabase
    .from("pedidos_recolha")
    .update({
      status: "pending",
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "draft");

  if (error) throw new Error(error.message);
  revalidatePath("/logistica/pedidos");
  return { success: true };
}
