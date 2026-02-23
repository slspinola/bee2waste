"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCurrentPark } from "@/hooks/use-current-park";
import { Link } from "@/i18n/navigation";
import { Plus, Search, Boxes, CheckCircle, FlaskConical, Circle } from "lucide-react";

interface Lot {
  id: string;
  lot_number: string;
  name: string | null;
  status: "open" | "in_treatment" | "closed";
  allowed_ler_codes: string[];
  raw_grade: number | null;
  transformed_grade: number | null;
  yield_rate: number | null;
  lqi_grade: "A" | "B" | "C" | "D" | "E" | null;
  lot_quality_index: number | null;
  total_input_kg: number;
  total_output_kg: number | null;
  opened_at: string;
  closed_at: string | null;
}

const STATUS_CONFIG = {
  open:         { label: "Aberto",        icon: Circle,        className: "text-blue-600 bg-blue-50" },
  in_treatment: { label: "Em Tratamento", icon: FlaskConical,  className: "text-amber-600 bg-amber-50" },
  closed:       { label: "Fechado",       icon: CheckCircle,   className: "text-success bg-success-surface" },
};

const LQI_COLORS: Record<string, string> = {
  A: "bg-green-100 text-green-700",
  B: "bg-blue-100 text-blue-700",
  C: "bg-amber-100 text-amber-700",
  D: "bg-orange-100 text-orange-700",
  E: "bg-red-100 text-red-700",
};

export default function LotsPage() {
  const { currentParkId } = useCurrentPark();
  const [lots, setLots] = useState<Lot[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    async function fetchLots() {
      if (!currentParkId) return;
      const supabase = createClient();
      const { data } = await supabase
        .from("lots")
        .select("id, lot_number, name, status, allowed_ler_codes, raw_grade, transformed_grade, yield_rate, lqi_grade, lot_quality_index, total_input_kg, total_output_kg, opened_at, closed_at")
        .eq("park_id", currentParkId)
        .order("opened_at", { ascending: false })
        .limit(100) as { data: Lot[] | null };
      if (data) setLots(data);
    }
    fetchLots();
  }, [currentParkId]);

  const filtered = lots.filter((l) => {
    const matchSearch = !search ||
      l.lot_number.toLowerCase().includes(search.toLowerCase()) ||
      l.name?.toLowerCase().includes(search.toLowerCase()) ||
      l.allowed_ler_codes.some((c) => c.includes(search));
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openCount = lots.filter((l) => l.status === "open").length;
  const treatmentCount = lots.filter((l) => l.status === "in_treatment").length;
  const closedCount = lots.filter((l) => l.status === "closed").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Lotes</h1>
          <p className="text-sm text-muted-foreground">Rastreabilidade e qualidade de resíduos por lote</p>
        </div>
        <Link
          href="/lots/new"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" /> Novo Lote
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Abertos</p>
          <p className="text-2xl font-bold text-blue-600">{openCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Em Tratamento</p>
          <p className="text-2xl font-bold text-warning">{treatmentCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Fechados</p>
          <p className="text-2xl font-bold text-success">{closedCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar lotes, LER..."
            className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">Todos os estados</option>
          <option value="open">Abertos</option>
          <option value="in_treatment">Em Tratamento</option>
          <option value="closed">Fechados</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Nº Lote</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Estado</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Códigos LER</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Entrada (kg)</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Grau Raw</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Yield</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">LQI</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Abertura</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((lot) => {
              const cfg = STATUS_CONFIG[lot.status];
              const StatusIcon = cfg.icon;
              return (
                <tr key={lot.id} className="border-b border-border last:border-0 hover:bg-accent/50">
                  <td className="px-4 py-3 text-sm">
                    <Link href={`/lots/${lot.id}`} className="font-medium text-primary hover:underline">
                      {lot.lot_number}
                    </Link>
                    {lot.name && <p className="text-xs text-muted-foreground">{lot.name}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}>
                      <StatusIcon className="h-3 w-3" />
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex flex-wrap gap-1">
                      {lot.allowed_ler_codes.slice(0, 3).map((c) => (
                        <span key={c} className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">{c}</span>
                      ))}
                      {lot.allowed_ler_codes.length > 3 && (
                        <span className="text-xs text-muted-foreground">+{lot.allowed_ler_codes.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-mono">
                    {lot.total_input_kg.toLocaleString("pt-PT")}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    {lot.raw_grade ? (
                      <span className="font-medium">{lot.raw_grade.toFixed(1)}/5</span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-mono">
                    {lot.yield_rate != null ? `${lot.yield_rate.toFixed(1)}%` : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {lot.lqi_grade ? (
                      <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${LQI_COLORS[lot.lqi_grade] || ""}`}>
                        {lot.lqi_grade}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {new Date(lot.opened_at).toLocaleDateString("pt-PT")}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  <Boxes className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                  {lots.length === 0 ? "Nenhum lote registado" : "Sem resultados"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
