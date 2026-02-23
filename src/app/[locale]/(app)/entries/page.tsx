"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCurrentPark } from "@/hooks/use-current-park";
import { Link } from "@/i18n/navigation";
import {
  Plus, Search, Truck, Package, CheckCircle, XCircle, Clock,
} from "lucide-react";

interface Entry {
  id: string;
  entry_number: string;
  status: string;
  vehicle_plate: string | null;
  egar_number: string | null;
  ler_code: string | null;
  net_weight_kg: number | null;
  created_at: string;
  client_id: string | null;
  entity_name: string | null;
  entity_nif: string | null;
  clients: { name: string; nif: string | null } | null;
}

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  draft: { label: "Rascunho", icon: Clock, className: "text-muted-foreground bg-muted" },
  vehicle_arrived: { label: "Veículo chegou", icon: Truck, className: "text-blue-600 bg-blue-50" },
  gross_weighed: { label: "Pesagem bruta", icon: Package, className: "text-blue-600 bg-blue-50" },
  egar_validated: { label: "e-GAR validada", icon: CheckCircle, className: "text-blue-600 bg-blue-50" },
  inspected: { label: "Inspecionado", icon: CheckCircle, className: "text-blue-600 bg-blue-50" },
  tare_weighed: { label: "Tara pesada", icon: Package, className: "text-blue-600 bg-blue-50" },
  classified: { label: "Classificado", icon: Package, className: "text-amber-600 bg-amber-50" },
  stored: { label: "Armazenado", icon: Package, className: "text-amber-600 bg-amber-50" },
  confirmed: { label: "Confirmado", icon: CheckCircle, className: "text-success bg-success-surface" },
  cancelled: { label: "Cancelado", icon: XCircle, className: "text-destructive bg-destructive-surface" },
};

export default function EntriesPage() {
  const t = useTranslations("entries");
  const tc = useTranslations("common");
  const { currentParkId } = useCurrentPark();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    async function fetchEntries() {
      if (!currentParkId) return;
      const supabase = createClient();
      const { data } = await supabase
        .from("entries")
        .select("id, entry_number, status, vehicle_plate, egar_number, ler_code, net_weight_kg, created_at, client_id, entity_name, entity_nif, clients(name, nif)")
        .eq("park_id", currentParkId)
        .order("created_at", { ascending: false })
        .limit(100) as { data: Entry[] | null };
      if (data) setEntries(data);
    }
    fetchEntries();
  }, [currentParkId]);

  const filtered = entries.filter((e) => {
    const entityLabel = e.clients?.name || e.entity_name || "";
    const matchesSearch =
      !search ||
      e.entry_number.toLowerCase().includes(search.toLowerCase()) ||
      e.vehicle_plate?.toLowerCase().includes(search.toLowerCase()) ||
      e.egar_number?.toLowerCase().includes(search.toLowerCase()) ||
      entityLabel.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const todayCount = entries.filter(
    (e) => new Date(e.created_at).toDateString() === new Date().toDateString()
  ).length;
  const pendingCount = entries.filter(
    (e) => !["confirmed", "cancelled"].includes(e.status)
  ).length;
  const confirmedCount = entries.filter((e) => e.status === "confirmed").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Link
          href="/entries/new"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" /> {t("newEntry")}
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Hoje</p>
          <p className="text-2xl font-bold">{todayCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Pendentes</p>
          <p className="text-2xl font-bold text-warning">{pendingCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Confirmadas</p>
          <p className="text-2xl font-bold text-success">{confirmedCount}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`${tc("search")} entradas...`}
            className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">Todos os estados</option>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Nº Entrada</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Estado</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Entidade</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Matrícula</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">e-GAR</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">LER</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Peso Líq.</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Data</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry) => {
              const statusCfg = STATUS_CONFIG[entry.status] || STATUS_CONFIG.draft;
              const StatusIcon = statusCfg.icon;
              const clientName = entry.clients?.name || entry.entity_name;
              const clientNif = entry.clients?.nif || entry.entity_nif;
              const isAdhoc = !entry.client_id && !!entry.entity_name;
              return (
                <tr key={entry.id} className="border-b border-border last:border-0 hover:bg-accent/50">
                  <td className="px-4 py-3 text-sm">
                    <Link href={`/entries/${entry.id}`} className="font-medium text-primary hover:underline">
                      {entry.entry_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusCfg.className}`}>
                      <StatusIcon className="h-3 w-3" />
                      {statusCfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {clientName ? (
                      <div>
                        <p className="font-medium leading-tight">{clientName}</p>
                        {clientNif && <p className="text-xs text-muted-foreground">{clientNif}{isAdhoc && <span className="ml-1 text-warning">(avulso)</span>}</p>}
                      </div>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono">{entry.vehicle_plate || "—"}</td>
                  <td className="px-4 py-3 text-sm font-mono text-xs">{entry.egar_number || "—"}</td>
                  <td className="px-4 py-3 text-sm">
                    {entry.ler_code ? (
                      <span className="rounded bg-muted px-2 py-0.5 text-xs font-mono font-medium">{entry.ler_code}</span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-mono">
                    {entry.net_weight_kg ? `${entry.net_weight_kg.toLocaleString("pt-PT")} kg` : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {new Date(entry.created_at).toLocaleDateString("pt-PT")}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  {entries.length === 0 ? t("noEntries") : tc("noResults")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
