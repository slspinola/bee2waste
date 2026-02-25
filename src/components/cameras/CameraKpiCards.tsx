"use client";

import { Camera, Droplets, TrendingUp, Truck } from "lucide-react";

interface CameraKpiCardsProps {
  total: number;
  coveredTrucks: number;
  avgFill: number;
  overflow: number;
  periodLabel: string;
}

export function CameraKpiCards({
  total,
  coveredTrucks,
  avgFill,
  overflow,
  periodLabel,
}: CameraKpiCardsProps) {
  const coveredPct = total > 0 ? Math.round((coveredTrucks / total) * 100) : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <Camera className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Total de Leituras</p>
        </div>
        <p className="text-2xl font-bold">{total}</p>
        <p className="text-xs text-muted-foreground mt-1">{periodLabel}</p>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <Truck className="h-4 w-4 text-orange-500" />
          <p className="text-sm text-muted-foreground">Viaturas Cobertas</p>
        </div>
        <p className="text-2xl font-bold text-orange-600">{coveredTrucks}</p>
        <p className="text-xs text-muted-foreground mt-1">{coveredPct}% do total</p>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <Droplets className="h-4 w-4 text-blue-500" />
          <p className="text-sm text-muted-foreground">Enchimento Médio</p>
        </div>
        <p className="text-2xl font-bold">{isNaN(avgFill) ? "ND" : `${Math.round(avgFill)}%`}</p>
        <p className="text-xs text-muted-foreground mt-1">última leitura por dispositivo</p>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-4 w-4 text-amber-500" />
          <p className="text-sm text-muted-foreground">Overflow</p>
        </div>
        <p className="text-2xl font-bold text-amber-600">{overflow}</p>
        <p className="text-xs text-muted-foreground mt-1">eventos de excesso</p>
      </div>
    </div>
  );
}
