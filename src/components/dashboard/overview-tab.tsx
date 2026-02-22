"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Link } from "@/i18n/navigation";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Lock,
  Clock,
  Activity,
} from "lucide-react";

type Period = "30d" | "90d" | "6m" | "12m";

function periodToDays(period: Period): number {
  return period === "30d" ? 30 : period === "90d" ? 90 : period === "6m" ? 180 : 365;
}

function getStartDate(period: Period): string {
  return new Date(Date.now() - periodToDays(period) * 86400000)
    .toISOString()
    .split("T")[0];
}

function getPrevStart(period: Period): string {
  const days = periodToDays(period);
  return new Date(Date.now() - days * 2 * 86400000)
    .toISOString()
    .split("T")[0];
}

function TrendBadge({
  current,
  prev,
}: {
  current: number | null;
  prev: number | null;
}) {
  if (current === null || prev === null || prev === 0) return null;
  const pct = ((current - prev) / Math.abs(prev)) * 100;
  const isPos = pct > 1;
  const isNeg = pct < -1;
  const Icon = isPos ? TrendingUp : isNeg ? TrendingDown : Minus;
  const cls = isPos
    ? "text-success"
    : isNeg
    ? "text-destructive"
    : "text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs ${cls}`}>
      <Icon className="h-3 w-3" />
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function MiniBarChart({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-px h-full w-full">
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-t transition-all"
          style={{
            height: `${Math.max((v / max) * 100, v > 0 ? 5 : 0)}%`,
            backgroundColor: color,
            opacity: 0.4 + (i / (data.length - 1)) * 0.6,
          }}
          title={String(v)}
        />
      ))}
    </div>
  );
}

interface SparkCardProps {
  title: string;
  data: number[];
  labels: string[];
  unit: string;
  color: string;
  valueLabel?: string;
}

function SparkCard({ title, data, labels, unit, color, valueLabel }: SparkCardProps) {
  const hasData = data.some((v) => v > 0);
  const lastValue = data[data.length - 1];
  const lastLabel = labels[labels.length - 1]
    ? new Date(labels[labels.length - 1] + "-01").toLocaleDateString("pt-PT", {
        month: "short",
        year: "2-digit",
      })
    : "";

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <Activity className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      {hasData ? (
        <>
          <div className="flex items-baseline justify-between">
            <p className="text-lg font-bold font-mono">
              {valueLabel ||
                (lastValue > 0
                  ? `${lastValue.toLocaleString("pt-PT")}${unit ? ` ${unit}` : ""}`
                  : "—")}
            </p>
            <p className="text-xs text-muted-foreground">{lastLabel}</p>
          </div>
          <div className="h-14">
            <MiniBarChart data={data} color={color} />
          </div>
        </>
      ) : (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Sem dados no período
        </p>
      )}
    </div>
  );
}

const LQI_GRADE_CLS: Record<string, string> = {
  A: "bg-emerald-100 text-emerald-700",
  B: "bg-green-100 text-green-700",
  C: "bg-amber-100 text-amber-700",
  D: "bg-orange-100 text-orange-700",
  E: "bg-red-100 text-red-700",
};

function lqiGrade(v: number): string {
  return v >= 4.5 ? "A" : v >= 3.5 ? "B" : v >= 2.5 ? "C" : v >= 1.5 ? "D" : "E";
}

export function OverviewTab({ parkId, period }: { parkId: string; period: Period }) {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({
    entries: 0,
    entriesPrev: 0,
    stockValueEur: 0,
    avgLqi: null as number | null,
    avgLqiPrev: null as number | null,
    avgYield: null as number | null,
    avgYieldPrev: null as number | null,
    alertsCount: 0,
    openNCs: 0,
    blockedZones: 0,
    suppliersDue: 0,
  });
  const [monthlyEntries, setMonthlyEntries] = useState<number[]>([]);
  const [monthlyKg, setMonthlyKg] = useState<number[]>([]);
  const [monthlyLqi, setMonthlyLqi] = useState<number[]>([]);
  const [monthLabels, setMonthLabels] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createClient();
      const startDate = getStartDate(period);
      const prevStart = getPrevStart(period);
      const nextWeek = new Date(Date.now() + 7 * 86400000)
        .toISOString()
        .split("T")[0];
      const twelveMonthsAgo = new Date(Date.now() - 365 * 86400000)
        .toISOString()
        .split("T")[0];

      const [
        { count: entries },
        { count: entriesPrev },
        { count: ncCount },
        { count: blockedCount },
        { data: cyclesDue },
        { data: closedLots },
        { data: prevClosedLots },
        { data: stockData },
        { data: pricesData },
        { data: entriesHistory },
        { data: lotsHistory },
      ] = await Promise.all([
        supabase
          .from("entries")
          .select("id", { count: "exact", head: true })
          .eq("park_id", parkId)
          .gte("created_at", `${startDate}T00:00:00`),
        supabase
          .from("entries")
          .select("id", { count: "exact", head: true })
          .eq("park_id", parkId)
          .gte("created_at", `${prevStart}T00:00:00`)
          .lt("created_at", `${startDate}T00:00:00`),
        supabase
          .from("non_conformities")
          .select("id", { count: "exact", head: true })
          .eq("park_id", parkId)
          .in("status", ["open", "investigating"]),
        supabase
          .from("storage_areas")
          .select("id", { count: "exact", head: true })
          .eq("park_id", parkId)
          .eq("is_blocked", true),
        supabase
          .from("client_production_cycles")
          .select("id")
          .eq("park_id", parkId)
          .lte("next_predicted_date", nextWeek)
          .not("next_predicted_date", "is", null) as unknown as Promise<{
          data: { id: string }[] | null;
        }>,
        supabase
          .from("lots")
          .select("lqi, yield_rate")
          .eq("park_id", parkId)
          .eq("status", "closed")
          .gte("closed_at", `${startDate}T00:00:00`)
          .not("lqi", "is", null) as unknown as Promise<{
          data: { lqi: number; yield_rate: number | null }[] | null;
        }>,
        supabase
          .from("lots")
          .select("lqi, yield_rate")
          .eq("park_id", parkId)
          .eq("status", "closed")
          .gte("closed_at", `${prevStart}T00:00:00`)
          .lt("closed_at", `${startDate}T00:00:00`)
          .not("lqi", "is", null) as unknown as Promise<{
          data: { lqi: number; yield_rate: number | null }[] | null;
        }>,
        supabase
          .from("stock_movements")
          .select("ler_code, quantity_kg")
          .eq("park_id", parkId) as unknown as Promise<{
          data: { ler_code: string; quantity_kg: number }[] | null;
        }>,
        supabase
          .from("market_prices")
          .select("ler_code, price_per_ton, effective_date")
          .eq("park_id", parkId)
          .order("effective_date", {
            ascending: false,
          }) as unknown as Promise<{
          data: {
            ler_code: string;
            price_per_ton: number;
            effective_date: string;
          }[] | null;
        }>,
        supabase
          .from("entries")
          .select("created_at, net_weight_kg")
          .eq("park_id", parkId)
          .gte("created_at", `${twelveMonthsAgo}T00:00:00`) as unknown as Promise<{
          data: { created_at: string; net_weight_kg: number | null }[] | null;
        }>,
        supabase
          .from("lots")
          .select("closed_at, lqi")
          .eq("park_id", parkId)
          .eq("status", "closed")
          .gte("closed_at", `${twelveMonthsAgo}T00:00:00`)
          .not("lqi", "is", null) as unknown as Promise<{
          data: { closed_at: string; lqi: number }[] | null;
        }>,
      ]);

      // Stock value calculation
      let stockValueEur = 0;
      if (stockData && pricesData) {
        const latestPrices = new Map<string, number>();
        for (const p of pricesData) {
          if (!latestPrices.has(p.ler_code)) {
            latestPrices.set(p.ler_code, p.price_per_ton);
          }
        }
        const stockByLer = new Map<string, number>();
        for (const s of stockData) {
          stockByLer.set(
            s.ler_code,
            (stockByLer.get(s.ler_code) || 0) + s.quantity_kg
          );
        }
        for (const [ler, kg] of stockByLer) {
          const price = latestPrices.get(ler) || 0;
          stockValueEur += (kg / 1000) * price;
        }
      }

      // LQI + yield averages
      const avgLqi =
        closedLots && closedLots.length > 0
          ? closedLots.reduce((s, l) => s + l.lqi, 0) / closedLots.length
          : null;
      const avgLqiPrev =
        prevClosedLots && prevClosedLots.length > 0
          ? prevClosedLots.reduce((s, l) => s + l.lqi, 0) /
            prevClosedLots.length
          : null;
      const withYield = closedLots?.filter((l) => l.yield_rate !== null) ?? [];
      const avgYield =
        withYield.length > 0
          ? withYield.reduce((s, l) => s + (l.yield_rate || 0), 0) /
            withYield.length
          : null;
      const withYieldPrev =
        prevClosedLots?.filter((l) => l.yield_rate !== null) ?? [];
      const avgYieldPrev =
        withYieldPrev.length > 0
          ? withYieldPrev.reduce((s, l) => s + (l.yield_rate || 0), 0) /
            withYieldPrev.length
          : null;

      // Build 12-month labels
      const now = new Date();
      const labels: string[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        labels.push(
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
        );
      }

      // Monthly entries count
      const entryCounts = new Map<string, number>();
      labels.forEach((l) => entryCounts.set(l, 0));
      if (entriesHistory) {
        for (const e of entriesHistory) {
          const m = e.created_at.substring(0, 7);
          if (entryCounts.has(m)) {
            entryCounts.set(m, (entryCounts.get(m) || 0) + 1);
          }
        }
      }

      // Monthly kg
      const kgByMonth = new Map<string, number>();
      labels.forEach((l) => kgByMonth.set(l, 0));
      if (entriesHistory) {
        for (const e of entriesHistory) {
          const m = e.created_at.substring(0, 7);
          if (kgByMonth.has(m)) {
            kgByMonth.set(m, (kgByMonth.get(m) || 0) + (e.net_weight_kg || 0));
          }
        }
      }

      // Monthly LQI
      const lqiByMonth = new Map<string, { sum: number; count: number }>();
      labels.forEach((l) => lqiByMonth.set(l, { sum: 0, count: 0 }));
      if (lotsHistory) {
        for (const lot of lotsHistory) {
          const m = lot.closed_at.substring(0, 7);
          if (lqiByMonth.has(m)) {
            const curr = lqiByMonth.get(m)!;
            lqiByMonth.set(m, { sum: curr.sum + lot.lqi, count: curr.count + 1 });
          }
        }
      }

      const nc = ncCount || 0;
      const blocked = blockedCount || 0;
      const due = cyclesDue?.length || 0;

      setKpis({
        entries: entries || 0,
        entriesPrev: entriesPrev || 0,
        stockValueEur,
        avgLqi,
        avgLqiPrev,
        avgYield,
        avgYieldPrev,
        alertsCount: nc + blocked + due,
        openNCs: nc,
        blockedZones: blocked,
        suppliersDue: due,
      });
      setMonthlyEntries(labels.map((m) => entryCounts.get(m) || 0));
      setMonthlyKg(labels.map((m) => Math.round((kgByMonth.get(m) || 0))));
      setMonthlyLqi(
        labels.map((m) => {
          const d = lqiByMonth.get(m);
          return d && d.count > 0 ? parseFloat((d.sum / d.count).toFixed(2)) : 0;
        })
      );
      setMonthLabels(labels);
      setLoading(false);
    }
    load();
  }, [parkId, period]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-muted" />
          ))}
        </div>
        <div className="h-28 rounded-lg bg-muted" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  const grade = kpis.avgLqi ? lqiGrade(kpis.avgLqi) : null;

  return (
    <div className="space-y-6">
      {/* KPI Bar */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="rounded-lg border border-border bg-card p-4 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Entradas no Período</p>
          <p className="text-2xl font-bold">{kpis.entries}</p>
          <TrendBadge current={kpis.entries} prev={kpis.entriesPrev} />
        </div>

        <div className="rounded-lg border border-border bg-card p-4 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Valor em Parque</p>
          <p className="text-2xl font-bold font-mono">
            {kpis.stockValueEur > 0
              ? `€ ${Math.round(kpis.stockValueEur).toLocaleString("pt-PT")}`
              : "—"}
          </p>
          <p className="text-xs text-muted-foreground">Cotações atuais</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">LQI Médio</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold">
              {kpis.avgLqi?.toFixed(1) ?? "—"}
            </p>
            {grade && (
              <span
                className={`rounded-full px-2 py-0.5 text-sm font-bold ${LQI_GRADE_CLS[grade]}`}
              >
                {grade}
              </span>
            )}
          </div>
          <TrendBadge current={kpis.avgLqi} prev={kpis.avgLqiPrev} />
        </div>

        <div className="rounded-lg border border-border bg-card p-4 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Yield Médio</p>
          <p className="text-2xl font-bold">
            {kpis.avgYield !== null ? `${kpis.avgYield.toFixed(0)}%` : "—"}
          </p>
          <TrendBadge current={kpis.avgYield} prev={kpis.avgYieldPrev} />
        </div>

        <div
          className={`rounded-lg border p-4 space-y-1 ${
            kpis.alertsCount > 0
              ? "border-warning bg-warning-surface"
              : "border-border bg-card"
          }`}
        >
          <p className="text-xs font-medium text-muted-foreground">Alertas Ativos</p>
          <p
            className={`text-2xl font-bold ${
              kpis.alertsCount > 0 ? "text-warning" : ""
            }`}
          >
            {kpis.alertsCount}
          </p>
          {kpis.alertsCount > 0 && (
            <p className="text-xs text-warning">Requerem atenção</p>
          )}
        </div>
      </div>

      {/* Alert panel */}
      {kpis.alertsCount > 0 && (
        <div className="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
          <div className="px-4 py-3">
            <h3 className="text-sm font-semibold">Alertas Urgentes</h3>
          </div>
          {kpis.openNCs > 0 && (
            <div className="flex items-center justify-between px-4 py-3 bg-warning-surface">
              <div className="flex items-center gap-2 text-sm text-warning font-medium">
                <AlertTriangle className="h-4 w-4" />
                {kpis.openNCs} não-conformidade(s) por resolver
              </div>
              <Link
                href="/classification"
                className="text-xs text-warning underline"
              >
                Ver
              </Link>
            </div>
          )}
          {kpis.blockedZones > 0 && (
            <div className="flex items-center justify-between px-4 py-3 bg-amber-50">
              <div className="flex items-center gap-2 text-sm text-amber-600 font-medium">
                <Lock className="h-4 w-4" />
                {kpis.blockedZones} zona(s) bloqueada(s) em tratamento
              </div>
              <Link
                href="/lots"
                className="text-xs text-amber-600 underline"
              >
                Ver lotes
              </Link>
            </div>
          )}
          {kpis.suppliersDue > 0 && (
            <div className="flex items-center justify-between px-4 py-3 bg-blue-50">
              <div className="flex items-center gap-2 text-sm text-blue-600 font-medium">
                <Clock className="h-4 w-4" />
                {kpis.suppliersDue} fornecedor(es) próximos do ciclo de entrega
              </div>
              <Link
                href="/clients"
                className="text-xs text-blue-600 underline"
              >
                Ver clientes
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Sparkline cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SparkCard
          title="Entradas (últ. 12 meses)"
          data={monthlyEntries}
          labels={monthLabels}
          unit="entradas"
          color="#f93f26"
        />
        <SparkCard
          title="Volume Recebido (kg)"
          data={monthlyKg}
          labels={monthLabels}
          unit="kg"
          color="#3b82f6"
        />
        <SparkCard
          title="LQI Médio por Mês"
          data={monthlyLqi}
          labels={monthLabels}
          unit=""
          color="#10b981"
        />
      </div>
    </div>
  );
}
