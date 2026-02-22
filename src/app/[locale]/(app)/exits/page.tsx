"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCurrentPark } from "@/hooks/use-current-park";
import { Link } from "@/i18n/navigation";
import { Plus, Search, Package, Truck, Building2, Users } from "lucide-react";

interface DeliveryRequest {
  id: string;
  request_number: string;
  exit_type: string;
  status: string;
  destination_name: string | null;
  vehicle_plate: string | null;
  egar_number: string | null;
  total_weight_kg: number | null;
  planned_date: string | null;
  created_at: string;
  client_id: string | null;
  clients: { name: string; nif: string | null } | null;
}

const EXIT_TYPE_CONFIG: Record<string, { label: string; icon: typeof Truck }> = {
  treatment: { label: "Tratamento", icon: Package },
  client: { label: "Cliente", icon: Building2 },
  group: { label: "Grupo", icon: Users },
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: "Rascunho", className: "bg-muted text-muted-foreground" },
  planned: { label: "Planeado", className: "bg-blue-50 text-blue-600" },
  loading: { label: "A carregar", className: "bg-amber-50 text-amber-600" },
  loaded: { label: "Carregado", className: "bg-amber-50 text-amber-600" },
  in_transit: { label: "Em trânsito", className: "bg-blue-50 text-blue-600" },
  delivered: { label: "Entregue", className: "bg-green-50 text-green-600" },
  confirmed: { label: "Confirmado", className: "bg-success-surface text-success" },
  cancelled: { label: "Cancelado", className: "bg-destructive-surface text-destructive" },
};

export default function ExitsPage() {
  const t = useTranslations("exits");
  const tc = useTranslations("common");
  const { currentParkId } = useCurrentPark();
  const [requests, setRequests] = useState<DeliveryRequest[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    async function fetchRequests() {
      if (!currentParkId) return;
      const supabase = createClient();
      const { data } = await supabase
        .from("delivery_requests")
        .select("id, request_number, exit_type, status, destination_name, vehicle_plate, egar_number, total_weight_kg, planned_date, created_at, client_id, clients(name, nif)")
        .eq("park_id", currentParkId)
        .order("created_at", { ascending: false })
        .limit(100) as { data: DeliveryRequest[] | null };
      if (data) setRequests(data);
    }
    fetchRequests();
  }, [currentParkId]);

  const filtered = requests.filter((r) => {
    const matchesSearch =
      !search ||
      r.request_number.toLowerCase().includes(search.toLowerCase()) ||
      r.destination_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.vehicle_plate?.toLowerCase().includes(search.toLowerCase()) ||
      r.clients?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || r.exit_type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Link
          href="/exits/new"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" /> {t("newExit")}
        </Link>
      </div>

      {/* Type tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {[
          { id: "all", label: "Todos" },
          { id: "treatment", label: "Tratamento" },
          { id: "client", label: "Clientes" },
          { id: "group", label: "Grupo" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTypeFilter(tab.id)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              typeFilter === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`${tc("search")} saídas...`}
          className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm"
        />
      </div>

      <div className="rounded-lg border border-border">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Nº Pedido</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Tipo</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Estado</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Cliente</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Destino</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Matrícula</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Peso</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Data</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((req) => {
              const typeCfg = EXIT_TYPE_CONFIG[req.exit_type];
              const statusCfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.draft;
              return (
                <tr key={req.id} className="border-b border-border last:border-0 hover:bg-accent/50">
                  <td className="px-4 py-3 text-sm">
                    <Link href={`/exits/${req.id}`} className="font-medium text-primary hover:underline">
                      {req.request_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      {typeCfg && <typeCfg.icon className="h-3 w-3" />}
                      {typeCfg?.label || req.exit_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusCfg.className}`}>
                      {statusCfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {req.clients?.name ? (
                      <div>
                        <p className="font-medium leading-tight">{req.clients.name}</p>
                        {req.clients.nif && <p className="text-xs text-muted-foreground">{req.clients.nif}</p>}
                      </div>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm">{req.destination_name || "—"}</td>
                  <td className="px-4 py-3 text-sm font-mono">{req.vehicle_plate || "—"}</td>
                  <td className="px-4 py-3 text-right text-sm font-mono">
                    {req.total_weight_kg ? `${req.total_weight_kg.toLocaleString("pt-PT")} kg` : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {req.planned_date
                      ? new Date(req.planned_date).toLocaleDateString("pt-PT")
                      : new Date(req.created_at).toLocaleDateString("pt-PT")}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  {tc("noResults")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
