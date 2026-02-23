"use client";
import { useEffect, useState } from "react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { createClient } from "@/lib/supabase/client";
import { useCurrentPark } from "@/hooks/use-current-park";

type VehiclePosition = {
  viatura_id: string;
  matricula: string;
  motorista_nome: string | null;
  lat: number;
  lng: number;
  velocidade_kmh: number | null;
  timestamp_posicao: string;
};

// Custom truck icon
const truckIcon = new L.DivIcon({
  html: `<div style="background:#5a6268;color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;border:2px solid white;font-size:14px;">🚛</div>`,
  className: "",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

export default function VehicleMarkers() {
  const { currentParkId } = useCurrentPark();
  const [positions, setPositions] = useState<VehiclePosition[]>([]);

  useEffect(() => {
    if (!currentParkId) return;
    const supabase = createClient();

    const load = () => {
      // Get latest position per vehicle using a subquery approach
      supabase
        .from("posicoes_viaturas")
        .select(`
          viatura_id,
          lat,
          lng,
          velocidade_kmh,
          timestamp_posicao,
          viaturas!inner(matricula, park_id)
        `)
        .eq("viaturas.park_id", currentParkId)
        .order("timestamp_posicao", { ascending: false })
        .limit(200)
        .then(({ data }) => {
          if (!data) return;
          // Deduplicate: keep only the latest per viatura_id
          const seen = new Set<string>();
          const latest = data.filter((p) => {
            if (seen.has(p.viatura_id)) return false;
            seen.add(p.viatura_id);
            return true;
          });
          setPositions(
            latest.map((p) => ({
              viatura_id: p.viatura_id,
              matricula: (
                p.viaturas as unknown as { matricula: string }
              ).matricula,
              motorista_nome: null,
              lat: p.lat,
              lng: p.lng,
              velocidade_kmh: p.velocidade_kmh,
              timestamp_posicao: p.timestamp_posicao,
            }))
          );
        });
    };

    load();
    // Fallback polling every 30 seconds
    const interval = setInterval(load, 30_000);

    // Primary: Supabase Realtime for instant position updates
    const channel = supabase
      .channel("posicoes_viaturas_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "posicoes_viaturas",
        },
        (payload) => {
          const newPos = payload.new as {
            viatura_id: string;
            lat: number;
            lng: number;
            velocidade_kmh: number | null;
            timestamp_posicao: string;
          };
          setPositions((prev) => {
            const filtered = prev.filter(
              (p) => p.viatura_id !== newPos.viatura_id
            );
            return [
              ...filtered,
              {
                viatura_id: newPos.viatura_id,
                matricula:
                  prev.find((p) => p.viatura_id === newPos.viatura_id)
                    ?.matricula ?? "—",
                motorista_nome: null,
                lat: newPos.lat,
                lng: newPos.lng,
                velocidade_kmh: newPos.velocidade_kmh,
                timestamp_posicao: newPos.timestamp_posicao,
              },
            ];
          });
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [currentParkId]);

  return (
    <>
      {positions.map((v) => (
        <Marker
          key={v.viatura_id}
          position={[v.lat, v.lng]}
          icon={truckIcon}
        >
          <Popup>
            <strong>{v.matricula}</strong>
            <br />
            {v.motorista_nome && (
              <>
                {v.motorista_nome}
                <br />
              </>
            )}
            {v.velocidade_kmh != null && (
              <>
                Velocidade: {v.velocidade_kmh} km/h
                <br />
              </>
            )}
            Último sinal:{" "}
            {new Date(v.timestamp_posicao).toLocaleTimeString("pt-PT")}
          </Popup>
        </Marker>
      ))}
    </>
  );
}
