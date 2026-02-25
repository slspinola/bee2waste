"use client";

import { Camera } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { EntradaVisionReading } from "@/types/brighterbins";
import { SyncButton } from "./SyncButton";
import { VisionReadingsList } from "./VisionReadingsList";
import { cn } from "@/lib/utils";

interface Props {
  readings: EntradaVisionReading[];
  hasCameraConfigured: boolean;
  parkId: string;
  lastSyncAt: string | null;
}

export function VisionSection({
  readings,
  hasCameraConfigured,
  parkId,
  lastSyncAt,
}: Props) {
  // State A: no cameras associated
  if (!hasCameraConfigured) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 flex flex-col items-center gap-3 text-center">
        <Camera className="h-8 w-8 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium text-foreground">
            Sem câmara configurada
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Associe um dispositivo BrighterBins a este parque para visualizar
            leituras de visão computacional.
          </p>
        </div>
        <Link
          href="/settings/cameras"
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
        >
          <Camera className="h-3.5 w-3.5" />
          Configurar câmaras
        </Link>
      </div>
    );
  }

  // State B: camera configured, no readings yet
  if (readings.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Visão Computacional
          </h3>
          <SyncButton parkId={parkId} />
        </div>
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <Camera className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Sem leituras de visão computacional para esta entrada.
          </p>
          <p className="text-xs text-muted-foreground">
            As leituras são correspondidas por janela temporal de ±10 minutos
            em relação à hora de criação da entrada.
          </p>
        </div>
      </div>
    );
  }

  // State C: readings available
  const latest = readings[0];
  const imgSrc = latest.annotated_img_url ?? latest.image_url;
  const fillLevel = latest.fill_level;
  const isOverflow = fillLevel != null && fillLevel > 100;

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Visão Computacional
          </h3>
          {lastSyncAt && (
            <p className="text-xs text-muted-foreground">
              Última sincronização:{" "}
              {new Date(lastSyncAt).toLocaleString("pt-PT", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
        <SyncButton parkId={parkId} />
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3">
        {/* Fill level */}
        <div className="rounded-md border border-border bg-background p-3 space-y-1.5">
          <p className="text-xs text-muted-foreground">Nível de enchimento</p>
          {fillLevel != null ? (
            <>
              <p
                className={cn(
                  "text-lg font-semibold",
                  isOverflow ? "text-amber-600" : "text-foreground"
                )}
              >
                {isOverflow ? `Overflow ${fillLevel}%` : `${fillLevel}%`}
              </p>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full",
                    isOverflow ? "bg-amber-500" : "bg-primary"
                  )}
                  style={{ width: `${Math.min(fillLevel, 100)}%` }}
                />
              </div>
            </>
          ) : (
            <p className="text-lg font-semibold text-muted-foreground">—</p>
          )}
        </div>

        {/* Contamination */}
        <div className="rounded-md border border-border bg-background p-3 space-y-1.5">
          <p className="text-xs text-muted-foreground">Contaminantes</p>
          <p className="text-lg font-semibold text-foreground">
            {latest.contamination_count}
          </p>
          <div className="flex flex-wrap gap-1">
            {latest.contamination && latest.contamination.length > 0 ? (
              latest.contamination.slice(0, 2).map((c) => (
                <span
                  key={c}
                  className="px-1 py-0.5 rounded text-xs bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                >
                  {c}
                </span>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">Nenhum</span>
            )}
          </div>
        </div>

        {/* Device */}
        <div className="rounded-md border border-border bg-background p-3 space-y-1.5">
          <p className="text-xs text-muted-foreground">Dispositivo</p>
          <p className="text-sm font-medium text-foreground truncate">
            {latest.device_name ?? latest.device_id}
          </p>
          {latest.battery_level != null && (
            <p className="text-xs text-muted-foreground">
              Bateria: {latest.battery_level}%
            </p>
          )}
        </div>
      </div>

      {/* Hero image */}
      <div className="relative rounded-lg overflow-hidden aspect-video bg-muted flex items-center justify-center">
        {imgSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgSrc}
            alt="Leitura de visão computacional"
            className="w-full h-full object-contain"
          />
        ) : (
          <Camera className="h-12 w-12 text-muted-foreground" />
        )}
        {/* Overlays */}
        {fillLevel != null && (
          <span
            className={cn(
              "absolute top-2 left-2 px-2 py-1 rounded text-xs font-medium",
              isOverflow ? "bg-amber-500 text-white" : "bg-black/60 text-white"
            )}
          >
            {isOverflow ? `Overflow ${fillLevel}%` : `${fillLevel}%`}
          </span>
        )}
        {latest.contamination_count > 0 && (
          <span className="absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium bg-red-600/80 text-white">
            {latest.contamination_count} contaminante
            {latest.contamination_count !== 1 ? "s" : ""}
          </span>
        )}
        <span className="absolute bottom-2 right-2 px-2 py-1 rounded text-xs bg-black/60 text-white">
          {new Date(latest.uplink_time).toLocaleString("pt-PT", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {/* Gallery */}
      {readings.length > 1 && (
        <VisionReadingsList readings={readings.slice(1)} />
      )}
    </div>
  );
}
