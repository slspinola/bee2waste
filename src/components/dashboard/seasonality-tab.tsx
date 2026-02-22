"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TrendingUp, Calendar, Lightbulb } from "lucide-react";

const MONTH_LABELS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

interface PricePoint {
  month: number; // 1-12
  year: number;
  price: number;
  ler_code: string;
  product_type: string | null;
}

interface LerMonthAvg {
  ler_code: string;
  product_type: string | null;
  monthlyAvg: number[]; // index 0=Jan, 11=Dec
  annualAvg: number;
  peakMonths: number[]; // 0-indexed months above avg+10%
  stockKg: number;
  avgTreatmentDays: number | null;
}

interface Recommendation {
  ler_code: string;
  product_type: string | null;
  peakWindow: string;
  peakPct: number;
  stockKg: number;
  treatmentDays: number | null;
  startTreatmentBy: string | null;
}

const CHART_COLORS = ["#f93f26", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"];

export function SeasonalityTab({ parkId }: { parkId: string }) {
  const [lerData, setLerData] = useState<LerMonthAvg[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLers, setSelectedLers] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createClient();

      const [
        { data: pricesData },
        { data: stockData },
        { data: closedLots },
      ] = await Promise.all([
        supabase
          .from("market_prices")
          .select("ler_code, price_per_ton, effective_date, product_type")
          .eq("park_id", parkId)
          .order("effective_date", { ascending: true }) as unknown as Promise<{
          data: {
            ler_code: string;
            price_per_ton: number;
            effective_date: string;
            product_type: string | null;
          }[] | null;
        }>,
        supabase
          .from("stock_movements")
          .select("ler_code, quantity_kg")
          .eq("park_id", parkId) as unknown as Promise<{
          data: { ler_code: string; quantity_kg: number }[] | null;
        }>,
        supabase
          .from("lots")
          .select("ler_codes, closed_at, treatment_started_at")
          .eq("park_id", parkId)
          .eq("status", "closed")
          .not("closed_at", "is", null)
          .not("treatment_started_at", "is", null) as unknown as Promise<{
          data: {
            ler_codes: string[];
            closed_at: string;
            treatment_started_at: string;
          }[] | null;
        }>,
      ]);

      // Stock by LER
      const stockByLer = new Map<string, number>();
      if (stockData) {
        for (const s of stockData) {
          stockByLer.set(s.ler_code, (stockByLer.get(s.ler_code) || 0) + s.quantity_kg);
        }
      }

      // Treatment days by LER
      const treatDaysByLer = new Map<string, number[]>();
      if (closedLots) {
        for (const lot of closedLots) {
          if (!lot.ler_codes || !lot.closed_at || !lot.treatment_started_at) continue;
          const days = Math.round(
            (new Date(lot.closed_at).getTime() -
              new Date(lot.treatment_started_at).getTime()) /
              86400000
          );
          if (days > 0) {
            for (const ler of lot.ler_codes) {
              if (!treatDaysByLer.has(ler)) treatDaysByLer.set(ler, []);
              treatDaysByLer.get(ler)!.push(days);
            }
          }
        }
      }

      // Build price history: group by LER, then by month
      const lerPrices = new Map<
        string,
        { product_type: string | null; points: PricePoint[] }
      >();
      if (pricesData) {
        for (const p of pricesData) {
          const d = new Date(p.effective_date);
          if (!lerPrices.has(p.ler_code)) {
            lerPrices.set(p.ler_code, {
              product_type: p.product_type,
              points: [],
            });
          }
          lerPrices.get(p.ler_code)!.points.push({
            month: d.getMonth() + 1,
            year: d.getFullYear(),
            price: p.price_per_ton,
            ler_code: p.ler_code,
            product_type: p.product_type,
          });
        }
      }

      // For each LER: compute avg price per calendar month
      const results: LerMonthAvg[] = [];
      for (const [ler, { product_type, points }] of lerPrices) {
        if (points.length === 0) continue;

        const monthBuckets: number[][] = Array.from({ length: 12 }, () => []);
        for (const p of points) {
          monthBuckets[p.month - 1].push(p.price);
        }
        const monthlyAvg = monthBuckets.map((bucket) =>
          bucket.length > 0
            ? bucket.reduce((a, b) => a + b, 0) / bucket.length
            : 0
        );
        const nonZeroAvgs = monthlyAvg.filter((v) => v > 0);
        const annualAvg =
          nonZeroAvgs.length > 0
            ? nonZeroAvgs.reduce((a, b) => a + b, 0) / nonZeroAvgs.length
            : 0;
        const peakMonths = monthlyAvg
          .map((v, i) => ({ v, i }))
          .filter(({ v }) => v > annualAvg * 1.1)
          .map(({ i }) => i);

        const avgTreatDays = treatDaysByLer.get(ler);
        const treatDays =
          avgTreatDays && avgTreatDays.length > 0
            ? Math.round(
                avgTreatDays.reduce((a, b) => a + b, 0) / avgTreatDays.length
              )
            : null;

        results.push({
          ler_code: ler,
          product_type,
          monthlyAvg,
          annualAvg,
          peakMonths,
          stockKg: stockByLer.get(ler) || 0,
          avgTreatmentDays: treatDays,
        });
      }

      results.sort((a, b) => b.stockKg - a.stockKg);
      setLerData(results);
      setSelectedLers(new Set(results.slice(0, 3).map((r) => r.ler_code)));

      // Generate recommendations
      const now = new Date();
      const recs: Recommendation[] = [];
      for (const item of results) {
        if (item.peakMonths.length === 0 || item.stockKg === 0) continue;

        // Find next peak month within next 6 months
        let nextPeak: number | null = null;
        for (let offset = 1; offset <= 6; offset++) {
          const targetMonth = (now.getMonth() + offset) % 12;
          if (item.peakMonths.includes(targetMonth)) {
            nextPeak = targetMonth;
            break;
          }
        }
        if (nextPeak === null && item.peakMonths.length > 0) {
          nextPeak = item.peakMonths[0];
        }
        if (nextPeak === null) continue;

        const peakPct =
          item.annualAvg > 0
            ? ((item.monthlyAvg[nextPeak] - item.annualAvg) / item.annualAvg) *
              100
            : 0;

        // Calculate start treatment date
        let startBy: string | null = null;
        if (item.avgTreatmentDays !== null) {
          const nextPeakDate = new Date(
            now.getFullYear(),
            nextPeak,
            1
          );
          if (nextPeakDate < now) nextPeakDate.setFullYear(now.getFullYear() + 1);
          const startDate = new Date(
            nextPeakDate.getTime() - item.avgTreatmentDays * 86400000
          );
          startBy = startDate.toLocaleDateString("pt-PT");
        }

        recs.push({
          ler_code: item.ler_code,
          product_type: item.product_type,
          peakWindow: MONTH_LABELS[nextPeak],
          peakPct,
          stockKg: item.stockKg,
          treatmentDays: item.avgTreatmentDays,
          startTreatmentBy: startBy,
        });
      }
      setRecommendations(recs);
      setLoading(false);
    }
    load();
  }, [parkId]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-64 rounded-lg bg-muted" />
        <div className="h-40 rounded-lg bg-muted" />
      </div>
    );
  }

  if (lerData.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-12 text-center space-y-2">
        <TrendingUp className="h-8 w-8 mx-auto text-muted-foreground" />
        <p className="font-medium">Sem dados de sazonalidade</p>
        <p className="text-sm text-muted-foreground">
          Registe cotações de mercado na aba Stock para ver análise de sazonalidade.
        </p>
      </div>
    );
  }

  const visibleLers = lerData.filter((r) => selectedLers.has(r.ler_code));

  return (
    <div className="space-y-6">
      {/* LER selector */}
      <div className="flex flex-wrap gap-2">
        {lerData.map((item, idx) => (
          <button
            key={item.ler_code}
            onClick={() => {
              setSelectedLers((prev) => {
                const next = new Set(prev);
                if (next.has(item.ler_code)) {
                  if (next.size > 1) next.delete(item.ler_code);
                } else {
                  next.add(item.ler_code);
                }
                return next;
              });
            }}
            className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
              selectedLers.has(item.ler_code)
                ? "text-white border-transparent"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
            style={
              selectedLers.has(item.ler_code)
                ? { backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }
                : {}
            }
          >
            {item.ler_code}
            {item.product_type ? ` — ${item.product_type}` : ""}
          </button>
        ))}
      </div>

      {/* Seasonality bar chart */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Preço Médio por Mês (€/t)</h3>
          <p className="text-xs text-muted-foreground">
            Baseado no histórico de cotações registadas
          </p>
        </div>
        <SeasonalityChart data={visibleLers} />
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            Recomendações de Timing
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recommendations.map((rec) => (
              <div
                key={rec.ler_code}
                className="rounded-lg border border-border bg-card p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-mono text-sm font-medium">{rec.ler_code}</p>
                    {rec.product_type && (
                      <p className="text-xs text-muted-foreground">
                        {rec.product_type}
                      </p>
                    )}
                  </div>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                    +{rec.peakPct.toFixed(0)}%
                  </span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>
                      Pico:{" "}
                      <span className="font-medium">{rec.peakWindow}</span>
                    </span>
                  </div>
                  <p className="text-muted-foreground">
                    Stock:{" "}
                    {(rec.stockKg / 1000).toLocaleString("pt-PT", {
                      maximumFractionDigits: 1,
                    })}{" "}
                    t
                  </p>
                  {rec.startTreatmentBy && (
                    <p className="text-xs text-primary font-medium">
                      Iniciar tratamento até {rec.startTreatmentBy}
                    </p>
                  )}
                  {rec.treatmentDays && (
                    <p className="text-xs text-muted-foreground">
                      Duração média: {rec.treatmentDays} dias
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Price history table */}
      <div className="space-y-3">
        <h3 className="font-semibold">Histórico de Cotações por Tipo</h3>
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Código LER
                </th>
                {MONTH_LABELS.map((m) => (
                  <th
                    key={m}
                    className="px-2 py-3 text-center font-medium text-muted-foreground text-xs"
                  >
                    {m}
                  </th>
                ))}
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Média Anual
                </th>
              </tr>
            </thead>
            <tbody>
              {lerData.map((item) => (
                <tr
                  key={item.ler_code}
                  className="border-b border-border last:border-0 hover:bg-muted/30"
                >
                  <td className="px-4 py-2 font-mono text-xs font-medium">
                    {item.ler_code}
                    {item.product_type && (
                      <span className="ml-1 text-muted-foreground">
                        {item.product_type}
                      </span>
                    )}
                  </td>
                  {item.monthlyAvg.map((avg, mi) => (
                    <td
                      key={mi}
                      className={`px-2 py-2 text-center text-xs font-mono ${
                        item.peakMonths.includes(mi)
                          ? "bg-green-50 text-green-700 font-semibold"
                          : ""
                      }`}
                    >
                      {avg > 0 ? Math.round(avg) : "—"}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-right text-xs font-mono font-semibold">
                    {item.annualAvg > 0 ? `€ ${Math.round(item.annualAvg)}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          Células a verde indicam meses com preço acima da média anual (+10%). Valores em €/t.
        </p>
      </div>
    </div>
  );
}

function SeasonalityChart({ data }: { data: LerMonthAvg[] }) {
  if (data.length === 0 || data.every((d) => d.annualAvg === 0)) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Sem dados históricos suficientes para exibir gráfico.
      </p>
    );
  }

  const allValues = data.flatMap((d) => d.monthlyAvg.filter((v) => v > 0));
  const maxVal = Math.max(...allValues, 1);
  const chartH = 160;
  const chartW = 560;
  const padL = 48;
  const padB = 24;
  const innerW = chartW - padL;
  const innerH = chartH - padB;
  const monthW = innerW / 12;

  const now = new Date();
  const currentMonthX = padL + now.getMonth() * monthW + monthW / 2;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${chartW} ${chartH}`}
        className="w-full"
        style={{ minWidth: 400 }}
      >
        {/* Y axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = padB + innerH - frac * innerH;
          const val = Math.round(frac * maxVal);
          return (
            <g key={frac}>
              <line
                x1={padL}
                x2={chartW}
                y1={y}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth={0.5}
              />
              <text
                x={padL - 4}
                y={y + 4}
                textAnchor="end"
                fontSize={9}
                fill="#9ca3af"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Month labels */}
        {MONTH_LABELS.map((label, mi) => (
          <text
            key={mi}
            x={padL + mi * monthW + monthW / 2}
            y={chartH - 6}
            textAnchor="middle"
            fontSize={9}
            fill="#9ca3af"
          >
            {label}
          </text>
        ))}

        {/* Peak zones (first dataset) */}
        {data[0]?.peakMonths.map((mi) => (
          <rect
            key={mi}
            x={padL + mi * monthW}
            y={padB}
            width={monthW}
            height={innerH}
            fill="#10b981"
            fillOpacity={0.08}
          />
        ))}

        {/* Lines per LER */}
        {data.map((item, idx) => {
          const color = CHART_COLORS[idx % CHART_COLORS.length];
          const points = item.monthlyAvg
            .map((v, mi) => {
              if (v === 0) return null;
              const x = padL + mi * monthW + monthW / 2;
              const y = padB + innerH - (v / maxVal) * innerH;
              return `${x.toFixed(1)},${y.toFixed(1)}`;
            })
            .filter(Boolean);

          if (points.length < 2) return null;
          return (
            <polyline
              key={item.ler_code}
              fill="none"
              stroke={color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points.join(" ")}
            />
          );
        })}

        {/* Current month line */}
        <line
          x1={currentMonthX}
          x2={currentMonthX}
          y1={padB}
          y2={padB + innerH}
          stroke="#6b7280"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        <text
          x={currentMonthX + 3}
          y={padB + 10}
          fontSize={8}
          fill="#6b7280"
        >
          Hoje
        </text>
      </svg>
    </div>
  );
}
