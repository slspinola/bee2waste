"use client";

import { useState, useEffect } from "react";
import { Scale, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface WeighingPanelProps {
  label: string;
  scaleId?: string;
  onCapture: (weight: number) => void;
  currentWeight?: number;
  disabled?: boolean;
  context?: "gross" | "tare";
  grossWeight?: number;
}

export function WeighingPanel({
  label,
  scaleId,
  onCapture,
  currentWeight,
  disabled,
  context,
  grossWeight,
}: WeighingPanelProps) {
  const [reading, setReading] = useState<{
    weight_kg: number;
    stable: boolean;
    timestamp: string;
  } | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualWeight, setManualWeight] = useState("");

  async function readScale() {
    setIsReading(true);
    try {
      const res = await fetch("/api/mock/scale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scale_id: scaleId,
          context,
          gross_weight_kg: grossWeight,
        }),
      });
      const data = await res.json();
      setReading(data);
    } catch {
      setReading(null);
    }
    setIsReading(false);
  }

  // Auto-read scale when component mounts (not in manual mode)
  useEffect(() => {
    if (!manualMode && !currentWeight && !disabled) {
      readScale();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleCapture() {
    if (manualMode) {
      const w = parseFloat(manualWeight);
      if (!isNaN(w) && w > 0) onCapture(w);
    } else if (reading?.stable) {
      onCapture(reading.weight_kg);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">{label}</h3>
        </div>
        <button
          type="button"
          onClick={() => setManualMode(!manualMode)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {manualMode ? "Modo automático" : "Modo manual"}
        </button>
      </div>

      {manualMode ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Peso (kg)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={manualWeight}
              onChange={(e) => setManualWeight(e.target.value)}
              placeholder="Introduza o peso manualmente"
              className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-lg font-mono"
              disabled={disabled}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-center rounded-lg bg-muted/50 p-8">
            <div className="text-center">
              <div className="text-4xl font-bold font-mono tabular-nums">
                {reading ? `${reading.weight_kg.toLocaleString("pt-PT")} kg` : "— kg"}
              </div>
              {reading && (
                <div className={cn(
                  "mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                  reading.stable
                    ? "bg-success-surface text-success"
                    : "bg-warning-surface text-warning"
                )}>
                  <span className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    reading.stable ? "bg-success" : "bg-warning animate-pulse"
                  )} />
                  {reading.stable ? "Estável" : "Instável"}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={readScale}
            disabled={isReading || disabled}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-medium hover:bg-accent disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4", isReading && "animate-spin")} />
            {isReading ? "A ler..." : "Ler Balança"}
          </button>
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={handleCapture}
          disabled={disabled || (!manualMode && (!reading || !reading.stable)) || (manualMode && !manualWeight)}
          className="flex-1 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          Capturar Peso
        </button>
        {currentWeight != null && (
          <span className="text-sm text-muted-foreground">
            Registado: <strong className="font-mono">{currentWeight.toLocaleString("pt-PT")} kg</strong>
          </span>
        )}
      </div>
    </div>
  );
}
