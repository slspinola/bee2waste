"use client";
import { use, useState, useEffect, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Link } from "@/i18n/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  startRota,
  registarChegada,
  concluirParagem,
  falharParagem,
  concludeRota,
} from "@/actions/logistics/routes";

type Paragem = {
  id: string;
  ordem: number;
  status: "pending" | "at_client" | "completed" | "failed" | "skipped";
  hora_chegada_estimada: string | null;
  hora_chegada_real: string | null;
  hora_saida_real: string | null;
  quantidade_real_kg: number | null;
  notas: string | null;
  pedidos_recolha: {
    id: string;
    numero_pedido: string;
    morada_recolha: string;
    cidade_recolha: string | null;
    quantidade_estimada_kg: number | null;
    clients: { name: string } | null;
  } | null;
};

type Rota = {
  id: string;
  numero_rota: string;
  status: string;
  data_rota: string;
  hora_partida: string | null;
  viaturas: { matricula: string } | null;
  motoristas: { nome: string } | null;
  rota_paragens: Paragem[];
};

const STOP_STATUS_CONFIG: Record<
  string,
  { label: string; color: string }
> = {
  pending: { label: "Pendente", color: "bg-muted text-muted-foreground" },
  at_client: { label: "No cliente", color: "bg-blue-100 text-blue-700" },
  completed: { label: "Concluída", color: "bg-green-100 text-green-700" },
  failed: { label: "Falhou", color: "bg-red-100 text-red-700" },
  skipped: { label: "Ignorada", color: "bg-amber-100 text-amber-700" },
};

export default function RotaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [rota, setRota] = useState<Rota | null>(null);
  const [isPending, startTransition] = useTransition();
  const [weightInputs, setWeightInputs] = useState<Record<string, string>>({});
  const [failReasons, setFailReasons] = useState<Record<string, string>>({});

  const load = () => {
    const supabase = createClient();
    supabase
      .from("rotas")
      .select(
        `
        id, numero_rota, status, data_rota, hora_partida,
        viaturas:viatura_id(matricula),
        motoristas:motorista_id(nome),
        rota_paragens(
          id, ordem, status, hora_chegada_estimada, hora_chegada_real, hora_saida_real, quantidade_real_kg, notas,
          pedidos_recolha:pedido_id(id, numero_pedido, morada_recolha, cidade_recolha, quantidade_estimada_kg, clients:client_id(name))
        )
      `
      )
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (!data) return;
        const sorted = {
          ...data,
          rota_paragens: [
            ...(data.rota_paragens as unknown as Paragem[]),
          ].sort((a, b) => a.ordem - b.ordem),
        };
        setRota(sorted as unknown as Rota);
      });
  };

  useEffect(() => {
    load();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const canStart = rota?.status === "confirmed";
  const canConclude =
    rota?.status === "on_execution" &&
    rota.rota_paragens.every((p) =>
      ["completed", "failed", "skipped"].includes(p.status)
    );

  const action = (fn: () => Promise<unknown>) => {
    startTransition(async () => {
      try {
        await fn();
        load();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro inesperado");
      }
    });
  };

  if (!rota)
    return (
      <div className="p-6 text-muted-foreground">A carregar...</div>
    );

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/logistica/planeamento"
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-foreground">
              {rota.numero_rota}
            </h1>
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-xs font-medium",
                rota.status === "on_execution"
                  ? "bg-blue-100 text-blue-700"
                  : rota.status === "completed"
                  ? "bg-green-100 text-green-700"
                  : rota.status === "confirmed"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {rota.status === "draft"
                ? "Rascunho"
                : rota.status === "confirmed"
                ? "Confirmada"
                : rota.status === "on_execution"
                ? "Em Execução"
                : rota.status === "completed"
                ? "Concluída"
                : rota.status}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Truck className="h-3.5 w-3.5" />
              {rota.viaturas?.matricula ?? "—"}
            </span>
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              {rota.motoristas?.nome ?? "—"}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {rota.data_rota}
              {rota.hora_partida
                ? ` às ${rota.hora_partida}`
                : ""}
            </span>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {canStart && (
            <Button
              onClick={() => action(() => startRota(rota.id))}
              disabled={isPending}
            >
              Iniciar Rota
            </Button>
          )}
          {canConclude && (
            <Button
              onClick={() => action(() => concludeRota(rota.id))}
              disabled={isPending}
              variant="outline"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" /> Concluir Rota
            </Button>
          )}
        </div>
      </div>

      {/* Stops list */}
      <ol className="space-y-4">
        {rota.rota_paragens.map((p) => {
          const pedido = p.pedidos_recolha;
          const cfg =
            STOP_STATUS_CONFIG[p.status] ?? STOP_STATUS_CONFIG.pending;
          return (
            <li
              key={p.id}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-white text-sm font-bold">
                  {p.ordem}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {pedido ? (
                          <Link
                            href={`/logistica/pedidos/${pedido.id}`}
                            className="hover:underline"
                          >
                            {pedido.numero_pedido}
                          </Link>
                        ) : (
                          "—"
                        )}
                        {pedido?.clients && (
                          <span className="ml-2 font-normal text-muted-foreground">
                            · {pedido.clients.name}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" />
                        {pedido?.morada_recolha}
                        {pedido?.cidade_recolha && `, ${pedido.cidade_recolha}`}
                      </p>
                      {pedido?.quantidade_estimada_kg && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Estimado:{" "}
                          {pedido.quantidade_estimada_kg.toLocaleString(
                            "pt-PT"
                          )}{" "}
                          kg
                        </p>
                      )}
                    </div>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-medium shrink-0",
                        cfg.color
                      )}
                    >
                      {cfg.label}
                    </span>
                  </div>

                  {/* Timing info */}
                  {(p.hora_chegada_real || p.hora_saida_real) && (
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                      {p.hora_chegada_real && (
                        <span>
                          Chegada:{" "}
                          {new Date(p.hora_chegada_real).toLocaleTimeString(
                            "pt-PT",
                            { hour: "2-digit", minute: "2-digit" }
                          )}
                        </span>
                      )}
                      {p.hora_saida_real && (
                        <span>
                          Saída:{" "}
                          {new Date(p.hora_saida_real).toLocaleTimeString(
                            "pt-PT",
                            { hour: "2-digit", minute: "2-digit" }
                          )}
                        </span>
                      )}
                      {p.quantidade_real_kg != null && (
                        <span>
                          Real: {p.quantidade_real_kg.toLocaleString("pt-PT")} kg
                        </span>
                      )}
                    </div>
                  )}

                  {p.notas && p.status === "failed" && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                      Motivo: {p.notas}
                    </p>
                  )}

                  {/* Execution actions (only when route is on_execution) */}
                  {rota.status === "on_execution" && (
                    <div className="mt-3 flex flex-wrap gap-2 items-end">
                      {p.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() =>
                              action(() => registarChegada(p.id))
                            }
                            disabled={isPending}
                          >
                            Chegada
                          </Button>
                          <div className="flex gap-2 items-center">
                            <Input
                              placeholder="Motivo da falha..."
                              className="h-8 w-44 text-sm"
                              value={failReasons[p.id] ?? ""}
                              onChange={(e) =>
                                setFailReasons((r) => ({
                                  ...r,
                                  [p.id]: e.target.value,
                                }))
                              }
                            />
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() =>
                                action(() =>
                                  falharParagem(
                                    p.id,
                                    failReasons[p.id] ?? ""
                                  )
                                )
                              }
                              disabled={isPending}
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              Falhou
                            </Button>
                          </div>
                        </>
                      )}
                      {p.status === "at_client" && (
                        <div className="flex gap-2 items-center">
                          <Input
                            type="number"
                            placeholder="Peso real (kg)"
                            className="h-8 w-36 text-sm"
                            value={weightInputs[p.id] ?? ""}
                            onChange={(e) =>
                              setWeightInputs((w) => ({
                                ...w,
                                [p.id]: e.target.value,
                              }))
                            }
                          />
                          <Button
                            size="sm"
                            onClick={() =>
                              action(() =>
                                concluirParagem(p.id, {
                                  quantidade_real_kg: parseFloat(
                                    weightInputs[p.id] ?? "0"
                                  ),
                                })
                              )
                            }
                            disabled={isPending || !weightInputs[p.id]}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Concluída
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {rota.rota_paragens.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">
          Esta rota não tem paragens definidas.
        </p>
      )}
    </div>
  );
}
