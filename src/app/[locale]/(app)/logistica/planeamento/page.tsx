"use client";
import { useState, useEffect, useTransition } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { useCurrentPark } from "@/hooks/use-current-park";
import { Link } from "@/i18n/navigation";
import {
  createRota,
  addParagem,
  removeParagem,
  confirmRota,
  updateRotaAssignment,
} from "@/actions/logistics/routes";
import {
  calculatePlanningScores,
  type ScoredOrder,
} from "@/actions/logistics/planning";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Check,
  Map,
  List,
  Truck,
  User,
  Clock,
  BarChart2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Dynamic imports for Leaflet components (must not SSR)
const BaseMap = dynamic(() => import("@/components/maps/base-map"), {
  ssr: false,
});
const OrderMarkers = dynamic(() => import("@/components/maps/order-markers"), {
  ssr: false,
});

// --- Types ---
type Pedido = {
  id: string;
  numero_pedido: string;
  morada_recolha: string;
  cidade_recolha: string | null;
  prioridade: "normal" | "urgent" | "critical";
  status: string;
  quantidade_estimada_kg: number | null;
  collection_lat: number | null;
  collection_lng: number | null;
  sla_deadline: string | null;
  clients: { name: string } | null;
};

type Paragem = {
  id: string;
  ordem: number;
  pedido_id: string;
  pedido: Pedido;
};

type Rota = {
  id: string;
  numero_rota: string;
  status: string;
  viatura_id: string | null;
  motorista_id: string | null;
  data_rota: string;
  hora_partida: string | null;
  paragens: Paragem[];
};

type Viatura = { id: string; matricula: string; capacidade_kg: number };
type Motorista = { id: string; nome: string };

const PRIORITY_LABELS: Record<string, string> = {
  normal: "Normal",
  urgent: "Urgente",
  critical: "Crítico",
};

const PRIORITY_COLORS: Record<string, string> = {
  normal: "bg-blue-50 text-blue-700 border-blue-200",
  urgent: "bg-amber-50 text-amber-700 border-amber-200",
  critical: "bg-red-50 text-red-700 border-red-200",
};

export default function PlaneamentoPage() {
  const { currentParkId } = useCurrentPark();
  const [isPending, startTransition] = useTransition();

  // Data state
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [rota, setRota] = useState<Rota | null>(null);
  const [viaturas, setViaturas] = useState<Viatura[]>([]);
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);

  // Score state
  const [scores, setScores] = useState<Record<string, number>>({});
  const [scoringLoading, setScoringLoading] = useState(false);

  // UI state
  const [showNewRotaForm, setShowNewRotaForm] = useState(false);
  const [newRotaDate, setNewRotaDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedRotaId, setSelectedRotaId] = useState<string>("");
  const [allRotas, setAllRotas] = useState<
    {
      id: string;
      numero_rota: string;
      status: string;
      data_rota: string;
    }[]
  >([]);

  const loadData = () => {
    if (!currentParkId) return;
    const supabase = createClient();

    // Load pending orders (not yet planned)
    supabase
      .from("pedidos_recolha")
      .select(
        "id, numero_pedido, morada_recolha, cidade_recolha, prioridade, status, quantidade_estimada_kg, collection_lat, collection_lng, sla_deadline, clients:client_id(name)"
      )
      .eq("park_id", currentParkId)
      .in("status", ["pending"])
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) setPedidos(data as unknown as Pedido[]);
      });

    // Load draft/confirmed rotas for selection
    supabase
      .from("rotas")
      .select("id, numero_rota, status, data_rota")
      .eq("park_id", currentParkId)
      .in("status", ["draft", "confirmed", "on_execution", "completed"])
      .order("data_rota", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) {
          setAllRotas(data);
          if (data.length && !selectedRotaId) {
            const draft = data.find((r) => r.status === "draft");
            if (draft) setSelectedRotaId(draft.id);
          }
        }
      });

    // Load available viaturas
    supabase
      .from("viaturas")
      .select("id, matricula, capacidade_kg")
      .eq("park_id", currentParkId)
      .eq("status", "available")
      .then(({ data }) => {
        if (data) setViaturas(data);
      });

    // Load active motoristas
    supabase
      .from("motoristas")
      .select("id, nome")
      .eq("park_id", currentParkId)
      .eq("is_active", true)
      .then(({ data }) => {
        if (data) setMotoristas(data);
      });
  };

  const loadRota = (rotaId: string) => {
    if (!rotaId) {
      setRota(null);
      return;
    }
    const supabase = createClient();
    supabase
      .from("rotas")
      .select(
        `
        id, numero_rota, status, viatura_id, motorista_id, data_rota, hora_partida,
        rota_paragens(
          id, ordem, pedido_id, status,
          pedidos_recolha:pedido_id(id, numero_pedido, morada_recolha, cidade_recolha, prioridade, quantidade_estimada_kg, collection_lat, collection_lng, sla_deadline, clients:client_id(name))
        )
      `
      )
      .eq("id", rotaId)
      .single()
      .then(({ data }) => {
        if (!data) return;
        const paragens = (
          (
            data.rota_paragens as unknown as Array<{
              id: string;
              ordem: number;
              pedido_id: string;
              status: string;
              pedidos_recolha: Pedido;
            }>
          ) ?? []
        )
          .sort((a, b) => a.ordem - b.ordem)
          .map((p) => ({
            id: p.id,
            ordem: p.ordem,
            pedido_id: p.pedido_id,
            pedido: p.pedidos_recolha,
          }));

        setRota({
          id: data.id,
          numero_rota: data.numero_rota,
          status: data.status,
          viatura_id: data.viatura_id,
          motorista_id: data.motorista_id,
          data_rota: data.data_rota,
          hora_partida: data.hora_partida,
          paragens,
        });
      });
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentParkId]);

  useEffect(() => {
    loadRota(selectedRotaId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRotaId]);

  const handleCalculateScores = async () => {
    if (!currentParkId) return;
    setScoringLoading(true);
    try {
      const scored = await calculatePlanningScores(currentParkId);
      const map = Object.fromEntries(scored.map((s: ScoredOrder) => [s.id, s.planning_score]));
      setScores(map);
      // Re-sort pedidos by score descending
      setPedidos((prev) =>
        [...prev].sort((a, b) => (map[b.id] ?? 0) - (map[a.id] ?? 0))
      );
      toast.success(`Scores calculados para ${scored.length} pedidos`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao calcular scores");
    } finally {
      setScoringLoading(false);
    }
  };

  const handleCreateRota = () => {
    if (!currentParkId) return;
    startTransition(async () => {
      try {
        const r = await createRota({
          park_id: currentParkId,
          data_rota: newRotaDate,
        });
        setSelectedRotaId(r.id);
        setShowNewRotaForm(false);
        toast.success(`Rota ${r.numero_rota} criada`);
        loadData();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao criar rota");
      }
    });
  };

  const handleAddPedido = (pedido: Pedido) => {
    if (!rota) return toast.error("Selecione ou crie uma rota primeiro");
    if (rota.status !== "draft")
      return toast.error("Só pode adicionar paragens a rotas em rascunho");
    startTransition(async () => {
      try {
        await addParagem({
          rota_id: rota.id,
          pedido_id: pedido.id,
          ordem: rota.paragens.length + 1,
        });
        loadRota(rota.id);
        loadData();
        toast.success(`${pedido.numero_pedido} adicionado à rota`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro");
      }
    });
  };

  const handleRemoveParagem = (paragemaId: string) => {
    startTransition(async () => {
      try {
        await removeParagem(paragemaId);
        loadRota(rota!.id);
        loadData();
        toast.success("Paragem removida");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro");
      }
    });
  };

  const handleConfirmRota = () => {
    if (!rota) return;
    if (rota.paragens.length === 0)
      return toast.error("A rota não tem paragens");
    startTransition(async () => {
      try {
        await confirmRota(rota.id);
        loadRota(rota.id);
        toast.success("Rota confirmada");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro");
      }
    });
  };

  const handleAssign = (
    field: "viatura_id" | "motorista_id" | "hora_partida",
    value: string
  ) => {
    if (!rota) return;
    startTransition(async () => {
      try {
        await updateRotaAssignment(rota.id, { [field]: value || undefined });
        loadRota(rota.id);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro");
      }
    });
  };

  const totalKg =
    rota?.paragens.reduce(
      (acc, p) => acc + (p.pedido.quantidade_estimada_kg ?? 0),
      0
    ) ?? 0;

  return (
    <div className="flex flex-col h-[calc(100vh-70px)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-sidebar shrink-0">
        <div className="flex items-center gap-3">
          <Map className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold text-foreground">
            Planeamento de Rotas
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCalculateScores}
            disabled={scoringLoading}
          >
            {scoringLoading ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <BarChart2 className="h-4 w-4 mr-1" />
            )}
            Calcular Scores
          </Button>
          {/* Rota selector */}
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={selectedRotaId}
            onChange={(e) => setSelectedRotaId(e.target.value)}
          >
            <option value="">— Selecionar rota —</option>
            {allRotas.map((r) => (
              <option key={r.id} value={r.id}>
                {r.numero_rota} · {r.data_rota} ·{" "}
                {r.status === "draft"
                  ? "Rascunho"
                  : r.status === "confirmed"
                  ? "Confirmada"
                  : r.status === "on_execution"
                  ? "Em Execução"
                  : "Concluída"}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowNewRotaForm((v) => !v)}
          >
            <Plus className="h-4 w-4 mr-1" /> Nova Rota
          </Button>
        </div>
      </div>

      {/* New rota inline form */}
      {showNewRotaForm && (
        <div className="flex items-center gap-3 px-6 py-2 border-b border-border bg-card shrink-0">
          <Label className="text-sm">Data de execução:</Label>
          <Input
            type="date"
            value={newRotaDate}
            onChange={(e) => setNewRotaDate(e.target.value)}
            className="h-8 w-40"
          />
          <Button size="sm" onClick={handleCreateRota} disabled={isPending}>
            Criar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowNewRotaForm(false)}
          >
            Cancelar
          </Button>
        </div>
      )}

      {/* Three-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: Pedidos pendentes */}
        <div className="w-80 shrink-0 border-r border-border bg-card overflow-y-auto flex flex-col">
          <div className="px-4 py-3 border-b border-border sticky top-0 bg-card z-10">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <List className="h-4 w-4" />
              Pedidos Pendentes
              <span className="ml-auto text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                {pedidos.length}
              </span>
            </h2>
          </div>
          {pedidos.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-6 text-center text-muted-foreground text-sm">
              Sem pedidos pendentes
            </div>
          ) : (
            <ul className="p-2 space-y-2">
              {pedidos.map((p) => (
                <li
                  key={p.id}
                  className="rounded-lg border border-border bg-background p-3 hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => handleAddPedido(p)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {p.numero_pedido}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {p.clients?.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {p.morada_recolha}
                      </p>
                      {p.quantidade_estimada_kg && (
                        <p className="text-xs text-muted-foreground">
                          {p.quantidade_estimada_kg.toLocaleString("pt-PT")} kg
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className={cn(
                          "text-xs px-1.5 py-0.5 rounded border font-medium",
                          PRIORITY_COLORS[p.prioridade] ??
                            "bg-muted text-muted-foreground border-border"
                        )}
                      >
                        {PRIORITY_LABELS[p.prioridade] ?? p.prioridade}
                      </span>
                      {p.sla_deadline && (
                        <span className="text-xs text-muted-foreground">
                          SLA:{" "}
                          {new Date(p.sla_deadline).toLocaleDateString("pt-PT")}
                        </span>
                      )}
                      {p.id in scores && (
                        <span
                          className={cn(
                            "text-xs font-bold",
                            (scores[p.id] ?? 0) >= 70
                              ? "text-green-600"
                              : (scores[p.id] ?? 0) >= 40
                                ? "text-amber-600"
                                : "text-red-600"
                          )}
                        >
                          Score: {scores[p.id]}
                        </span>
                      )}
                      <Plus className="h-4 w-4 text-muted-foreground mt-1" />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* CENTER: Map */}
        <div className="flex-1 relative">
          <BaseMap zoom={8} height="100%">
            <OrderMarkers statusFilter={["pending", "planned"]} />
          </BaseMap>
        </div>

        {/* RIGHT: Route builder */}
        <div className="w-80 shrink-0 border-l border-border bg-card overflow-y-auto flex flex-col">
          {!rota ? (
            <div className="flex-1 flex items-center justify-center p-6 text-center text-muted-foreground text-sm">
              Crie ou selecione uma rota para começar o planeamento
            </div>
          ) : (
            <>
              {/* Rota header */}
              <div className="px-4 py-3 border-b border-border sticky top-0 bg-card z-10">
                <div className="flex items-center justify-between mb-1">
                  <Link
                    href={`/logistica/rotas/${rota.id}`}
                    className="text-sm font-semibold text-foreground hover:text-primary hover:underline"
                  >
                    {rota.numero_rota}
                  </Link>
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-medium",
                      rota.status === "draft"
                        ? "bg-muted text-muted-foreground"
                        : rota.status === "confirmed"
                        ? "bg-amber-100 text-amber-700"
                        : rota.status === "on_execution"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-green-100 text-green-700"
                    )}
                  >
                    {rota.status === "draft"
                      ? "Rascunho"
                      : rota.status === "confirmed"
                      ? "Confirmada"
                      : rota.status === "on_execution"
                      ? "Em Execução"
                      : "Concluída"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {rota.data_rota}
                </p>
                {totalKg > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {totalKg.toLocaleString("pt-PT")} kg estimados
                  </p>
                )}
              </div>

              {/* Assignment fields */}
              <div className="px-4 py-3 border-b border-border space-y-2 bg-card">
                <div>
                  <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                    <Truck className="h-3 w-3" /> Viatura
                  </label>
                  <select
                    className="w-full h-8 rounded border border-input bg-background px-2 text-sm"
                    value={rota.viatura_id ?? ""}
                    onChange={(e) => handleAssign("viatura_id", e.target.value)}
                    disabled={rota.status !== "draft"}
                  >
                    <option value="">— Não atribuída —</option>
                    {viaturas.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.matricula} (
                        {v.capacidade_kg.toLocaleString("pt-PT")} kg)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                    <User className="h-3 w-3" /> Motorista
                  </label>
                  <select
                    className="w-full h-8 rounded border border-input bg-background px-2 text-sm"
                    value={rota.motorista_id ?? ""}
                    onChange={(e) =>
                      handleAssign("motorista_id", e.target.value)
                    }
                    disabled={rota.status !== "draft"}
                  >
                    <option value="">— Não atribuído —</option>
                    {motoristas.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                    <Clock className="h-3 w-3" /> Hora de Início
                  </label>
                  <input
                    type="time"
                    className="w-full h-8 rounded border border-input bg-background px-2 text-sm"
                    value={rota.hora_partida ?? ""}
                    onChange={(e) =>
                      handleAssign("hora_partida", e.target.value)
                    }
                    disabled={rota.status !== "draft"}
                  />
                </div>
              </div>

              {/* Paragens list */}
              <div className="flex-1 overflow-y-auto">
                {rota.paragens.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-sm">
                    {rota.status === "draft"
                      ? "Clique num pedido à esquerda para adicionar à rota"
                      : "Esta rota não tem paragens"}
                  </div>
                ) : (
                  <ol className="p-2 space-y-2">
                    {rota.paragens.map((paragem, idx) => (
                      <li
                        key={paragem.id}
                        className="rounded-lg border border-border bg-background p-3"
                      >
                        <div className="flex items-start gap-2">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white text-xs font-bold">
                            {idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {paragem.pedido.numero_pedido}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {paragem.pedido.morada_recolha}
                            </p>
                            {paragem.pedido.quantidade_estimada_kg && (
                              <p className="text-xs text-muted-foreground">
                                {paragem.pedido.quantidade_estimada_kg.toLocaleString(
                                  "pt-PT"
                                )}{" "}
                                kg
                              </p>
                            )}
                          </div>
                          {rota.status === "draft" && (
                            <button
                              onClick={() => handleRemoveParagem(paragem.id)}
                              className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                              disabled={isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              {/* Confirm button */}
              {rota.status === "draft" && (
                <div className="px-4 py-3 border-t border-border shrink-0">
                  <Button
                    className="w-full"
                    onClick={handleConfirmRota}
                    disabled={isPending || rota.paragens.length === 0}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Confirmar Rota ({rota.paragens.length} paragens)
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
