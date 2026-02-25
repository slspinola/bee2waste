"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Camera, RefreshCw, Settings, CheckCircle2, AlertCircle, Filter, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useCurrentPark } from "@/hooks/use-current-park";
import { Link } from "@/i18n/navigation";
import type { EntradaVisionReading } from "@/types/brighterbins";
import { CameraKpiCards } from "@/components/cameras/CameraKpiCards";
import { CameraEventsList } from "@/components/cameras/CameraEventsList";
import { syncBrighterBinsAction } from "@/actions/brighterbins";
import { useContaminantLabels } from "@/hooks/use-contaminant-labels";
import { cn } from "@/lib/utils";

type Period = "7" | "30" | "90";
type StateFilter = "all" | "overflow" | "contaminated" | "clean";
type ContaminantMode = "include" | "exclude";

const PERIOD_LABELS: Record<Period, string> = {
  "7": "nos últimos 7 dias",
  "30": "nos últimos 30 dias",
  "90": "nos últimos 90 dias",
};

export default function CamerasPage() {
  const { currentParkId } = useCurrentPark();
  const { labelsMap, colorsMap } = useContaminantLabels();
  const [readings, setReadings] = useState<EntradaVisionReading[]>([]);
  const [devices, setDevices] = useState<{ device_id: string; device_name: string }[]>([]);
  const [entryNumbers, setEntryNumbers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [syncResult, setSyncResult] = useState<{ synced?: number; error?: string } | null>(null);
  const [isSyncing, startSync] = useTransition();

  const [period, setPeriod] = useState<Period>("30");
  const [deviceFilter, setDeviceFilter] = useState<string>("all");
  const [stateFilter, setStateFilter] = useState<StateFilter>("all");
  const [view, setView] = useState<"grid" | "list">("grid");

  // Contamination type filter
  const [contaminantFilter, setContaminantFilter] = useState<Set<string>>(new Set());
  const [contaminantMode, setContaminantMode] = useState<ContaminantMode>("include");
  const [contaminantOpen, setContaminantOpen] = useState(false);
  const contaminantDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        contaminantDropdownRef.current &&
        !contaminantDropdownRef.current.contains(e.target as Node)
      ) {
        setContaminantOpen(false);
      }
    }
    if (contaminantOpen) {
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }
  }, [contaminantOpen]);

  async function fetchData(parkId: string, days: Period) {
    setLoading(true);
    try {
      const supabase = createClient();
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - parseInt(days));

      const [readingsRes, devicesRes] = await Promise.all([
        supabase
          .from("entrada_vision_readings")
          .select(
            "id, park_id, entry_id, device_id, device_name, bin_id, uplink_time, fill_level, contamination_count, contamination, image_url, annotated_img_url, battery_level, battery_type, temperature, flash_on, orientation, image_quality, image_resolution, synced_at, created_at"
          )
          .eq("park_id", parkId)
          .gte("uplink_time", fromDate.toISOString())
          .order("uplink_time", { ascending: false })
          .limit(200),
        supabase
          .from("park_brighterbins_devices")
          .select("device_id, device_name")
          .eq("park_id", parkId)
          .eq("is_active", true),
      ]);

      const readingsData = (readingsRes.data ?? []) as EntradaVisionReading[];
      setReadings(readingsData);
      setDevices(devicesRes.data ?? []);
      // Reset contaminant filter when data reloads
      setContaminantFilter(new Set());

      // Fetch entry numbers for linked entries
      const entryIds = [...new Set(readingsData.map((r) => r.entry_id).filter(Boolean))] as string[];
      if (entryIds.length > 0) {
        const { data: entries } = await supabase
          .from("entries")
          .select("id, entry_number")
          .in("id", entryIds);
        const map: Record<string, string> = {};
        (entries ?? []).forEach((e: { id: string; entry_number: string }) => {
          map[e.id] = e.entry_number;
        });
        setEntryNumbers(map);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!currentParkId) return;
    fetchData(currentParkId, period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentParkId, period]);

  function handleSync() {
    if (!currentParkId) return;
    setSyncResult(null);
    startSync(async () => {
      try {
        const r = await syncBrighterBinsAction(currentParkId);
        setSyncResult({ synced: r.synced });
        await fetchData(currentParkId, period);
      } catch (err) {
        setSyncResult({ error: err instanceof Error ? err.message : "Erro ao sincronizar" });
      }
    });
  }

  function toggleContaminant(type: string) {
    setContaminantFilter((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  // All unique contaminant types present in the loaded dataset
  const allContaminantTypes = useMemo(() => {
    const types = new Set<string>();
    readings.forEach((r) => {
      if (Array.isArray(r.contamination)) {
        r.contamination.forEach((c) => types.add(c));
      }
    });
    return [...types].sort();
  }, [readings]);

  // KPI calculations (always from full readings, not filtered)
  const total = readings.length;
  const contaminated = readings.filter((r) => (r.contamination_count ?? 0) > 0).length;
  const fillReadings = readings.filter((r) => r.fill_level != null);
  const avgFill =
    fillReadings.length > 0
      ? fillReadings.reduce((sum, r) => sum + r.fill_level!, 0) / fillReadings.length
      : NaN;
  const overflow = readings.filter((r) => (r.fill_level ?? 0) > 100).length;

  // Covered trucks: readings where "covered_truck" appears in contamination
  const coveredTrucks = readings.filter(
    (r) => Array.isArray(r.contamination) && (r.contamination as string[]).includes("covered_truck")
  ).length;

  // Per-waste-type counts, sorted descending
  const wasteTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    readings.forEach((r) => {
      if (Array.isArray(r.contamination)) {
        (r.contamination as string[]).forEach((c) => {
          counts[c] = (counts[c] ?? 0) + 1;
        });
      }
    });
    return Object.entries(counts)
      .filter(([key]) => key !== "no_truck")
      .sort((a, b) => b[1] - a[1]);
  }, [readings]);

  // Filtered readings
  const filtered = readings.filter((r) => {
    if (deviceFilter !== "all" && r.device_id !== deviceFilter) return false;
    if (stateFilter === "overflow") return (r.fill_level ?? 0) > 100;
    if (stateFilter === "contaminated") return (r.contamination_count ?? 0) > 0;
    if (stateFilter === "clean")
      return (r.contamination_count ?? 0) === 0 && (r.fill_level ?? 0) <= 100;

    // Contaminant type filter
    if (contaminantFilter.size > 0) {
      const readingTypes = new Set<string>(
        Array.isArray(r.contamination) ? r.contamination : []
      );
      const hasAnySelected = [...contaminantFilter].some((c) => readingTypes.has(c));
      if (contaminantMode === "include" && !hasAnySelected) return false;
      if (contaminantMode === "exclude" && hasAnySelected) return false;
    }

    return true;
  });

  // No devices at all
  const noDevices = !loading && devices.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Inspeção Visual
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitorização de leituras de inspeção visual por dispositivo
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:pointer-events-none disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "A sincronizar..." : "Sincronizar"}
          </button>
          {syncResult && !syncResult.error && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {syncResult.synced} leitura{syncResult.synced !== 1 ? "s" : ""} sincronizada{syncResult.synced !== 1 ? "s" : ""}
            </span>
          )}
          {syncResult?.error && (
            <span className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5" />
              {syncResult.error}
            </span>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <CameraKpiCards
        total={total}
        coveredTrucks={coveredTrucks}
        avgFill={avgFill}
        overflow={overflow}
        periodLabel={PERIOD_LABELS[period]}
      />

      {/* Waste-type breakdown */}
      {!loading && wasteTypeCounts.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Distribuição por Tipo de Resíduo
          </p>
          <div className="flex flex-wrap gap-2">
            {wasteTypeCounts.map(([type, count]) => {
              const color = colorsMap[type];
              return (
                <div
                  key={type}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-sm"
                >
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-medium text-red-700 bg-red-50"
                    style={color ? { backgroundColor: color + "20", color } : undefined}
                  >
                    {labelsMap[type] ?? type}
                  </span>
                  <span className="font-semibold text-foreground">{count}</span>
                  <span className="text-xs text-muted-foreground">
                    {total > 0 ? `${Math.round((count / total) * 100)}%` : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No devices state */}
      {noDevices && (
        <div className="rounded-lg border border-border bg-card p-12 flex flex-col items-center gap-4 text-center">
          <Camera className="h-12 w-12 text-muted-foreground/40" />
          <div>
            <p className="font-medium">Nenhum dispositivo configurado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Associe dispositivos em Definições → Inspeção Visual
            </p>
          </div>
          <Link
            href="/settings/cameras"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
          >
            <Settings className="h-4 w-4" />
            Ir para Definições
          </Link>
        </div>
      )}

      {/* Filters + list */}
      {!noDevices && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Period */}
            <div className="flex items-center gap-1 rounded-md border border-border p-1">
              {(["7", "30", "90"] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                    period === p
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p === "7" ? "7 dias" : p === "30" ? "30 dias" : "90 dias"}
                </button>
              ))}
            </div>

            {/* Device */}
            {devices.length > 1 && (
              <select
                value={deviceFilter}
                onChange={(e) => setDeviceFilter(e.target.value)}
                className="flex h-9 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              >
                <option value="all">Todos os dispositivos</option>
                {devices.map((d) => (
                  <option key={d.device_id} value={d.device_id}>
                    {d.device_name}
                  </option>
                ))}
              </select>
            )}

            {/* State */}
            <div className="flex items-center gap-1 rounded-md border border-border p-1">
              {([
                ["all", "Todos"],
                ["overflow", "Overflow"],
                ["contaminated", "Contaminação"],
                ["clean", "Limpo"],
              ] as [StateFilter, string][]).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setStateFilter(val)}
                  className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                    stateFilter === val
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Contaminant type filter */}
            {allContaminantTypes.length > 0 && (
              <div className="relative" ref={contaminantDropdownRef}>
                <button
                  onClick={() => setContaminantOpen((o) => !o)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                    contaminantFilter.size > 0
                      ? "border-primary bg-primary-surface text-primary"
                      : "border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <Filter className="h-3.5 w-3.5" />
                  Resíduos
                  {contaminantFilter.size > 0 && (
                    <span className="rounded-full bg-primary text-primary-foreground text-xs leading-none px-1.5 py-0.5">
                      {contaminantFilter.size}
                    </span>
                  )}
                </button>

                {contaminantOpen && (
                  <div className="absolute top-full left-0 mt-1 z-20 w-72 rounded-lg border border-border bg-card shadow-lg">
                    <div className="p-3 space-y-3">
                      {/* Mode toggle: Com / Sem */}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1.5">
                          Mostrar leituras
                        </p>
                        <div className="flex items-center gap-1 rounded-md border border-border p-1">
                          <button
                            onClick={() => setContaminantMode("include")}
                            className={cn(
                              "flex-1 rounded py-1 text-sm font-medium transition-colors",
                              contaminantMode === "include"
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            Com
                          </button>
                          <button
                            onClick={() => setContaminantMode("exclude")}
                            className={cn(
                              "flex-1 rounded py-1 text-sm font-medium transition-colors",
                              contaminantMode === "exclude"
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            Sem
                          </button>
                        </div>
                      </div>

                      {/* Checklist */}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1.5">
                          Tipos de resíduo
                        </p>
                        <div className="space-y-0.5 max-h-52 overflow-y-auto">
                          {allContaminantTypes.map((type) => (
                            <label
                              key={type}
                              className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={contaminantFilter.has(type)}
                                onChange={() => toggleContaminant(type)}
                                className="h-4 w-4 rounded border-border accent-primary"
                              />
                              <span className="text-sm text-foreground">
                                {labelsMap[type] ?? type}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Footer */}
                      {contaminantFilter.size > 0 && (
                        <button
                          onClick={() => setContaminantFilter(new Set())}
                          className="w-full rounded-md border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        >
                          Limpar filtro
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Active contaminant pills */}
            {contaminantFilter.size > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {[...contaminantFilter].map((type) => {
                  const color = colorsMap[type];
                  return (
                    <span
                      key={type}
                      className="inline-flex items-center gap-1 rounded-full bg-primary-surface text-primary text-xs font-medium px-2.5 py-0.5"
                      style={color ? { backgroundColor: color + "20", color } : undefined}
                    >
                      {contaminantMode === "exclude" && (
                        <span className="opacity-60">sem·</span>
                      )}
                      {labelsMap[type] ?? type}
                      <button
                        onClick={() => toggleContaminant(type)}
                        className="ml-0.5 hover:opacity-60 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span className="text-sm">A carregar leituras...</span>
            </div>
          )}

          {/* No readings */}
          {!loading && filtered.length === 0 && (
            <div className="rounded-lg border border-border bg-card p-12 flex flex-col items-center gap-4 text-center">
              <Camera className="h-12 w-12 text-muted-foreground/40" />
              <div>
                <p className="font-medium">Sem leituras no período selecionado</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Tente alargar o intervalo de datas ou sincronize agora.
                </p>
              </div>
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
                {isSyncing ? "A sincronizar..." : "Sincronizar"}
              </button>
            </div>
          )}

          {/* Events list */}
          {!loading && filtered.length > 0 && (
            <CameraEventsList
              readings={filtered}
              entryNumbers={entryNumbers}
              view={view}
              onViewChange={setView}
            />
          )}
        </>
      )}
    </div>
  );
}
