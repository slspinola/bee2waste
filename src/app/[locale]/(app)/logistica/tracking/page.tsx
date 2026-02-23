"use client";
import dynamic from "next/dynamic";
import { useCurrentPark } from "@/hooks/use-current-park";
import { Radio } from "lucide-react";

const BaseMap = dynamic(() => import("@/components/maps/base-map"), {
  ssr: false,
});
const VehicleMarkers = dynamic(
  () => import("@/components/maps/vehicle-markers"),
  { ssr: false }
);
const OrderMarkers = dynamic(
  () => import("@/components/maps/order-markers"),
  { ssr: false }
);

export default function TrackingPage() {
  const { currentParkId } = useCurrentPark();

  return (
    <div className="flex flex-col h-[calc(100vh-70px)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-sidebar">
        <div className="flex items-center gap-3">
          <Radio className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold text-foreground">
            Tracking em Tempo Real
          </h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          Atualização automática a cada 30s
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 px-6 py-2 border-b border-border bg-card text-sm">
        <div className="flex items-center gap-2">
          <span className="text-base">🚛</span>
          <span className="text-muted-foreground">Viatura em rota</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-blue-500" />
          <span className="text-muted-foreground">Pedido normal</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-amber-500" />
          <span className="text-muted-foreground">Pedido urgente</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-red-500" />
          <span className="text-muted-foreground">Pedido crítico</span>
        </div>
      </div>

      {/* Full-height map */}
      <div className="flex-1">
        {currentParkId ? (
          <BaseMap zoom={8} height="100%">
            <VehicleMarkers />
            <OrderMarkers
              statusFilter={[
                "pending",
                "planned",
                "on_route",
                "at_client",
              ]}
            />
          </BaseMap>
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Selecione um parque para ver o mapa
          </div>
        )}
      </div>
    </div>
  );
}
