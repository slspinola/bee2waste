"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCurrentPark } from "@/hooks/use-current-park";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  BarChart2,
  ClipboardList,
  Truck,
  Users,
  Map,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
} from "lucide-react";

// ====== Types ======
type KpiData = {
  pedidos_pendentes: number;
  rotas_ativas_hoje: number;
  viaturas_disponiveis: number;
  viaturas_total: number;
  motoristas_em_servico: number;
  recolhas_semana: number;
};

type RotaHoje = {
  id: string;
  numero_rota: string;
  status: string;
  motorista_id: string | null;
  viaturas: { matricula: string } | null;
  motoristas: { nome: string } | null;
  rota_paragens: { id: string; status: string }[];
};

type ViaturaCard = {
  id: string;
  matricula: string;
  marca: string | null;
  modelo: string | null;
  tipo: string;
  capacidade_kg: number;
  status: string;
};

type OrderByStatus = { status: string; count: number };
type DailyVolume = { date: string; count: number; kg: number };

// ====== Tabs ======
const TABS = [
  { key: "overview", label: "Visão Geral", icon: BarChart2 },
  { key: "mapa", label: "Mapa", icon: Map },
  { key: "rotas", label: "Rotas Hoje", icon: ClipboardList },
  { key: "frota", label: "Frota", icon: Truck },
  { key: "kpis", label: "KPIs", icon: BarChart2 },
] as const;
type TabKey = (typeof TABS)[number]["key"];

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

const ROTA_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: "Rascunho", className: "bg-muted text-muted-foreground" },
  confirmed: { label: "Confirmada", className: "bg-amber-100 text-amber-700" },
  on_execution: { label: "Em Execução", className: "bg-blue-100 text-blue-700" },
  completed: { label: "Concluída", className: "bg-green-100 text-green-700" },
};

const VIATURA_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  available: { label: "Disponível", className: "bg-green-100 text-green-700" },
  on_route: { label: "Em Rota", className: "bg-blue-100 text-blue-700" },
  in_maintenance: { label: "Manutenção", className: "bg-amber-100 text-amber-700" },
  inactive: { label: "Inativa", className: "bg-gray-100 text-gray-600" },
};

const TIPO_LABELS: Record<string, string> = {
  open_body: "Caixa Aberta",
  container: "Contentor",
  compactor: "Compactador",
  tank: "Cisterna",
  flatbed: "Plataforma",
  other: "Outro",
};

// ====== Sub-components ======
function KpiCard({
  label,
  value,
  sub,
  highlight,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  highlight?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-4",
        highlight && "border-amber-300 bg-amber-50"
      )}
    >
      <div className="flex items-start justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        {Icon && (
          <Icon
            className={cn(
              "h-4 w-4",
              highlight ? "text-amber-500" : "text-muted-foreground"
            )}
          />
        )}
      </div>
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

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            pct === 100 ? "bg-green-500" : pct > 50 ? "bg-blue-500" : "bg-amber-400"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground w-14 text-right">
        {completed}/{total}
      </span>
    </div>
  );
}

// ====== Main Component ======
export default function LogisticaDashboardPage() {
  const { currentParkId } = useCurrentPark();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [rotasHoje, setRotasHoje] = useState<RotaHoje[]>([]);
  const [frota, setFrota] = useState<ViaturaCard[]>([]);
  const [ordersByStatus, setOrdersByStatus] = useState<OrderByStatus[]>([]);
  const [dailyVolume, setDailyVolume] = useState<DailyVolume[]>([]);
  const [alertas, setAlertas] = useState<{ pedidosCriticos: number; rotasSemMotorista: number }>({
    pedidosCriticos: 0,
    rotasSemMotorista: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentParkId) return;
    const supabase = createClient();
    const today = new Date().toISOString().split("T")[0];
    const now = Date.now();
    const weekStart = new Date(now - 7 * 86_400_000).toISOString();

    setLoading(true);

    Promise.all([
      // All orders
      supabase
        .from("pedidos_recolha")
        .select("id, status, prioridade, quantidade_estimada_kg, sla_deadline, created_at, motorista_id")
        .eq("park_id", currentParkId),
      // Viaturas
      supabase
        .from("viaturas")
        .select("id, matricula, marca, modelo, tipo, capacidade_kg, status")
        .eq("park_id", currentParkId)
        .eq("is_active", true)
        .order("matricula"),
      // Motoristas ativos
      supabase
        .from("motoristas")
        .select("id, is_active")
        .eq("park_id", currentParkId)
        .eq("is_active", true),
      // Rotas de hoje com paragens
      supabase
        .from("rotas")
        .select(
          "id, numero_rota, status, motorista_id, viaturas:viatura_id(matricula), motoristas:motorista_id(nome), rota_paragens(id, status)"
        )
        .eq("park_id", currentParkId)
        .eq("data_rota", today)
        .in("status", ["confirmed", "on_execution", "completed"]),
      // Recolhas concluídas esta semana
      supabase
        .from("pedidos_recolha")
        .select("id")
        .eq("park_id", currentParkId)
        .eq("status", "completed")
        .gte("created_at", weekStart),
    ]).then(([ordersRes, viaturasRes, motoristasRes, rotasRes, weekRes]) => {
      const orders = ordersRes.data ?? [];
      const viaturas = (viaturasRes.data ?? []) as ViaturaCard[];
      const motoristas = motoristasRes.data ?? [];
      const rotas = (rotasRes.data ?? []) as unknown as RotaHoje[];
      const weekCompleted = weekRes.data ?? [];

      // KPIs
      setKpis({
        pedidos_pendentes: orders.filter((o) => o.status === "pending").length,
        rotas_ativas_hoje: rotas.filter((r) =>
          ["confirmed", "on_execution"].includes(r.status)
        ).length,
        viaturas_disponiveis: viaturas.filter((v) => v.status === "available").length,
        viaturas_total: viaturas.length,
        motoristas_em_servico: motoristas.length,
        recolhas_semana: weekCompleted.length,
      });

      setRotasHoje(rotas);
      setFrota(viaturas);

      // Alertas
      const pedidosCriticos = orders.filter(
        (o) =>
          o.prioridade === "critical" &&
          o.status === "pending" &&
          new Date(o.created_at).getTime() < now - 24 * 3_600_000
      ).length;
      const rotasSemMotorista = rotas.filter(
        (r) => r.status === "confirmed" && !r.motorista_id
      ).length;
      setAlertas({ pedidosCriticos, rotasSemMotorista });

      // Orders by status
      const statusCounts = orders.reduce(
        (acc: Record<string, number>, o) => {
          acc[o.status] = (acc[o.status] ?? 0) + 1;
          return acc;
        },
        {}
      );
      setOrdersByStatus(
        Object.entries(statusCounts).map(([status, count]) => ({ status, count }))
      );

      // Daily volume last 7 days
      const days: DailyVolume[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now - i * 86_400_000).toISOString().split("T")[0];
        const dayOrders = orders.filter((o) => o.created_at?.startsWith(d));
        days.push({
          date: d,
          count: dayOrders.length,
          kg: dayOrders.reduce((s, o) => s + ((o.quantidade_estimada_kg as number) ?? 0), 0),
        });
      }
      setDailyVolume(days);

      setLoading(false);
    });
  }, [currentParkId]);

  const maxDayCount = Math.max(...dailyVolume.map((d) => d.count), 1);
  const totalAlertas = alertas.pedidosCriticos + alertas.rotasSemMotorista;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <BarChart2 className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold text-foreground">
          Dashboard de Logística
        </h1>
      </div>

      {/* 6 KPI Cards */}
      {!loading && kpis && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiCard
            label="Pedidos Pendentes"
            value={kpis.pedidos_pendentes}
            sub="a planear"
            icon={ClipboardList}
          />
          <KpiCard
            label="Rotas Ativas Hoje"
            value={kpis.rotas_ativas_hoje}
            sub="confirmadas + execução"
            icon={Map}
          />
          <KpiCard
            label="Viaturas"
            value={`${kpis.viaturas_disponiveis}/${kpis.viaturas_total}`}
            sub="disponíveis / total"
            icon={Truck}
          />
          <KpiCard
            label="Motoristas"
            value={kpis.motoristas_em_servico}
            sub="em serviço"
            icon={Users}
          />
          <KpiCard
            label="Recolhas Semana"
            value={kpis.recolhas_semana}
            sub="concluídas (7 dias)"
            icon={CheckCircle2}
          />
          <KpiCard
            label="Km Percorridos"
            value="—"
            sub="esta semana"
            icon={Truck}
          />
        </div>
      )}

      {/* Tab Nav */}
      <div className="flex border-b border-border gap-0 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {tab.key === "overview" && totalAlertas > 0 && (
                <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-bold">
                  {totalAlertas}
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
          {/* ====== VISÃO GERAL ====== */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Alert cards */}
              {(alertas.pedidosCriticos > 0 || alertas.rotasSemMotorista > 0) && (
                <div className="space-y-2">
                  {alertas.pedidosCriticos > 0 && (
                    <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                      <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                      <span className="text-sm text-red-700">
                        <strong>{alertas.pedidosCriticos}</strong> pedido(s) crítico(s) pendentes há mais de 24h
                      </span>
                      <Link
                        href="/logistica/pedidos"
                        className="ml-auto text-xs font-medium text-red-600 hover:underline flex items-center gap-1"
                      >
                        Ver pedidos <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  )}
                  {alertas.rotasSemMotorista > 0 && (
                    <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                      <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                      <span className="text-sm text-amber-700">
                        <strong>{alertas.rotasSemMotorista}</strong> rota(s) hoje sem motorista atribuído
                      </span>
                      <Link
                        href="/logistica/planeamento"
                        className="ml-auto text-xs font-medium text-amber-600 hover:underline flex items-center gap-1"
                      >
                        Planeamento <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* Rotas de hoje table */}
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-muted/30">
                  <h3 className="text-sm font-semibold text-foreground">
                    Rotas de Hoje
                  </h3>
                </div>
                {rotasHoje.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Nenhuma rota agendada para hoje
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/20">
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Rota</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Viatura</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Motorista</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Progresso</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Estado</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {rotasHoje.map((r) => {
                        const paragens = r.rota_paragens ?? [];
                        const completed = paragens.filter((p) =>
                          ["completed", "failed", "skipped"].includes(p.status)
                        ).length;
                        const cfg =
                          ROTA_STATUS_CONFIG[r.status] ?? ROTA_STATUS_CONFIG.draft;
                        return (
                          <tr
                            key={r.id}
                            className="border-b border-border last:border-0 hover:bg-accent/30"
                          >
                            <td className="px-4 py-3 font-mono font-medium text-foreground">
                              {r.numero_rota}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {r.viaturas?.matricula ?? "—"}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {r.motoristas?.nome ?? (
                                <span className="text-amber-600 text-xs font-medium">Não atribuído</span>
                              )}
                            </td>
                            <td className="px-4 py-3 w-36">
                              <ProgressBar
                                completed={completed}
                                total={paragens.length}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={cn(
                                  "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                                  cfg.className
                                )}
                              >
                                {cfg.label}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <Link
                                href={`/logistica/rotas/${r.id}`}
                                className="text-xs font-medium text-primary hover:underline"
                              >
                                Ver
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Volume bar chart */}
              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="text-sm font-semibold text-foreground mb-4">
                  Pedidos — Últimos 7 Dias
                </h3>
                <div className="flex items-end gap-3 justify-around">
                  {dailyVolume.map((d) => (
                    <div key={d.date} className="flex flex-col items-center gap-1">
                      <div className="flex items-end h-16 w-8">
                        <div
                          className="w-full rounded-t bg-primary/70"
                          style={{
                            height: `${(d.count / maxDayCount) * 100}%`,
                            minHeight: d.count > 0 ? "4px" : "0",
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{d.date.slice(5)}</span>
                      <span className="text-xs font-medium text-foreground">{d.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ====== MAPA ====== */}
          {activeTab === "mapa" && (
            <div className="rounded-lg border border-border bg-card p-8 text-center space-y-4">
              <Map className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Mapa de Tracking em Tempo Real
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Veja a posição das viaturas e pedidos no mapa interativo.
                </p>
              </div>
              <Link
                href="/logistica/tracking"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
              >
                Abrir Mapa de Tracking <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}

          {/* ====== ROTAS HOJE ====== */}
          {activeTab === "rotas" && (
            <div className="space-y-4">
              {rotasHoje.length === 0 ? (
                <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                  Nenhuma rota agendada para hoje
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {rotasHoje.map((r) => {
                    const paragens = r.rota_paragens ?? [];
                    const completed = paragens.filter((p) =>
                      ["completed", "failed", "skipped"].includes(p.status)
                    ).length;
                    const cfg = ROTA_STATUS_CONFIG[r.status] ?? ROTA_STATUS_CONFIG.draft;
                    return (
                      <div
                        key={r.id}
                        className="rounded-lg border border-border bg-card p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-semibold text-foreground">
                            {r.numero_rota}
                          </span>
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                              cfg.className
                            )}
                          >
                            {cfg.label}
                          </span>
                        </div>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Truck className="h-3.5 w-3.5" />
                            {r.viaturas?.matricula ?? "—"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            {r.motoristas?.nome ?? (
                              <span className="text-amber-600">Não atribuído</span>
                            )}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span>Paragens</span>
                            <span>{completed}/{paragens.length}</span>
                          </div>
                          <ProgressBar completed={completed} total={paragens.length} />
                        </div>
                        <Link
                          href={`/logistica/rotas/${r.id}`}
                          className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          Ver Rota <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ====== FROTA ====== */}
          {activeTab === "frota" && (
            <div className="space-y-4">
              {frota.length === 0 ? (
                <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                  Nenhuma viatura registada
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {frota.map((v) => {
                    const cfg = VIATURA_STATUS_CONFIG[v.status] ?? VIATURA_STATUS_CONFIG.inactive;
                    return (
                      <Link
                        key={v.id}
                        href={`/logistica/viaturas/${v.id}`}
                        className="rounded-lg border border-border bg-card p-4 space-y-2 hover:border-primary/30 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-lg font-bold text-foreground">
                            {v.matricula}
                          </span>
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                              cfg.className
                            )}
                          >
                            {cfg.label}
                          </span>
                        </div>
                        {(v.marca || v.modelo) && (
                          <p className="text-sm text-muted-foreground">
                            {[v.marca, v.modelo].filter(Boolean).join(" ")}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{TIPO_LABELS[v.tipo] ?? v.tipo}</span>
                          <span>{(v.capacidade_kg / 1000).toFixed(1)} t</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ====== KPIs ====== */}
          {activeTab === "kpis" && (
            <div className="space-y-6">
              {/* Orders by status */}
              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="text-sm font-semibold text-foreground mb-4">
                  Pedidos por Estado
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
                          <span className="text-sm text-muted-foreground w-24 text-right text-xs">
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
                  {ordersByStatus.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Sem pedidos registados
                    </p>
                  )}
                </div>
              </div>

              {/* Daily volume bar chart */}
              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="text-sm font-semibold text-foreground mb-4">
                  Volume Diário — Últimos 7 Dias
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

              {/* Summary stats */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <KpiCard
                  label="Total Pedidos"
                  value={ordersByStatus.reduce((s, x) => s + x.count, 0)}
                  icon={ClipboardList}
                />
                <KpiCard
                  label="Taxa Conclusão"
                  value={(() => {
                    const total = ordersByStatus.reduce((s, x) => s + x.count, 0);
                    const done = ordersByStatus
                      .filter((x) => x.status === "completed")
                      .reduce((s, x) => s + x.count, 0);
                    return total > 0 ? `${Math.round((done / total) * 100)}%` : "—";
                  })()}
                  sub="pedidos concluídos"
                  icon={CheckCircle2}
                />
                <KpiCard
                  label="Kg Totais (7d)"
                  value={`${(dailyVolume.reduce((s, d) => s + d.kg, 0) / 1000).toFixed(1)} t`}
                  sub="estimados"
                  icon={Clock}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
