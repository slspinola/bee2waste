"use client";

import { useEffect, useState } from "react";
import { useCurrentPark } from "@/hooks/use-current-park";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Plus, ClipboardList, AlertCircle, Clock, MapPin } from "lucide-react";
import type { OrderStatus, OrderPriority } from "@/types/enums";

type Pedido = {
  id: string;
  numero_pedido: string;
  status: OrderStatus;
  prioridade: OrderPriority;
  morada_recolha: string;
  cidade_recolha: string | null;
  quantidade_estimada_kg: number | null;
  ler_code: string | null;
  data_agendada: string | null;
  sla_deadline: string | null;
  created_at: string;
  clients: { name: string } | null;
};

const STATUS_CONFIG: Record<OrderStatus, { label: string; className: string }> = {
  draft: {
    label: "Rascunho",
    className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  },
  pending: {
    label: "Pendente",
    className:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  planned: {
    label: "Planeado",
    className:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  on_route: {
    label: "Em Rota",
    className:
      "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  },
  at_client: {
    label: "No Cliente",
    className:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  },
  completed: {
    label: "Concluído",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  failed: {
    label: "Falhado",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
  cancelled: {
    label: "Cancelado",
    className:
      "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
  },
};

const PRIORITY_CONFIG: Record<
  OrderPriority,
  { label: string; className: string }
> = {
  normal: { label: "Normal", className: "text-muted-foreground" },
  urgent: {
    label: "Urgente",
    className: "text-yellow-600 dark:text-yellow-400",
  },
  critical: { label: "Crítico", className: "text-red-600 dark:text-red-400" },
};

const STATUS_FILTERS: Array<{ value: OrderStatus | "all"; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendentes" },
  { value: "planned", label: "Planeados" },
  { value: "on_route", label: "Em Rota" },
  { value: "completed", label: "Concluídos" },
  { value: "failed", label: "Falhados" },
  { value: "cancelled", label: "Cancelados" },
];

function isSlaRisk(sla_deadline: string | null): boolean {
  if (!sla_deadline) return false;
  const diff = new Date(sla_deadline).getTime() - Date.now();
  return diff < 48 * 60 * 60 * 1000 && diff > 0;
}

function isSlaMissed(sla_deadline: string | null): boolean {
  if (!sla_deadline) return false;
  return new Date(sla_deadline).getTime() < Date.now();
}

export default function PedidosPage() {
  const { currentParkId } = useCurrentPark();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");

  useEffect(() => {
    if (!currentParkId) return;
    const supabase = createClient();
    let query = supabase
      .from("pedidos_recolha")
      .select(
        "id, numero_pedido, status, prioridade, morada_recolha, cidade_recolha, quantidade_estimada_kg, ler_code, data_agendada, sla_deadline, created_at, clients:client_id(name)"
      )
      .eq("park_id", currentParkId)
      .order("created_at", { ascending: false });

    if (statusFilter !== "all") query = query.eq("status", statusFilter);

    query.then(({ data }) => {
      setPedidos((data as unknown as Pedido[]) ?? []);
      setLoading(false);
    });
  }, [currentParkId, statusFilter]);

  const slaRiskCount = pedidos.filter((p) => isSlaRisk(p.sla_deadline)).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Pedidos de Recolha
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestão de pedidos de recolha de resíduos
          </p>
        </div>
        <Link href="/logistica/pedidos/novo">
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Pedido
          </Button>
        </Link>
      </div>

      {/* SLA risk alert */}
      {slaRiskCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20 px-4 py-3 text-sm text-yellow-800 dark:text-yellow-400">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>
            <strong>{slaRiskCount}</strong> pedido(s) com SLA em risco (&lt;48h)
          </span>
        </div>
      )}

      {/* Status filters */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              statusFilter === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Orders table */}
      <div className="rounded-lg border border-border bg-card">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            A carregar...
          </div>
        ) : pedidos.length === 0 ? (
          <div className="p-8 text-center">
            <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              {statusFilter === "all"
                ? "Nenhum pedido registado"
                : `Sem pedidos com estado "${STATUS_FILTERS.find((f) => f.value === statusFilter)?.label}"`}
            </p>
            {statusFilter === "all" && (
              <Link href="/logistica/pedidos/novo">
                <Button size="sm" variant="outline" className="mt-4">
                  Criar primeiro pedido
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Pedido
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Cliente
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Localização
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Quantidade
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  SLA
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Estado
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p) => {
                const statusCfg = STATUS_CONFIG[p.status];
                const priorityCfg = PRIORITY_CONFIG[p.prioridade];
                const slaRisk = isSlaRisk(p.sla_deadline);
                const slaMissed = isSlaMissed(p.sla_deadline);
                return (
                  <tr
                    key={p.id}
                    className={cn(
                      "border-b border-border last:border-0 hover:bg-accent/30",
                      (slaRisk || slaMissed) &&
                        "bg-red-50/30 dark:bg-red-900/5"
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="font-mono text-sm font-medium text-foreground">
                        {p.numero_pedido}
                      </div>
                      <div
                        className={cn(
                          "text-xs font-medium",
                          priorityCfg.className
                        )}
                      >
                        {priorityCfg.label}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {p.clients?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-1 text-xs text-muted-foreground">
                        <MapPin className="mt-0.5 h-3 w-3 flex-shrink-0" />
                        <span>
                          {p.cidade_recolha
                            ? p.cidade_recolha
                            : p.morada_recolha.slice(0, 30)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {p.quantidade_estimada_kg
                        ? `${(p.quantidade_estimada_kg / 1000).toFixed(1)} t`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {p.sla_deadline ? (
                        <div
                          className={cn(
                            "flex items-center gap-1 text-xs",
                            slaMissed
                              ? "text-red-600 dark:text-red-400 font-medium"
                              : slaRisk
                                ? "text-yellow-600 dark:text-yellow-400"
                                : "text-muted-foreground"
                          )}
                        >
                          <Clock className="h-3 w-3" />
                          {slaMissed
                            ? "Expirado"
                            : new Date(p.sla_deadline).toLocaleDateString(
                                "pt-PT"
                              )}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                          statusCfg.className
                        )}
                      >
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/logistica/pedidos/${p.id}`}>
                        <Button size="sm" variant="outline">
                          Ver
                        </Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
