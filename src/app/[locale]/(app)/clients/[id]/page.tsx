"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCurrentPark } from "@/hooks/use-current-park";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, Building2, Truck, ArrowLeftRight, FileText, Shield, Edit2, Star, RefreshCw } from "lucide-react";
import { recalculateSupplierScore, recalculateProductionCycle } from "@/actions/lots";
import { toast } from "sonner";

interface ClientDetail {
  id: string;
  name: string;
  nif: string | null;
  client_type: string;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  contact_person: string | null;
  apa_number: string | null;
  siliamb_id: string | null;
  payment_terms_days: number | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

interface LerAuth {
  id: string;
  ler_code: string;
  operation_type: string | null;
  max_quantity_kg: number | null;
  is_active: boolean;
}

interface Contract {
  id: string;
  contract_number: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  auto_renew: boolean;
}

interface SupplierScore {
  id: string;
  avg_lqi: number | null;
  avg_raw_grade: number | null;
  avg_yield_rate: number | null;
  lot_count: number;
  total_kg: number | null;
  period_start: string | null;
  period_end: string | null;
  score_letter: string | null;
}

interface ProductionCycle {
  id: string;
  avg_interval_days: number | null;
  next_predicted_date: string | null;
  confidence: number | null;
  last_delivery_date: string | null;
}

interface LotHistoryRow {
  contribution_kg: number;
  lots: {
    id: string;
    lot_number: string;
    status: string;
    lqi_grade: string | null;
    closed_at: string | null;
  } | null;
}

const TYPE_ICONS: Record<string, typeof Building2> = {
  supplier: Truck,
  buyer: Building2,
  both: ArrowLeftRight,
};

const TYPE_LABELS: Record<string, string> = {
  supplier: "Fornecedor",
  buyer: "Comprador",
  both: "Ambos",
};

const CONTRACT_STATUS: Record<string, { label: string; className: string }> = {
  draft: { label: "Rascunho", className: "bg-muted text-muted-foreground" },
  active: { label: "Ativo", className: "bg-success-surface text-success" },
  expired: { label: "Expirado", className: "bg-warning-surface text-warning" },
  cancelled: { label: "Cancelado", className: "bg-destructive-surface text-destructive" },
};

const LQI_COLORS: Record<string, string> = {
  A: "bg-success text-white",
  B: "bg-blue-600 text-white",
  C: "bg-amber-500 text-white",
  D: "bg-orange-500 text-white",
  E: "bg-destructive text-white",
};

export default function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations("clients");
  const { currentParkId } = useCurrentPark();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [lerAuths, setLerAuths] = useState<LerAuth[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [supplierScore, setSupplierScore] = useState<SupplierScore | null>(null);
  const [productionCycle, setProductionCycle] = useState<ProductionCycle | null>(null);
  const [lotHistory, setLotHistory] = useState<LotHistoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "ler" | "contracts" | "quality">("overview");

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();

      const { data: clientData } = await supabase
        .from("clients")
        .select("*")
        .eq("id", id)
        .single() as { data: ClientDetail | null };
      if (clientData) setClient(clientData);

      const { data: lerData } = await supabase
        .from("client_ler_authorizations")
        .select("id, ler_code, operation_type, max_quantity_kg, is_active")
        .eq("client_id", id)
        .order("ler_code") as { data: LerAuth[] | null };
      if (lerData) setLerAuths(lerData);

      const { data: contractData } = await supabase
        .from("contracts")
        .select("id, contract_number, status, start_date, end_date, auto_renew")
        .eq("client_id", id)
        .order("created_at", { ascending: false }) as { data: Contract[] | null };
      if (contractData) setContracts(contractData);

      setIsLoading(false);
    }
    fetchData();
  }, [id]);

  useEffect(() => {
    async function fetchQualityData() {
      if (!currentParkId || !client) return;
      if (client.client_type !== "supplier" && client.client_type !== "both") return;
      const supabase = createClient();

      const [{ data: scoreData }, { data: cycleData }] = await Promise.all([
        supabase
          .from("supplier_scores")
          .select("id, avg_lqi, avg_raw_grade, avg_yield_rate, lot_count, total_kg, period_start, period_end, score_letter")
          .eq("client_id", id)
          .eq("park_id", currentParkId)
          .order("period_end", { ascending: false })
          .limit(1) as unknown as Promise<{ data: SupplierScore[] | null }>,
        supabase
          .from("client_production_cycles")
          .select("id, avg_interval_days, next_predicted_date, confidence, last_delivery_date")
          .eq("client_id", id)
          .eq("park_id", currentParkId)
          .maybeSingle() as unknown as Promise<{ data: ProductionCycle | null }>,
      ]);

      if (scoreData) setSupplierScore(scoreData[0] || null);
      if (cycleData) setProductionCycle(cycleData);

      // Fetch lot history: get entry IDs for this client, then lot_entries
      const { data: entryIds } = await supabase
        .from("entries")
        .select("id")
        .eq("client_id", id)
        .limit(200);

      if (entryIds && entryIds.length > 0) {
        const ids = entryIds.map((e) => e.id);
        const { data: lotEntryData } = await supabase
          .from("lot_entries")
          .select("contribution_kg, lots(id, lot_number, status, lqi_grade, closed_at)")
          .in("entry_id", ids)
          .order("created_at", { ascending: false })
          .limit(20) as unknown as { data: LotHistoryRow[] | null };
        if (lotEntryData) setLotHistory(lotEntryData);
      }
    }
    fetchQualityData();
  }, [id, currentParkId, client]);

  async function handleRecalcScore() {
    if (!currentParkId) return;
    setRecalculating(true);
    try {
      await recalculateSupplierScore(id, currentParkId, 90);
      toast.success("Score recalculado");
      // Refresh quality data
      const supabase = createClient();
      const { data } = await supabase
        .from("supplier_scores")
        .select("id, avg_lqi, avg_raw_grade, avg_yield_rate, lot_count, total_kg, period_start, period_end, score_letter")
        .eq("client_id", id)
        .eq("park_id", currentParkId)
        .order("period_end", { ascending: false })
        .limit(1) as unknown as { data: SupplierScore[] | null };
      if (data) setSupplierScore(data[0] || null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao recalcular");
    } finally {
      setRecalculating(false);
    }
  }

  async function handleRecalcCycle() {
    if (!currentParkId) return;
    setRecalculating(true);
    try {
      await recalculateProductionCycle(id, currentParkId);
      toast.success("Ciclo recalculado");
      const supabase = createClient();
      const { data } = await supabase
        .from("client_production_cycles")
        .select("id, avg_interval_days, next_predicted_date, confidence, last_delivery_date")
        .eq("client_id", id)
        .eq("park_id", currentParkId)
        .maybeSingle() as unknown as { data: ProductionCycle | null };
      if (data) setProductionCycle(data);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao recalcular ciclo");
    } finally {
      setRecalculating(false);
    }
  }

  if (isLoading || !client) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 rounded bg-muted" />
        <div className="h-64 rounded-lg bg-muted" />
      </div>
    );
  }

  const TypeIcon = TYPE_ICONS[client.client_type] || Building2;

  return (
    <div className="space-y-6">
      <Link
        href="/clients"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {t("title")}
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">{client.name}</h1>
          <div className="mt-1 flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <TypeIcon className="h-4 w-4" />
              {TYPE_LABELS[client.client_type] || client.client_type}
            </span>
            {client.nif && (
              <span className="text-sm text-muted-foreground font-mono">NIF: {client.nif}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/clients/${id}/edit`}
            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-accent"
          >
            <Edit2 className="h-3.5 w-3.5" /> Editar
          </Link>
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${
            client.is_active
              ? "bg-success-surface text-success"
              : "bg-muted text-muted-foreground"
          }`}>
            {client.is_active ? "Ativo" : "Inativo"}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {[
          { id: "overview" as const, label: "Visão Geral" },
          { id: "ler" as const, label: t("lerAuthorizations") },
          { id: "contracts" as const, label: t("contracts") },
          ...(client.client_type === "supplier" || client.client_type === "both"
            ? [{ id: "quality" as const, label: "Qualidade" }]
            : []),
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Contact info */}
          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <h3 className="font-semibold">{t("contacts")}</h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">Pessoa de Contacto:</span>
                <p className="font-medium">{client.contact_person || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Telefone:</span>
                <p className="font-medium">{client.phone || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Email:</span>
                <p className="font-medium">{client.email || "—"}</p>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <h3 className="font-semibold">Morada</h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">Morada:</span>
                <p className="font-medium">{client.address || "—"}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-muted-foreground">Cidade:</span>
                  <p className="font-medium">{client.city || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Código Postal:</span>
                  <p className="font-medium">{client.postal_code || "—"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Regulatory */}
          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4" /> Regulatório
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">Nº APA:</span>
                <p className="font-medium font-mono">{client.apa_number || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">SILiAmb ID:</span>
                <p className="font-medium font-mono">{client.siliamb_id || "—"}</p>
              </div>
            </div>
          </div>

          {/* Financial */}
          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <h3 className="font-semibold">{t("financials")}</h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">Prazo de Pagamento:</span>
                <p className="font-medium">{client.payment_terms_days || 30} dias</p>
              </div>
            </div>
          </div>

          {client.notes && (
            <div className="col-span-full rounded-lg border border-border bg-card p-6 space-y-4">
              <h3 className="font-semibold">Notas</h3>
              <p className="text-sm">{client.notes}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "ler" && (
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4" /> {t("lerAuthorizations")}
            </h3>
          </div>
          {lerAuths.length > 0 ? (
            <div className="rounded-lg border border-border">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Código LER</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Operação</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Qtd. Máxima</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {lerAuths.map((auth) => (
                    <tr key={auth.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 text-sm font-mono">{auth.ler_code}</td>
                      <td className="px-4 py-3 text-sm">{auth.operation_type || "—"}</td>
                      <td className="px-4 py-3 text-right text-sm font-mono">
                        {auth.max_quantity_kg
                          ? `${auth.max_quantity_kg.toLocaleString("pt-PT")} kg`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          auth.is_active
                            ? "bg-success-surface text-success"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {auth.is_active ? "Ativa" : "Inativa"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Sem autorizações LER registadas.
            </p>
          )}
        </div>
      )}

      {activeTab === "contracts" && (
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4" /> {t("contracts")}
            </h3>
          </div>
          {contracts.length > 0 ? (
            <div className="rounded-lg border border-border">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Nº Contrato</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Estado</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Início</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Fim</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Auto-Renovar</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map((contract) => {
                    const statusCfg = CONTRACT_STATUS[contract.status] || CONTRACT_STATUS.draft;
                    return (
                      <tr key={contract.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 text-sm font-mono font-medium">
                          {contract.contract_number}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusCfg.className}`}>
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {contract.start_date
                            ? new Date(contract.start_date).toLocaleDateString("pt-PT")
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {contract.end_date
                            ? new Date(contract.end_date).toLocaleDateString("pt-PT")
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {contract.auto_renew ? "Sim" : "Não"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Sem contratos registados.
            </p>
          )}
        </div>
      )}

      {activeTab === "quality" && (
        <div className="space-y-6">
          {/* Supplier Score Card */}
          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Star className="h-4 w-4" /> Score de Fornecedor
              </h3>
              <button
                onClick={handleRecalcScore}
                disabled={recalculating}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${recalculating ? "animate-spin" : ""}`} />
                Recalcular
              </button>
            </div>
            {supplierScore ? (
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                <div className="flex flex-col items-center gap-2">
                  <div className={`flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold ${LQI_COLORS[supplierScore.score_letter || "E"] || LQI_COLORS.E}`}>
                    {supplierScore.score_letter || "—"}
                  </div>
                  <span className="text-xs text-muted-foreground">LQI</span>
                </div>
                <div className="space-y-1 text-sm">
                  <span className="text-muted-foreground">LQI Médio</span>
                  <p className="text-xl font-bold font-mono">{supplierScore.avg_lqi?.toFixed(2) || "—"}</p>
                  <p className="text-xs text-muted-foreground">Nota bruta: {supplierScore.avg_raw_grade?.toFixed(1) || "—"}</p>
                </div>
                <div className="space-y-1 text-sm">
                  <span className="text-muted-foreground">Taxa de Rendimento</span>
                  <p className="text-xl font-bold font-mono">{supplierScore.avg_yield_rate != null ? `${supplierScore.avg_yield_rate.toFixed(1)}%` : "—"}</p>
                  <p className="text-xs text-muted-foreground">{supplierScore.lot_count} lotes analisados</p>
                </div>
                <div className="space-y-1 text-sm">
                  <span className="text-muted-foreground">Total Processado</span>
                  <p className="text-xl font-bold font-mono">{supplierScore.total_kg ? `${supplierScore.total_kg.toLocaleString("pt-PT")} kg` : "—"}</p>
                  {supplierScore.period_start && supplierScore.period_end && (
                    <p className="text-xs text-muted-foreground">
                      {new Date(supplierScore.period_start).toLocaleDateString("pt-PT")} — {new Date(supplierScore.period_end).toLocaleDateString("pt-PT")}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Sem dados de score. Clique em Recalcular para gerar.
              </p>
            )}
          </div>

          {/* Production Cycle Card */}
          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Ciclo de Produção</h3>
              <button
                onClick={handleRecalcCycle}
                disabled={recalculating}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${recalculating ? "animate-spin" : ""}`} />
                Recalcular Ciclo
              </button>
            </div>
            {productionCycle ? (
              <div className="grid grid-cols-3 gap-6 text-sm">
                <div className="space-y-1">
                  <span className="text-muted-foreground">Intervalo Médio</span>
                  <p className="text-xl font-bold">
                    {productionCycle.avg_interval_days != null
                      ? `${Math.round(productionCycle.avg_interval_days)} dias`
                      : "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">Próxima Entrega Prevista</span>
                  {productionCycle.next_predicted_date ? (
                    <>
                      <p className="text-lg font-bold">
                        {new Date(productionCycle.next_predicted_date).toLocaleDateString("pt-PT")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(() => {
                          const days = Math.ceil(
                            (new Date(productionCycle.next_predicted_date).getTime() - Date.now()) / 86400000
                          );
                          return days > 0 ? `em ${days} dias` : days === 0 ? "hoje" : `há ${Math.abs(days)} dias`;
                        })()}
                      </p>
                    </>
                  ) : (
                    <p className="text-lg font-bold">—</p>
                  )}
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">Confiança</span>
                  <p className="text-xl font-bold">
                    {productionCycle.confidence != null
                      ? `${Math.round(productionCycle.confidence * 100)}%`
                      : "—"}
                  </p>
                  {productionCycle.confidence != null && (
                    <div className="h-1.5 w-full rounded-full bg-muted">
                      <div
                        className="h-1.5 rounded-full bg-primary"
                        style={{ width: `${productionCycle.confidence * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Sem dados de ciclo. Clique em Recalcular Ciclo para gerar.
              </p>
            )}
          </div>

          {/* Lot History */}
          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <h3 className="font-semibold">Histórico de Lotes</h3>
            {lotHistory.length > 0 ? (
              <div className="rounded-lg border border-border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Lote</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Estado</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">LQI</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Contribuição</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Fecho</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lotHistory.map((row, idx) =>
                      row.lots ? (
                        <tr key={`${row.lots.id}-${idx}`} className="border-b border-border last:border-0">
                          <td className="px-4 py-3 text-sm">
                            <Link href={`/lots/${row.lots.id}`} className="font-medium text-primary hover:underline font-mono">
                              {row.lots.lot_number}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-sm capitalize">{row.lots.status.replace("_", " ")}</td>
                          <td className="px-4 py-3 text-sm">
                            {row.lots.lqi_grade ? (
                              <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${LQI_COLORS[row.lots.lqi_grade] || LQI_COLORS.E}`}>
                                {row.lots.lqi_grade}
                              </span>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-mono">
                            {row.contribution_kg.toLocaleString("pt-PT")} kg
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {row.lots.closed_at ? new Date(row.lots.closed_at).toLocaleDateString("pt-PT") : "—"}
                          </td>
                        </tr>
                      ) : null
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Sem histórico de lotes para este fornecedor.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
