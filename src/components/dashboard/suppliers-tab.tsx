"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Link } from "@/i18n/navigation";
import { AlertTriangle, ExternalLink } from "lucide-react";

const LQI_GRADE_CLS: Record<string, string> = {
  A: "bg-emerald-100 text-emerald-700",
  B: "bg-green-100 text-green-700",
  C: "bg-amber-100 text-amber-700",
  D: "bg-orange-100 text-orange-700",
  E: "bg-red-100 text-red-700",
};

interface SupplierRow {
  client_id: string;
  name: string;
  nif: string | null;
  score: number | null;
  lqi_grade: string | null;
  avg_yield: number | null;
  lot_count: number;
  total_kg: number;
  period_end: string | null;
  next_predicted: string | null;
  confidence: number | null;
  avg_interval_days: number | null;
}

interface CycleEvent {
  client_id: string;
  name: string;
  predicted_date: string;
  lqi_grade: string | null;
  is_overdue: boolean;
  days_away: number;
}

export function SuppliersTab({ parkId }: { parkId: string }) {
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [cycleEvents, setCycleEvents] = useState<CycleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"score" | "volume" | "next_delivery">(
    "score"
  );

  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createClient();

      const [{ data: scores }, { data: cycles }, { data: clients }] =
        await Promise.all([
          supabase
            .from("supplier_scores")
            .select(
              "client_id, avg_lqi, avg_yield_rate, lot_count, total_kg, period_end, score_letter"
            )
            .eq("park_id", parkId)
            .order("period_end", {
              ascending: false,
            }) as unknown as Promise<{
            data: {
              client_id: string;
              avg_lqi: number | null;
              avg_yield_rate: number | null;
              lot_count: number;
              total_kg: number;
              period_end: string;
              score_letter: string | null;
            }[] | null;
          }>,
          supabase
            .from("client_production_cycles")
            .select(
              "client_id, next_predicted_date, confidence, avg_interval_days"
            )
            .eq("park_id", parkId) as unknown as Promise<{
            data: {
              client_id: string;
              next_predicted_date: string | null;
              confidence: number | null;
              avg_interval_days: number | null;
            }[] | null;
          }>,
          supabase
            .from("clients")
            .select("id, name, nif")
            .in("client_type", ["supplier", "both"]) as unknown as Promise<{
            data: { id: string; name: string; nif: string | null }[] | null;
          }>,
        ]);

      // Build lookup maps
      const latestScores = new Map<
        string,
        {
          avg_lqi: number | null;
          avg_yield_rate: number | null;
          lot_count: number;
          total_kg: number;
          period_end: string;
          score_letter: string | null;
        }
      >();
      if (scores) {
        for (const s of scores) {
          if (!latestScores.has(s.client_id)) {
            latestScores.set(s.client_id, s);
          }
        }
      }

      const cycleMap = new Map<
        string,
        {
          next_predicted_date: string | null;
          confidence: number | null;
          avg_interval_days: number | null;
        }
      >();
      if (cycles) {
        for (const c of cycles) {
          cycleMap.set(c.client_id, c);
        }
      }

      const rows: SupplierRow[] = [];
      const events: CycleEvent[] = [];
      const now = new Date();

      if (clients) {
        for (const client of clients) {
          const score = latestScores.get(client.id);
          const cycle = cycleMap.get(client.id);

          rows.push({
            client_id: client.id,
            name: client.name,
            nif: client.nif,
            score: score?.avg_lqi ?? null,
            lqi_grade: score?.score_letter ?? null,
            avg_yield: score?.avg_yield_rate ?? null,
            lot_count: score?.lot_count ?? 0,
            total_kg: score?.total_kg ?? 0,
            period_end: score?.period_end ?? null,
            next_predicted: cycle?.next_predicted_date ?? null,
            confidence: cycle?.confidence ?? null,
            avg_interval_days: cycle?.avg_interval_days ?? null,
          });

          if (cycle?.next_predicted_date) {
            const predDate = new Date(cycle.next_predicted_date);
            const daysAway = Math.round(
              (predDate.getTime() - now.getTime()) / 86400000
            );
            events.push({
              client_id: client.id,
              name: client.name,
              predicted_date: cycle.next_predicted_date,
              lqi_grade: score?.score_letter ?? null,
              is_overdue: daysAway < 0,
              days_away: daysAway,
            });
          }
        }
      }

      // Sort events by date
      events.sort(
        (a, b) =>
          new Date(a.predicted_date).getTime() -
          new Date(b.predicted_date).getTime()
      );

      setSuppliers(rows);
      setCycleEvents(events.filter((e) => e.days_away <= 30 && e.days_away >= -7));
      setLoading(false);
    }
    load();
  }, [parkId]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-40 rounded-lg bg-muted" />
        <div className="h-64 rounded-lg bg-muted" />
      </div>
    );
  }

  function sorted(): SupplierRow[] {
    const copy = [...suppliers];
    if (sortBy === "score") {
      return copy.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    }
    if (sortBy === "volume") {
      return copy.sort((a, b) => b.total_kg - a.total_kg);
    }
    return copy.sort((a, b) => {
      if (!a.next_predicted) return 1;
      if (!b.next_predicted) return -1;
      return (
        new Date(a.next_predicted).getTime() -
        new Date(b.next_predicted).getTime()
      );
    });
  }

  return (
    <div className="space-y-6">
      {/* Production cycle — next 30 days */}
      {cycleEvents.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <h3 className="text-sm font-semibold">
            Previsão de Entregas — Próximos 30 Dias
          </h3>
          <div className="space-y-2">
            {cycleEvents.map((ev) => {
              const gradeColor =
                ev.lqi_grade === "A" || ev.lqi_grade === "B"
                  ? "bg-success"
                  : ev.lqi_grade === "C"
                  ? "bg-amber-400"
                  : ev.lqi_grade === "D" || ev.lqi_grade === "E"
                  ? "bg-destructive"
                  : "bg-muted-foreground";

              return (
                <div
                  key={ev.client_id}
                  className={`flex items-center gap-3 rounded-md p-2 ${
                    ev.is_overdue ? "bg-destructive-surface" : "bg-muted/30"
                  }`}
                >
                  <div className={`h-3 w-3 rounded-full ${gradeColor} flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ev.name}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-medium">
                      {new Date(ev.predicted_date).toLocaleDateString("pt-PT")}
                    </p>
                    <p
                      className={`text-xs ${
                        ev.is_overdue
                          ? "text-destructive font-medium"
                          : ev.days_away <= 3
                          ? "text-amber-600"
                          : "text-muted-foreground"
                      }`}
                    >
                      {ev.is_overdue
                        ? `${Math.abs(ev.days_away)}d em atraso`
                        : ev.days_away === 0
                        ? "Hoje"
                        : `em ${ev.days_away}d`}
                    </p>
                  </div>
                  {ev.is_overdue && (
                    <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Ranking table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Ranking de Fornecedores</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Ordenar por:</span>
            {(["score", "volume", "next_delivery"] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setSortBy(opt)}
                className={`rounded px-2 py-1 text-xs font-medium ${
                  sortBy === opt
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                {opt === "score"
                  ? "Score"
                  : opt === "volume"
                  ? "Volume"
                  : "Próx. Entrega"}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-8">
                  #
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Fornecedor
                </th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                  Score / Grau
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Yield Médio
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Volume Total (t)
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Nº Lotes
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Próx. Entrega
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {sorted().map((row, idx) => {
                const daysAway =
                  row.next_predicted
                    ? Math.round(
                        (new Date(row.next_predicted).getTime() - Date.now()) /
                          86400000
                      )
                    : null;

                return (
                  <tr
                    key={row.client_id}
                    className="border-b border-border last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 text-sm text-muted-foreground font-medium">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{row.name}</p>
                      {row.nif && (
                        <p className="text-xs text-muted-foreground font-mono">
                          {row.nif}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.score !== null ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="font-mono text-sm">
                            {row.score.toFixed(1)}
                          </span>
                          {row.lqi_grade && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                                LQI_GRADE_CLS[row.lqi_grade] || "bg-muted"
                              }`}
                            >
                              {row.lqi_grade}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          — sem dados
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.avg_yield !== null ? (
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-muted rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-1.5 rounded-full bg-primary"
                              style={{
                                width: `${Math.min(row.avg_yield, 100)}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm font-mono">
                            {row.avg_yield.toFixed(0)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm">
                      {row.total_kg > 0
                        ? (row.total_kg / 1000).toLocaleString("pt-PT", {
                            maximumFractionDigits: 1,
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm">
                      {row.lot_count > 0 ? row.lot_count : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-xs">
                      {row.next_predicted ? (
                        <span
                          className={
                            daysAway !== null && daysAway < 0
                              ? "text-destructive font-medium"
                              : daysAway !== null && daysAway <= 3
                              ? "text-amber-600 font-medium"
                              : "text-muted-foreground"
                          }
                        >
                          {new Date(row.next_predicted).toLocaleDateString(
                            "pt-PT"
                          )}
                          {daysAway !== null && (
                            <span className="ml-1">
                              ({daysAway < 0
                                ? `${Math.abs(daysAway)}d atraso`
                                : daysAway === 0
                                ? "hoje"
                                : `${daysAway}d`})
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          {row.avg_interval_days
                            ? `~${row.avg_interval_days}d ciclo`
                            : "—"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/clients/${row.client_id}`}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        Ver <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {suppliers.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    Sem fornecedores com dados de qualidade. Crie lotes e feche-os para gerar scores.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
