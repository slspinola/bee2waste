"use client";
import { useEffect, useState } from "react";
import { CircleMarker, Popup } from "react-leaflet";
import { createClient } from "@/lib/supabase/client";
import { useCurrentPark } from "@/hooks/use-current-park";
import { Link } from "@/i18n/navigation";

type OrderPoint = {
  id: string;
  numero_pedido: string;
  morada_recolha: string;
  cidade_recolha: string | null;
  prioridade: "normal" | "urgent" | "critical";
  status: string;
  collection_lat: number;
  collection_lng: number;
};

const PRIORITY_COLORS = {
  normal: "#3b82f6",
  urgent: "#f59e0b",
  critical: "#ef4444",
};

type Props = {
  statusFilter?: string[];
};

export default function OrderMarkers({ statusFilter }: Props) {
  const { currentParkId } = useCurrentPark();
  const [orders, setOrders] = useState<OrderPoint[]>([]);

  useEffect(() => {
    if (!currentParkId) return;
    const supabase = createClient();
    let query = supabase
      .from("pedidos_recolha")
      .select(
        "id, numero_pedido, morada_recolha, cidade_recolha, prioridade, status, collection_lat, collection_lng"
      )
      .eq("park_id", currentParkId)
      .not("collection_lat", "is", null)
      .not("collection_lng", "is", null);

    if (statusFilter?.length) {
      query = query.in("status", statusFilter);
    }

    query.then(({ data }) => {
      if (data) setOrders(data as OrderPoint[]);
    });
  }, [currentParkId, statusFilter]);

  return (
    <>
      {orders.map((o) => (
        <CircleMarker
          key={o.id}
          center={[o.collection_lat, o.collection_lng]}
          radius={8}
          pathOptions={{
            fillColor: PRIORITY_COLORS[o.prioridade] ?? "#3b82f6",
            fillOpacity: 0.85,
            color: "#fff",
            weight: 2,
          }}
        >
          <Popup>
            <strong>{o.numero_pedido}</strong>
            <br />
            {o.morada_recolha}
            <br />
            {o.cidade_recolha && (
              <>
                {o.cidade_recolha}
                <br />
              </>
            )}
            <span style={{ textTransform: "capitalize" }}>
              Prioridade: {o.prioridade}
            </span>
            <br />
            <Link
              href={`/logistica/pedidos/${o.id}`}
              className="text-blue-600 underline"
            >
              Ver pedido
            </Link>
          </Popup>
        </CircleMarker>
      ))}
    </>
  );
}
