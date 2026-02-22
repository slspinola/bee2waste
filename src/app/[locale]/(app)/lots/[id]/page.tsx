"use client";

import { use, useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Link } from "@/i18n/navigation";
import {
  ArrowLeft, Boxes, CheckCircle, FlaskConical, Circle,
  Warehouse, X, Star, TrendingUp, Scale, Layers3,
  PackageCheck, AlertTriangle,
} from "lucide-react";
import { startTreatment, closeLot, releaseZone } from "@/actions/lots";
import { toast } from "sonner";

interface LotDetail {
  id: string;
  lot_number: string;
  name: string | null;
  status: "open" | "in_treatment" | "closed";
  allowed_ler_codes: string[];
  raw_grade: number | null;
  transformed_grade: number | null;
  yield_rate: number | null;
  lot_quality_index: number | null;
  lqi_grade: "A" | "B" | "C" | "D" | "E" | null;
  total_input_kg: number;
  total_output_kg: number | null;
  opened_at: string;
  treatment_started_at: string | null;
  closed_at: string | null;
  notes: string | null;
}

interface LotZone {
  id: string;
  zone_id: string;
  added_at: string;
  removed_at: string | null;
  storage_areas: {
    id: string;
    code: string;
    name: string;
    is_blocked: boolean;
    area_groups: { name: string } | null;
  };
}

interface LotEntry {
  id: string;
  entry_id: string;
  contribution_kg: number;
  entry_raw_grade: number | null;
  added_at: string;
  entries: {
    entry_number: string;
    ler_code: string;
    net_weight_kg: number | null;
    inspection_result: string;
    vehicle_plate: string;
    confirmed_at: string | null;
  };
}

const STATUS_CONFIG = {
  open:         { label: "Aberto",        icon: Circle,        className: "text-blue-600 bg-blue-50" },
  in_treatment: { label: "Em Tratamento", icon: FlaskConical,  className: "text-amber-600 bg-amber-50" },
  closed:       { label: "Fechado",       icon: CheckCircle,   className: "text-success bg-success-surface" },
};

const LQI_COLORS: Record<string, string> = {
  A: "bg-green-100 text-green-700 ring-green-200",
  B: "bg-blue-100 text-blue-700 ring-blue-200",
  C: "bg-amber-100 text-amber-700 ring-amber-200",
  D: "bg-orange-100 text-orange-700 ring-orange-200",
  E: "bg-red-100 text-red-700 ring-red-200",
};

const INSPECTION_LABELS: Record<string, { label: string; color: string }> = {
  approved:                  { label: "Aprovado",           color: "text-success" },
  approved_with_divergence:  { label: "Aprovado c/ desvio", color: "text-warning" },
  rejected:                  { label: "Rejeitado",          color: "text-destructive" },
};

function GradeBar({ value, max = 5 }: { value: number | null; max?: number }) {
  if (value == null) return <span className="text-muted-foreground text-sm">—</span>;
  const pct = (value / max) * 100;
  const color = value >= 4 ? "bg-success" : value >= 3 ? "bg-warning" : "bg-destructive";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-muted">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-mono font-medium w-10 text-right">{value.toFixed(1)}/5</span>
    </div>
  );
}

export default function LotDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [lot, setLot] = useState<LotDetail | null>(null);
  const [zones, setZones] = useState<LotZone[]>([]);
  const [entries, setEntries] = useState<LotEntry[]>([]);
  const [activeTab, setActiveTab] = useState<"zones" | "entries">("zones");
  const [loading, setLoading] = useState(true);

  // Actions state
  const [actionLoading, setActionLoading] = useState(false);
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [closeFormData, setCloseFormData] = useState({
    transformed_grade: 3,
    total_output_kg: "",
    notes: "",
  });

  const load = useCallback(async function load() {
    const supabase = createClient();
    const [
      { data: lotData },
      { data: zonesData },
      { data: entriesData },
    ] = await Promise.all([
      supabase
        .from("lots")
        .select("id, lot_number, name, status, allowed_ler_codes, raw_grade, transformed_grade, yield_rate, lot_quality_index, lqi_grade, total_input_kg, total_output_kg, opened_at, treatment_started_at, closed_at, notes")
        .eq("id", id)
        .single(),
      supabase
        .from("lot_zones")
        .select("id, zone_id, added_at, removed_at, storage_areas(id, code, name, is_blocked, area_groups(name))")
        .eq("lot_id", id)
        .order("added_at"),
      supabase
        .from("lot_entries")
        .select("id, entry_id, contribution_kg, entry_raw_grade, added_at, entries(entry_number, ler_code, net_weight_kg, inspection_result, vehicle_plate, confirmed_at)")
        .eq("lot_id", id)
        .order("added_at", { ascending: false }),
    ]);

    if (lotData) setLot(lotData as LotDetail);
    if (zonesData) setZones(zonesData as unknown as LotZone[]);
    if (entriesData) setEntries(entriesData as unknown as LotEntry[]);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleStartTreatment() {
    if (!confirm("Iniciar tratamento? As zonas associadas serão bloqueadas.")) return;
    setActionLoading(true);
    try {
      await startTreatment(id);
      toast.success("Tratamento iniciado. Zonas bloqueadas.");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao iniciar tratamento");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCloseLot() {
    const outputKg = parseFloat(closeFormData.total_output_kg);
    if (isNaN(outputKg) || outputKg < 0) {
      toast.error("Introduza um peso de saída válido");
      return;
    }
    setActionLoading(true);
    try {
      await closeLot({
        lot_id: id,
        transformed_grade: closeFormData.transformed_grade,
        total_output_kg: outputKg,
        notes: closeFormData.notes || undefined,
      });
      toast.success("Lote fechado e LQI calculado.");
      setShowCloseForm(false);
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao fechar lote");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReleaseZone(zoneId: string) {
    if (!confirm("Libertar esta zona manualmente?")) return;
    try {
      await releaseZone(zoneId);
      toast.success("Zona libertada");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao libertar zona");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-sm text-muted-foreground">A carregar...</div>
      </div>
    );
  }

  if (!lot) {
    return (
      <div className="space-y-4">
        <Link href="/lots" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Lotes
        </Link>
        <p className="text-sm text-muted-foreground">Lote não encontrado.</p>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[lot.status];
  const StatusIcon = cfg.icon;
  const activeZones = zones.filter((z) => !z.removed_at);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link href="/lots" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Lotes
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-surface">
            <Boxes className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold font-mono">{lot.lot_number}</h1>
              {lot.name && <span className="text-muted-foreground">— {lot.name}</span>}
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}>
                <StatusIcon className="h-3 w-3" />
                {cfg.label}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Aberto em {new Date(lot.opened_at).toLocaleDateString("pt-PT")}
              {lot.treatment_started_at && ` · Tratamento em ${new Date(lot.treatment_started_at).toLocaleDateString("pt-PT")}`}
              {lot.closed_at && ` · Fechado em ${new Date(lot.closed_at).toLocaleDateString("pt-PT")}`}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {lot.status === "open" && (
            <button
              onClick={handleStartTreatment}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
            >
              <FlaskConical className="h-4 w-4" /> Iniciar Tratamento
            </button>
          )}
          {lot.status === "in_treatment" && !showCloseForm && (
            <button
              onClick={() => setShowCloseForm(true)}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
            >
              <PackageCheck className="h-4 w-4" /> Fechar Lote
            </button>
          )}
        </div>
      </div>

      {/* LER Codes */}
      <div className="flex flex-wrap gap-2">
        {lot.allowed_ler_codes.map((c) => (
          <span key={c} className="rounded-md bg-muted px-2.5 py-1 text-xs font-mono font-medium">
            {c}
          </span>
        ))}
      </div>

      {/* Quality metrics */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Scale className="h-4 w-4" />
            <span className="text-xs">Entrada Total</span>
          </div>
          <p className="text-xl font-bold font-mono">{lot.total_input_kg.toLocaleString("pt-PT")} <span className="text-sm font-normal text-muted-foreground">kg</span></p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs">Saída Total</span>
          </div>
          <p className="text-xl font-bold font-mono">
            {lot.total_output_kg != null ? `${lot.total_output_kg.toLocaleString("pt-PT")} kg` : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs">Taxa de Rendimento</span>
          </div>
          <p className="text-xl font-bold">
            {lot.yield_rate != null ? `${lot.yield_rate.toFixed(1)}%` : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Star className="h-4 w-4" />
              <span className="text-xs">Índice LQI</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {lot.lot_quality_index != null ? lot.lot_quality_index.toFixed(2) : "—"}
            </p>
          </div>
          {lot.lqi_grade ? (
            <div className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold ring-2 ${LQI_COLORS[lot.lqi_grade] || ""}`}>
              {lot.lqi_grade}
            </div>
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground text-lg font-bold">
              —
            </div>
          )}
        </div>
      </div>

      {/* Grade panel */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <h3 className="text-sm font-medium">Grau Matéria-Prima (raw)</h3>
          <GradeBar value={lot.raw_grade} />
          <p className="text-xs text-muted-foreground">Média ponderada das inspeções de entrada</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <h3 className="text-sm font-medium">Grau Produto Final (transformed)</h3>
          <GradeBar value={lot.transformed_grade} />
          <p className="text-xs text-muted-foreground">Avaliado no encerramento do lote</p>
        </div>
      </div>

      {/* Close lot form */}
      {showCloseForm && (
        <div className="rounded-lg border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Fechar Lote</h3>
            <button onClick={() => setShowCloseForm(false)} className="rounded p-1 hover:bg-accent">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Grau Produto Final *</label>
              <p className="text-xs text-muted-foreground mb-1">Avaliação da qualidade do produto processado (1 = Mau, 5 = Excelente)</p>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={0.5}
                  value={closeFormData.transformed_grade}
                  onChange={(e) => setCloseFormData((p) => ({ ...p, transformed_grade: parseFloat(e.target.value) }))}
                  className="flex-1"
                />
                <span className="text-lg font-bold font-mono w-12 text-right">
                  {closeFormData.transformed_grade.toFixed(1)}
                </span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Peso de Saída (kg) *</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={closeFormData.total_output_kg}
                onChange={(e) => setCloseFormData((p) => ({ ...p, total_output_kg: e.target.value }))}
                placeholder="0.00"
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">Notas <span className="text-muted-foreground font-normal">(opcional)</span></label>
              <textarea
                value={closeFormData.notes}
                onChange={(e) => setCloseFormData((p) => ({ ...p, notes: e.target.value }))}
                rows={2}
                className="mt-1 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          {lot.total_input_kg > 0 && closeFormData.total_output_kg && (
            <div className="rounded-md bg-muted/50 p-3 text-sm">
              <span className="text-muted-foreground">Taxa de rendimento estimada: </span>
              <span className="font-semibold">
                {((parseFloat(closeFormData.total_output_kg) / lot.total_input_kg) * 100).toFixed(1)}%
              </span>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleCloseLot}
              disabled={actionLoading || !closeFormData.total_output_kg}
              className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
            >
              {actionLoading ? "A fechar..." : "Confirmar Fecho"}
            </button>
            <button
              onClick={() => setShowCloseForm(false)}
              className="rounded-md border border-border px-5 py-2 text-sm font-medium hover:bg-accent"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Notes */}
      {lot.notes && (
        <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Notas: </span>{lot.notes}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-1">
          {(["zones", "entries"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "zones" ? `Zonas (${activeZones.length})` : `Entradas (${entries.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Zones tab */}
      {activeTab === "zones" && (
        <div className="space-y-3">
          {activeZones.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma zona associada</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {activeZones.map((lz) => {
                const zone = lz.storage_areas;
                return (
                  <div
                    key={lz.id}
                    className={`rounded-lg border p-4 ${
                      zone.is_blocked ? "border-warning bg-warning-surface/30" : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Warehouse className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono font-medium">
                              {zone.code}
                            </span>
                            <span className="text-sm font-medium">{zone.name}</span>
                          </div>
                          {zone.area_groups?.name && (
                            <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                              <Layers3 className="h-3 w-3" />
                              {zone.area_groups.name}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {zone.is_blocked ? (
                          <>
                            <span className="flex items-center gap-1 text-xs font-medium text-warning">
                              <AlertTriangle className="h-3 w-3" /> Bloqueada
                            </span>
                            {lot.status !== "closed" && (
                              <button
                                onClick={() => handleReleaseZone(zone.id)}
                                className="rounded px-2 py-0.5 text-xs font-medium text-muted-foreground border border-border hover:text-foreground hover:border-foreground"
                              >
                                Libertar
                              </button>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-success font-medium">Disponível</span>
                        )}
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Adicionada em {new Date(lz.added_at).toLocaleDateString("pt-PT")}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Entries tab */}
      {activeTab === "entries" && (
        <div className="rounded-lg border border-border">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Nº Entrada</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">LER</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Matrícula</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Contribuição (kg)</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Inspeção</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Grau Entry</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Data</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((le) => {
                const entry = le.entries;
                const inspCfg = entry ? INSPECTION_LABELS[entry.inspection_result] : null;
                return (
                  <tr key={le.id} className="border-b border-border last:border-0 hover:bg-accent/50">
                    <td className="px-4 py-3 text-sm">
                      <Link href={`/entries/${le.entry_id}`} className="font-mono font-medium text-primary hover:underline">
                        {entry?.entry_number || le.entry_id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">{entry?.ler_code || "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono">{entry?.vehicle_plate || "—"}</td>
                    <td className="px-4 py-3 text-right text-sm font-mono">
                      {le.contribution_kg.toLocaleString("pt-PT")}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {inspCfg ? (
                        <span className={`text-xs font-medium ${inspCfg.color}`}>{inspCfg.label}</span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {le.entry_raw_grade != null ? (
                        <span className="font-mono font-medium">{le.entry_raw_grade.toFixed(1)}/5</span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {entry?.confirmed_at
                        ? new Date(entry.confirmed_at).toLocaleDateString("pt-PT")
                        : new Date(le.added_at).toLocaleDateString("pt-PT")}
                    </td>
                  </tr>
                );
              })}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    Nenhuma entrada associada a este lote
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
