"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCurrentPark } from "@/hooks/use-current-park";
import { cn } from "@/lib/utils";
import { Truck, ClipboardList, BarChart2, Scale, AlertCircle } from "lucide-react";

// ====== Types ======
type KpiData = {
  pedidos_pendentes: number;
  pedidos_hoje: number;
  em_rota: number;
  concluidos_hoje: number;
  kg_planeados: number;
  kg_recolhidos_hoje: number;
  viaturas_disponiveis: number;
  viaturas_em_rota: number;
  alertas_sla: number; // orders with sla_deadline <= now + 48h and not done
};

type OrderByStatus = { status: string; count: number };
type DailyVolume = { date: string; count: number; kg: number };

// ====== Tab definitions ======
const TABS = [
  { key: "overview", label: "Visão Geral", icon: BarChart2 },
  { key: "pedidos", label: "Pedidos", icon: ClipboardList },
  { key: "frota", label: "Frota", icon: Truck },
  { key: "performance", label: "Performance", icon: Scale },
  { key: "alertas", label: "Alertas", icon: AlertCircle },
] as const;
type TabKey = (typeof TABS)[number]["key"];

// ====== Status metadata ======
const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  pending: "Pendente",
  planned: "Planeado",
  on_route: "Em Rota",
  at_client: "No Cliente",
  completed: "Concluído",
  failed: "Falhou",
  cancelled: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted",
  pending: "bg-blue-400",
  planned: "bg-violet-400",
  on_route: "bg-amber-400",
  at_client: "bg-orange-400",
  completed: "bg-green-500",
  failed: "bg-red-500",
  cancelled: "bg-gray-400",
};

// ====== Sub-components ======
function KpiCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string | number;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-4",
        highlight && "border-amber-300 bg-amber-50"
      )}
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-2xl font-bold mt-1",
          highlight ? "text-amber-700" : "text-foreground"
        )}
      >
        {value}
      </p>
      {sub && (
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      )}
    </div>
  );
}

// ====== Main Component ======
export default function LogisticaDashboardPage() {
  const { currentParkId } = useCurrentPark();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [ordersByStatus, setOrdersByStatus] = useState<OrderByStatus[]>([]);
  const [dailyVolume, setDailyVolume] = useState<DailyVolume[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentParkId) return;
    const supabase = createClient();
    const today = new Date().toISOString().split("T")[0];
    const tomorrow48h = new Date(Date.now() + 48 * 3_600_000).toISOString();

    setLoading(true);

    Promise.all([
      // All orders for this park
      supabase
        .from("pedidos_recolha")
        .select("status, quantidade_estimada_kg, sla_deadline, created_at")
        .eq("park_id", currentParkId),
      // Viaturas statuses
      supabase
        .from("viaturas")
        .select("status")
        .eq("park_id", currentParkId),
      // Completed stops today for kg collected
      supabase
        .from("rota_paragens")
        .select("peso_real_kg, rotas!inner(park_id, data_execucao, status)")
        .eq("rotas.park_id", currentParkId)
        .eq("rotas.data_execucao", today)
        .eq("status", "completed"),
    ]).then(([ordersRes, viaturasRes, completedStopsRes]) => {
      const orders = ordersRes.data ?? [];
      const viaturas = viaturasRes.data ?? [];
      const completedStops = completedStopsRes.data ?? [];

      const now = Date.now();
      const todayStart = new Date(today).getTime();

      // ---- KPIs ----
      const kpiData: KpiData = {
        pedidos_pendentes: orders.filter((o) => o.status === "pending").length,
        pedidos_hoje: orders.filter(
          (o) => new Date(o.created_at).getTime() >= todayStart
        ).length,
        em_rota: orders.filter(
          (o) => o.status === "on_route" || o.status === "at_client"
        ).length,
        concluidos_hoje: orders.filter(
          (o) =>
            o.status === "completed" &&
            new Date(o.created_at).getTime() >= todayStart
        ).length,
        kg_planeados: orders
          .filter((o) => o.status === "planned")
          .reduce((s, o) => s + (o.quantidade_estimada_kg ?? 0), 0),
        kg_recolhidos_hoje: completedStops.reduce(
          (s: number, p: { peso_real_kg: number | null }) =>
            s + (p.peso_real_kg ?? 0),
          0
        ),
        viaturas_disponiveis: viaturas.filter((v) => v.status === "available")
          .length,
        viaturas_em_rota: viaturas.filter((v) => v.status === "on_route")
          .length,
        alertas_sla: orders.filter(
          (o) =>
            o.sla_deadline &&
            new Date(o.sla_deadline).getTime() <=
              new Date(tomorrow48h).getTime() &&
            o.status !== "completed" &&
            o.status !== "cancelled"
        ).length,
      };
      setKpis(kpiData);

      // ---- Orders by status ----
      const statusCounts = orders.reduce(
        (acc: Record<string, number>, o) => {
          acc[o.status] = (acc[o.status] ?? 0) + 1;
          return acc;
        },
        {}
      );
      setOrdersByStatus(
        Object.entries(statusCounts).map(([status, count]) => ({
          status,
          count,
        }))
      );

      // ---- Daily volume last 7 days ----
      const days: DailyVolume[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now - i * 86_400_000).toISOString().split("T")[0];
        const dayOrders = orders.filter((o) => o.created_at?.startsWith(d));
        days.push({
          date: d,
          count: dayOrders.length,
          kg: dayOrders.reduce(
            (s, o) => s + (o.quantidade_estimada_kg ?? 0),
            0
          ),
        });
      }
      setDailyVolume(days);

      setLoading(false);
    });
  }, [currentParkId]);

  // ---- Mini bar chart helpers ----
  const maxDayCount = Math.max(...dailyVolume.map((d) => d.count), 1);

  function MiniBar({ count, date }: { count: number; date: string }) {
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-end h-16 w-8">
          <div
            className="w-full rounded-t bg-primary/70"
            style={{
              height: `${(count / maxDayCount) * 100}%`,
              minHeight: count > 0 ? "4px" : "0",
            }}
          />
        </div>
        <span className="text-xs text-muted-foreground">{date.slice(5)}</span>
        <span className="text-xs font-medium text-foreground">{count}</span>
      </div>
    );
  }

  // ====== RENDER ======
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <BarChart2 className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold text-foreground">
          Dashboard de Logística
        </h1>
      </div>

      {/* Tab Nav */}
      <div className="flex border-b border-border gap-0">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {tab.key === "alertas" && (kpis?.alertas_sla ?? 0) > 0 && (
                <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-bold">
                  {kpis?.alertas_sla}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          A carregar dados...
        </div>
      ) : (
        <>
          {/* ====== OVERVIEW TAB ====== */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                  label="Pedidos Pendentes"
                  value={kpis?.pedidos_pendentes ?? 0}
                  sub="a planear"
                />
                <KpiCard
                  label="Em Rota Hoje"
                  value={kpis?.em_rota ?? 0}
                  sub="em rota + no cliente"
                />
                <KpiCard
                  label="Kg Recolhidos Hoje"
                  value={`${((kpis?.kg_recolhidos_hoje ?? 0) / 1000).toFixed(1)} t`}
                />
                <KpiCard
                  label="Alertas SLA"
                  value={kpis?.alertas_sla ?? 0}
                  highlight={(kpis?.alertas_sla ?? 0) > 0}
                  sub="próximas 48h"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <KpiCard
                  label="Viaturas Disponíveis"
                  value={kpis?.viaturas_disponiveis ?? 0}
                />
                <KpiCard
                  label="Viaturas em Rota"
                  value={kpis?.viaturas_em_rota ?? 0}
                />
              </div>

              {/* Volume bar chart */}
              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="text-sm font-semibold text-foreground mb-4">
                  Pedidos — Últimos 7 Dias
                </h3>
                <div className="flex items-end gap-3 justify-around">
                  {dailyVolume.map((d) => (
                    <MiniBar key={d.date} count={d.count} date={d.date} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ====== PEDIDOS TAB ====== */}
          {activeTab === "pedidos" && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">
                Distribuição por Estado
              </h3>
              <div className="space-y-2">
                {ordersByStatus
                  .sort((a, b) => b.count - a.count)
                  .map((s) => {
                    const total = ordersByStatus.reduce(
                      (sum, x) => sum + x.count,
                      0
                    );
                    const pct = total > 0 ? (s.count / total) * 100 : 0;
                    return (
                      <div key={s.status} className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground w-24 text-right">
                          {STATUS_LABELS[s.status] ?? s.status}
                        </span>
                        <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded transition-all",
                              STATUS_COLORS[s.status] ?? "bg-primary"
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-foreground w-6 text-right">
                          {s.count}
                        </span>
                      </div>
                    );
                  })}
              </div>

              {ordersByStatus.length === 0 && (
                <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
                  Sem pedidos registados
                </div>
              )}
            </div>
          )}

          {/* ====== FROTA TAB ====== */}
          {activeTab === "frota" && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <KpiCard
                  label="Disponíveis"
                  value={kpis?.viaturas_disponiveis ?? 0}
                />
                <KpiCard
                  label="Em Rota"
                  value={kpis?.viaturas_em_rota ?? 0}
                />
                <KpiCard
                  label="Kg Planeados"
                  value={`${((kpis?.kg_planeados ?? 0) / 1000).toFixed(1)} t`}
                />
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm text-muted-foreground text-center py-4">
                  Consulte o mapa de tracking para posições em tempo real das
                  viaturas.
                </p>
              </div>
            </div>
          )}

          {/* ====== PERFORMANCE TAB ====== */}
          {activeTab === "performance" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <KpiCard
                  label="Pedidos Criados Hoje"
                  value={kpis?.pedidos_hoje ?? 0}
                />
                <KpiCard
                  label="Concluídos Hoje"
                  value={kpis?.concluidos_hoje ?? 0}
                />
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Volume Diário (7 dias)
                </h3>
                <div className="space-y-2">
                  {dailyVolume.map((d) => (
                    <div key={d.date} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-16">
                        {d.date.slice(5)}
                      </span>
                      <div className="flex-1 h-3 bg-muted rounded overflow-hidden">
                        <div
                          className="h-full bg-primary/70 rounded"
                          style={{
                            width: `${maxDayCount > 0 ? (d.count / maxDayCount) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs font-medium text-foreground w-8 text-right">
                        {d.count}
                      </span>
                      <span className="text-xs text-muted-foreground w-16 text-right">
                        {(d.kg / 1000).toFixed(1)} t
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ====== ALERTAS TAB ====== */}
          {activeTab === "alertas" && (
            <div className="space-y-3">
              {(kpis?.alertas_sla ?? 0) === 0 ? (
                <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
                  Sem alertas ativos
                </div>
              ) : (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
                  <div className="flex items-center gap-2 font-medium text-amber-800">
                    <AlertCircle className="h-4 w-4" />
                    {kpis?.alertas_sla} pedido(s) com SLA a expirar nas
                    próximas 48 horas
                  </div>
                  <p className="text-sm text-amber-700 mt-1">
                    Aceda à lista de pedidos e filtre por estado &quot;Pendente&quot;
                    para planear as recolhas urgentes.
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
