"use server";
import { createClient } from "@/lib/supabase/server";

// Planning score weights (sum = 0.90 — capacity_fit requires a vehicle and is applied separately)
const WEIGHTS = {
  priority: 0.30,       // order priority (critical=1.0, urgent=0.6, normal=0.2)
  sla_urgency: 0.20,    // days until SLA deadline (0-1 normalized, closer = higher)
  supplier_score: 0.15, // LQI score from supplier_scores (normalized 0-1, inverted)
  wait_time: 0.15,      // days since order created (older = higher)
  waste_value: 0.10,    // relative to other pending orders (normalized by quantidade_estimada_kg)
};

export type ScoredOrder = {
  id: string;
  numero_pedido: string;
  morada_recolha: string;
  cidade_recolha: string | null;
  prioridade: "normal" | "urgent" | "critical";
  quantidade_estimada_kg: number | null;
  collection_lat: number | null;
  collection_lng: number | null;
  sla_deadline: string | null;
  created_at: string;
  client_name: string | null;
  planning_score: number;           // 0-100
  score_breakdown: {
    priority: number;
    sla_urgency: number;
    supplier_score: number;
    wait_time: number;
    waste_value: number;
  };
};

export async function calculatePlanningScores(
  parkId: string,
  _viaturaCapacidadeKg?: number
): Promise<ScoredOrder[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");

  // Fetch pending orders with client info
  const { data: orders, error } = await supabase
    .from("pedidos_recolha")
    .select(
      "id, numero_pedido, morada_recolha, cidade_recolha, prioridade, quantidade_estimada_kg, collection_lat, collection_lng, sla_deadline, created_at, client_id, clients(name)"
    )
    .eq("park_id", parkId)
    .eq("status", "pending");

  if (error) throw new Error(error.message);
  if (!orders?.length) return [];

  // Fetch supplier scores for clients in this list
  const clientIds = [
    ...new Set(orders.map((o) => o.client_id).filter(Boolean)),
  ] as string[];

  const { data: scores } = clientIds.length
    ? await supabase
        .from("supplier_scores")
        .select("client_id, avg_lqi")
        .eq("park_id", parkId)
        .in("client_id", clientIds)
    : { data: [] };

  const scoreMap = new Map<string, number>(
    (scores ?? []).map((s) => [s.client_id, s.avg_lqi ?? 0])
  );

  const now = Date.now();
  const maxKg = Math.max(
    ...orders.map((o) => o.quantidade_estimada_kg ?? 0),
    1
  );
  const maxWaitDays = Math.max(
    ...orders.map(
      (o) => (now - new Date(o.created_at).getTime()) / 86_400_000
    ),
    1
  );

  const scored = orders.map((o) => {
    // Priority score
    const priorityScore =
      o.prioridade === "critical"
        ? 1.0
        : o.prioridade === "urgent"
          ? 0.6
          : 0.2;

    // SLA urgency (0 days or overdue = 1.0, 30+ days away = 0)
    let slaScore = 0;
    if (o.sla_deadline) {
      const daysUntil =
        (new Date(o.sla_deadline).getTime() - now) / 86_400_000;
      slaScore = daysUntil <= 0 ? 1.0 : Math.max(0, 1 - daysUntil / 30);
    }

    // Supplier score — lower quality suppliers get higher priority (invert LQI 0-5 → 0-1)
    const lqi = scoreMap.get(o.client_id ?? "") ?? 2.5;
    const supplierScore = 1 - lqi / 5;

    // Wait time — older orders score higher (days since created / max wait days)
    const waitDays =
      (now - new Date(o.created_at).getTime()) / 86_400_000;
    const waitScore = Math.min(waitDays / maxWaitDays, 1);

    // Waste value — more kg = higher score (relative to batch max)
    const wasteScore = Math.min((o.quantidade_estimada_kg ?? 0) / maxKg, 1);

    // Weighted composite (all weights sum to 0.90 when no vehicle is provided)
    const raw =
      priorityScore * WEIGHTS.priority +
      slaScore * WEIGHTS.sla_urgency +
      supplierScore * WEIGHTS.supplier_score +
      waitScore * WEIGHTS.wait_time +
      wasteScore * WEIGHTS.waste_value;

    // Normalize to 0-100 based on max possible weight sum (0.90)
    const normalizedScore = raw / 0.9;

    return {
      id: o.id,
      numero_pedido: o.numero_pedido,
      morada_recolha: o.morada_recolha,
      cidade_recolha: o.cidade_recolha,
      prioridade: o.prioridade as "normal" | "urgent" | "critical",
      quantidade_estimada_kg: o.quantidade_estimada_kg,
      collection_lat: o.collection_lat,
      collection_lng: o.collection_lng,
      sla_deadline: o.sla_deadline,
      created_at: o.created_at,
      client_name:
        (o.clients as unknown as { name: string } | null)?.name ?? null,
      planning_score: Math.round(normalizedScore * 100),
      score_breakdown: {
        priority: Math.round(priorityScore * 100),
        sla_urgency: Math.round(slaScore * 100),
        supplier_score: Math.round(supplierScore * 100),
        wait_time: Math.round(waitScore * 100),
        waste_value: Math.round(wasteScore * 100),
      },
    };
  });

  // Sort descending by planning_score
  return scored.sort((a, b) => b.planning_score - a.planning_score);
}
