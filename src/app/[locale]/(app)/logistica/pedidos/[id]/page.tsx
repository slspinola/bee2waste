"use client";

import { use, useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { cancelPedido } from "@/actions/logistics/orders";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  User,
  Weight,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { OrderStatus, OrderPriority } from "@/types/enums";

type Pedido = {
  id: string;
  numero_pedido: string;
  status: OrderStatus;
  prioridade: OrderPriority;
  morada_recolha: string;
  cidade_recolha: string | null;
  codigo_postal_recolha: string | null;
  contacto_local: string | null;
  instrucoes_especiais: string | null;
  quantidade_estimada_kg: number | null;
  quantidade_real_kg: number | null;
  ler_code: string | null;
  descricao_residuo: string | null;
  data_agendada: string | null;
  sla_deadline: string | null;
  failure_reason: string | null;
  cancellation_reason: string | null;
  notas: string | null;
  created_at: string;
  completed_at: string | null;
  clients: { name: string; nif: string | null } | null;
  rotas: {
    id: string;
    numero_rota: string;
    data_rota: string;
    motoristas: { nome: string } | null;
    viaturas: { matricula: string } | null;
  } | null;
};

const STATUS_CONFIG: Record<OrderStatus, { label: string; className: string }> =
  {
    draft: {
      label: "Rascunho",
      className:
        "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
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
      className:
        "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    },
    cancelled: {
      label: "Cancelado",
      className:
        "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
    },
  };

const PRIORITY_LABELS: Record<OrderPriority, string> = {
  normal: "Normal",
  urgent: "Urgente",
  critical: "Crítico",
};

export default function PedidoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("pedidos_recolha")
      .select(
        `
        id, numero_pedido, status, prioridade, morada_recolha, cidade_recolha, codigo_postal_recolha,
        contacto_local, instrucoes_especiais, quantidade_estimada_kg, quantidade_real_kg,
        ler_code, descricao_residuo, data_agendada, sla_deadline, failure_reason, cancellation_reason,
        notas, created_at, completed_at,
        clients:client_id(name, nif),
        rotas:rota_id(id, numero_rota, data_rota, motoristas:motorista_id(nome), viaturas:viatura_id(matricula))
      `
      )
      .eq("id", id)
      .single()
      .then(({ data }) => {
        setPedido(data as unknown as Pedido);
        setLoading(false);
      });
  }, [id]);

  const handleCancel = () => {
    const reason = prompt("Motivo do cancelamento:");
    if (!reason) return;
    startTransition(async () => {
      try {
        await cancelPedido(id, reason);
        toast.success("Pedido cancelado");
        setPedido((p) =>
          p ? { ...p, status: "cancelled", cancellation_reason: reason } : p
        );
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Erro ao cancelar pedido"
        );
      }
    });
  };

  if (loading)
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        A carregar...
      </div>
    );
  if (!pedido)
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        Pedido não encontrado
      </div>
    );

  const statusCfg = STATUS_CONFIG[pedido.status];
  const canCancel = ["pending", "planned"].includes(pedido.status);
  const slaMissed =
    pedido.sla_deadline &&
    new Date(pedido.sla_deadline).getTime() < Date.now();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/logistica/pedidos">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {pedido.numero_pedido}
            </h1>
            <div className="mt-1 flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                  statusCfg.className
                )}
              >
                {statusCfg.label}
              </span>
              {pedido.prioridade !== "normal" && (
                <span
                  className={cn(
                    "text-xs font-medium",
                    pedido.prioridade === "critical"
                      ? "text-red-600 dark:text-red-400"
                      : "text-yellow-600 dark:text-yellow-400"
                  )}
                >
                  {PRIORITY_LABELS[pedido.prioridade]}
                </span>
              )}
            </div>
          </div>
        </div>
        {canCancel && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          >
            Cancelar Pedido
          </Button>
        )}
      </div>

      {/* Detail cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Client */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <User className="h-4 w-4" />
            Cliente
          </div>
          <p className="font-medium text-foreground">
            {pedido.clients?.name ?? "—"}
          </p>
          {pedido.clients?.nif && (
            <p className="text-xs text-muted-foreground">
              NIF: {pedido.clients.nif}
            </p>
          )}
        </div>

        {/* Location */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <MapPin className="h-4 w-4" />
            Localização
          </div>
          <p className="text-sm text-foreground">{pedido.morada_recolha}</p>
          {pedido.cidade_recolha && (
            <p className="text-xs text-muted-foreground">
              {pedido.cidade_recolha}
              {pedido.codigo_postal_recolha
                ? ` ${pedido.codigo_postal_recolha}`
                : ""}
            </p>
          )}
          {pedido.contacto_local && (
            <p className="mt-1 text-xs text-muted-foreground">
              Contacto: {pedido.contacto_local}
            </p>
          )}
        </div>

        {/* Quantity & LER */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Weight className="h-4 w-4" />
            Quantidade
          </div>
          {pedido.ler_code && (
            <p className="font-mono text-sm text-foreground">
              {pedido.ler_code}
            </p>
          )}
          {pedido.descricao_residuo && (
            <p className="text-xs text-muted-foreground">
              {pedido.descricao_residuo}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            {pedido.quantidade_estimada_kg
              ? `Est. ${(pedido.quantidade_estimada_kg / 1000).toFixed(1)} t`
              : "—"}
          </p>
          {pedido.quantidade_real_kg && (
            <p className="text-sm font-medium text-foreground">
              Real: {(pedido.quantidade_real_kg / 1000).toFixed(1)} t
            </p>
          )}
        </div>

        {/* Scheduling */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Calendar className="h-4 w-4" />
            Agendamento
          </div>
          {pedido.data_agendada && (
            <p className="text-sm text-foreground">
              Agendado:{" "}
              {new Date(pedido.data_agendada).toLocaleDateString("pt-PT")}
            </p>
          )}
          {pedido.sla_deadline && (
            <p
              className={cn(
                "text-xs",
                slaMissed
                  ? "font-medium text-red-600 dark:text-red-400"
                  : "text-muted-foreground"
              )}
            >
              SLA:{" "}
              {new Date(pedido.sla_deadline).toLocaleDateString("pt-PT")}
              {slaMissed ? " (Expirado)" : ""}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            Criado: {new Date(pedido.created_at).toLocaleDateString("pt-PT")}
          </p>
          {pedido.completed_at && (
            <p className="text-xs text-muted-foreground">
              Concluído:{" "}
              {new Date(pedido.completed_at).toLocaleDateString("pt-PT")}
            </p>
          )}
        </div>

        {/* Route assignment */}
        {pedido.rotas && (
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="mb-2 text-sm font-medium text-muted-foreground">
              Rota Atribuída
            </p>
            <Link
              href={`/logistica/rotas/${pedido.rotas.id}`}
              className="font-mono text-sm font-medium text-primary hover:underline"
            >
              {pedido.rotas.numero_rota}
            </Link>
            <p className="text-xs text-muted-foreground">
              {new Date(pedido.rotas.data_rota).toLocaleDateString("pt-PT")}
            </p>
            {pedido.rotas.motoristas && (
              <p className="text-xs text-muted-foreground">
                {pedido.rotas.motoristas.nome}
              </p>
            )}
            {pedido.rotas.viaturas && (
              <p className="font-mono text-xs text-muted-foreground">
                {pedido.rotas.viaturas.matricula}
              </p>
            )}
          </div>
        )}

        {/* Notes, instructions, failure/cancellation */}
        {(pedido.instrucoes_especiais ||
          pedido.notas ||
          pedido.failure_reason ||
          pedido.cancellation_reason) && (
          <div className="rounded-lg border border-border bg-card p-4 sm:col-span-2">
            {pedido.instrucoes_especiais && (
              <div className="mb-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  Instruções Especiais
                </p>
                <p className="text-sm text-foreground">
                  {pedido.instrucoes_especiais}
                </p>
              </div>
            )}
            {pedido.notas && (
              <div className="mb-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  Notas Internas
                </p>
                <p className="text-sm text-foreground">{pedido.notas}</p>
              </div>
            )}
            {pedido.failure_reason && (
              <div className="flex items-start gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium">Motivo da falha</p>
                  <p className="text-sm">{pedido.failure_reason}</p>
                </div>
              </div>
            )}
            {pedido.cancellation_reason && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Motivo do cancelamento
                </p>
                <p className="text-sm text-muted-foreground">
                  {pedido.cancellation_reason}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
