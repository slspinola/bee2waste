"use client";

import { use, useEffect, useState } from "react";
import { ChevronLeft, Camera, Battery, Thermometer, ChevronLeft as Prev, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Link } from "@/i18n/navigation";
import type { EntradaVisionReading } from "@/types/brighterbins";
import { useContaminantLabels } from "@/hooks/use-contaminant-labels";

interface TimelineReading {
  id: string;
  uplink_time: string;
  fill_level: number | null;
  contamination_count: number | null;
}

export default function CameraEventDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = use(params);

  const { labelsMap, colorsMap } = useContaminantLabels();
  const [reading, setReading] = useState<EntradaVisionReading | null>(null);
  const [timeline, setTimeline] = useState<TimelineReading[]>([]);
  const [entryNumber, setEntryNumber] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createClient();

      const { data: r } = await supabase
        .from("entrada_vision_readings")
        .select("*")
        .eq("id", id)
        .single();

      if (!r) {
        setLoading(false);
        return;
      }
      setReading(r as EntradaVisionReading);

      // Fetch timeline (other readings from same entry)
      if (r.entry_id) {
        const { data: tl } = await supabase
          .from("entrada_vision_readings")
          .select("id, uplink_time, fill_level, contamination_count")
          .eq("entry_id", r.entry_id)
          .order("uplink_time", { ascending: true });
        setTimeline((tl ?? []) as TimelineReading[]);

        // Fetch entry number
        const { data: entry } = await supabase
          .from("entries")
          .select("id, entry_number")
          .eq("id", r.entry_id)
          .single();
        setEntryNumber(entry?.entry_number ?? null);
      }

      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
        A carregar...
      </div>
    );
  }

  if (!reading) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <Camera className="h-12 w-12 text-muted-foreground/40" />
        <p className="text-muted-foreground">Evento não encontrado.</p>
        <Link href="/cameras" className="text-sm text-primary hover:underline">
          ← Voltar a Inspeção Visual
        </Link>
      </div>
    );
  }

  const imgSrc = reading.annotated_img_url ?? reading.image_url;
  const fillLevel = reading.fill_level;
  const fillPct = fillLevel != null ? Math.min(fillLevel, 100) : null;
  const contaminants: string[] = Array.isArray(reading.contamination)
    ? (reading.contamination as string[])
    : [];

  const dateStr = new Date(reading.uplink_time).toLocaleString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const syncedStr = reading.synced_at
    ? new Date(reading.synced_at).toLocaleString("pt-PT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;

  // Timeline navigation
  const currentIdx = timeline.findIndex((t) => t.id === id);
  const prevId = currentIdx > 0 ? timeline[currentIdx - 1]?.id : null;
  const nextId = currentIdx < timeline.length - 1 ? timeline[currentIdx + 1]?.id : null;

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href="/cameras"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Voltar a Inspeção Visual
      </Link>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Left: image + timeline */}
        <div className="space-y-4">
          {/* Image */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="relative aspect-video max-h-[500px] bg-muted flex items-center justify-center">
              {imgSrc ? (
                <img
                  src={imgSrc}
                  alt="Leitura de inspeção visual"
                  className="w-full h-full object-contain"
                />
              ) : (
                <Camera className="h-16 w-16 text-muted-foreground/30" />
              )}
              {/* Overlays */}
              <div className="absolute bottom-3 left-3 flex gap-2">
                {fillLevel != null && (
                  <span
                    className={`rounded px-2 py-1 text-sm font-bold ${
                      fillLevel > 100
                        ? "text-amber-600 bg-amber-100"
                        : "text-foreground bg-black/60 text-white"
                    }`}
                  >
                    {fillLevel}%
                  </span>
                )}
                {contaminants.length > 0 && (
                  <span className="rounded px-2 py-1 text-sm font-bold text-red-100 bg-red-700/80">
                    {contaminants.length} resíduo{contaminants.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <div className="absolute bottom-3 right-3 text-xs text-white/80 bg-black/50 rounded px-2 py-1">
                {dateStr}
              </div>
            </div>
          </div>

          {/* Timeline navigation */}
          {timeline.length > 1 && (
            <div className="flex items-center justify-between">
              <Link
                href={prevId ? `/cameras/${prevId}` : "#"}
                className={`inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-md border border-border transition-colors ${
                  prevId
                    ? "hover:bg-accent text-foreground"
                    : "text-muted-foreground pointer-events-none opacity-40"
                }`}
              >
                <Prev className="h-4 w-4" />
                Anterior
              </Link>
              <span className="text-sm text-muted-foreground">
                {currentIdx + 1} de {timeline.length} para esta entrada
              </span>
              <Link
                href={nextId ? `/cameras/${nextId}` : "#"}
                className={`inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-md border border-border transition-colors ${
                  nextId
                    ? "hover:bg-accent text-foreground"
                    : "text-muted-foreground pointer-events-none opacity-40"
                }`}
              >
                Seguinte
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          )}

          {/* Timeline strip */}
          {timeline.length > 1 && (
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs font-medium text-muted-foreground mb-3">Timeline da entrada</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {timeline.map((t) => {
                  const isActive = t.id === id;
                  return (
                    <Link
                      key={t.id}
                      href={`/cameras/${t.id}`}
                      className={`flex-shrink-0 rounded-md border p-2 text-center min-w-[80px] transition-colors ${
                        isActive
                          ? "border-primary bg-primary-surface text-primary"
                          : "border-border hover:border-primary/50 hover:bg-accent"
                      }`}
                    >
                      <p className="text-xs font-mono">
                        {new Date(t.uplink_time).toLocaleTimeString("pt-PT", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t.fill_level != null ? `${t.fill_level}%` : "ND"}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Technical details */}
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm font-semibold mb-3">Detalhes Técnicos</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {reading.bin_id && (
                <>
                  <span className="text-muted-foreground">Bin ID</span>
                  <span className="font-mono">{reading.bin_id}</span>
                </>
              )}
              {reading.image_quality && (
                <>
                  <span className="text-muted-foreground">Qualidade img.</span>
                  <span className="capitalize">{reading.image_quality}</span>
                </>
              )}
              {reading.image_resolution && (
                <>
                  <span className="text-muted-foreground">Resolução</span>
                  <span>{reading.image_resolution}</span>
                </>
              )}
              {reading.orientation && (
                <>
                  <span className="text-muted-foreground">Orientação</span>
                  <span className="capitalize">{reading.orientation}</span>
                </>
              )}
              <span className="text-muted-foreground">Flash</span>
              <span>{reading.flash_on ? "Sim" : "Não"}</span>
              {reading.temperature != null && (
                <>
                  <span className="text-muted-foreground">Temperatura</span>
                  <span>{reading.temperature}°C</span>
                </>
              )}
              {reading.battery_level != null && (
                <>
                  <span className="text-muted-foreground">Bateria</span>
                  <span>
                    {reading.battery_level}%{reading.battery_type ? ` (${reading.battery_type})` : ""}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: info panel */}
        <div className="space-y-4">
          {/* Identification */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Identificação
            </p>
            <p className="font-medium">{reading.device_name ?? "Dispositivo"}</p>
            <p className="text-xs font-mono text-muted-foreground">{reading.device_id}</p>
          </div>

          {/* Fill level */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Enchimento
            </p>
            {fillLevel != null ? (
              <>
                <div className="flex items-end gap-2">
                  <p
                    className={`text-2xl font-bold ${
                      fillLevel > 100 ? "text-amber-600" : "text-foreground"
                    }`}
                  >
                    {fillLevel}%
                  </p>
                  {fillLevel > 100 && (
                    <span className="rounded-full px-2 py-0.5 text-xs font-medium text-amber-600 bg-amber-100 mb-1">
                      OVERFLOW
                    </span>
                  )}
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      fillLevel > 100
                        ? "bg-amber-500"
                        : fillLevel > 80
                          ? "bg-amber-400"
                          : "bg-primary"
                    }`}
                    style={{ width: `${fillPct}%` }}
                  />
                </div>
              </>
            ) : (
              <p className="text-sm font-semibold text-muted-foreground">ND</p>
            )}
          </div>

          {/* Contaminants */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Resíduos Detetados
            </p>
            {contaminants.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {contaminants.map((c) => {
                  const color = colorsMap[c];
                  return (
                    <span
                      key={c}
                      className="rounded-full px-2.5 py-0.5 text-xs font-medium text-red-700 bg-red-50"
                      style={color ? { backgroundColor: color + "20", color } : undefined}
                    >
                      {labelsMap[c] ?? c}
                    </span>
                  );
                })}
              </div>
            ) : (
              <span className="text-xs font-medium text-green-700 bg-green-50 rounded-full px-2.5 py-0.5">
                Nenhum resíduo detetado
              </span>
            )}
          </div>

          {/* Associated entry */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Entrada Associada
            </p>
            {reading.entry_id && entryNumber ? (
              <Link
                href={`/entries/${reading.entry_id}`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                {entryNumber}
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <span className="text-sm text-muted-foreground">Sem entrada correspondente</span>
            )}
          </div>

          {/* Telemetry */}
          {(reading.battery_level != null ||
            reading.temperature != null ||
            reading.flash_on != null) && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Telemetria
              </p>
              <div className="space-y-2">
                {reading.battery_level != null && (
                  <div className="flex items-center gap-2">
                    <Battery className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm text-muted-foreground w-24">Bateria</span>
                    <span className="text-sm font-medium">
                      {reading.battery_level}%
                      {reading.battery_type ? ` (${reading.battery_type})` : ""}
                    </span>
                  </div>
                )}
                {reading.temperature != null && (
                  <div className="flex items-center gap-2">
                    <Thermometer className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm text-muted-foreground w-24">Temperatura</span>
                    <span className="text-sm font-medium">{reading.temperature}°C</span>
                  </div>
                )}
                {reading.flash_on != null && (
                  <div className="flex items-center gap-2">
                    <span className="h-4 w-4" />
                    <span className="text-sm text-muted-foreground w-24">Flash</span>
                    <span className="text-sm font-medium">{reading.flash_on ? "Sim" : "Não"}</span>
                  </div>
                )}
                {reading.orientation && (
                  <div className="flex items-center gap-2">
                    <span className="h-4 w-4" />
                    <span className="text-sm text-muted-foreground w-24">Orientação</span>
                    <span className="text-sm font-medium capitalize">{reading.orientation}</span>
                  </div>
                )}
                {reading.image_quality && (
                  <div className="flex items-center gap-2">
                    <span className="h-4 w-4" />
                    <span className="text-sm text-muted-foreground w-24">Img Quality</span>
                    <span className="text-sm font-medium capitalize">{reading.image_quality}</span>
                  </div>
                )}
                {reading.image_resolution && (
                  <div className="flex items-center gap-2">
                    <span className="h-4 w-4" />
                    <span className="text-sm text-muted-foreground w-24">Resolução</span>
                    <span className="text-sm font-medium">{reading.image_resolution}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Metadados
            </p>
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">Captura: </span>
                {dateStr}
              </p>
              {syncedStr && (
                <p>
                  <span className="text-muted-foreground">Sincronizado: </span>
                  {syncedStr}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
