"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCurrentPark } from "@/hooks/use-current-park";
import { Link } from "@/i18n/navigation";
import { Plus, Search, Building2, Truck, ArrowLeftRight } from "lucide-react";

interface Client {
  id: string;
  name: string;
  nif: string | null;
  client_type: string;
  city: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
}

const TYPE_CONFIG: Record<string, { label: string; icon: typeof Building2 }> = {
  supplier: { label: "Fornecedor", icon: Truck },
  buyer: { label: "Comprador", icon: Building2 },
  both: { label: "Ambos", icon: ArrowLeftRight },
};

export default function ClientsPage() {
  const t = useTranslations("clients");
  const tc = useTranslations("common");
  const { currentParkId } = useCurrentPark();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    async function fetchClients() {
      if (!currentParkId) return;
      const supabase = createClient();

      // Get clients associated with this park
      const { data: assocData } = await supabase
        .from("client_park_associations")
        .select("client_id")
        .eq("park_id", currentParkId)
        .eq("is_active", true) as { data: Array<{ client_id: string }> | null };

      if (!assocData || assocData.length === 0) {
        // Fallback: get all clients in org
        const { data: { user } } = await supabase.auth.getUser();
        const orgId = user?.app_metadata?.org_id;
        if (!orgId) return;

        const { data } = await supabase
          .from("clients")
          .select("id, name, nif, client_type, city, phone, email, is_active, created_at")
          .eq("org_id", orgId)
          .order("name") as { data: Client[] | null };
        if (data) setClients(data);
        return;
      }

      const clientIds = assocData.map((a) => a.client_id);
      const { data } = await supabase
        .from("clients")
        .select("id, name, nif, client_type, city, phone, email, is_active, created_at")
        .in("id", clientIds)
        .order("name") as { data: Client[] | null };
      if (data) setClients(data);
    }
    fetchClients();
  }, [currentParkId]);

  const filtered = clients.filter((c) => {
    const matchesSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.nif?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || c.client_type === typeFilter;
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
          href="/clients/new"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" /> {t("newClient")}
        </Link>
      </div>

      {/* Type tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {[
          { id: "all", label: "Todos" },
          { id: "supplier", label: "Fornecedores" },
          { id: "buyer", label: "Compradores" },
          { id: "both", label: "Ambos" },
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`${tc("search")} clientes...`}
          className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm"
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{t("clientName")}</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{t("nif")}</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{t("type")}</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Cidade</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{t("contacts")}</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((client) => {
              const typeCfg = TYPE_CONFIG[client.client_type];
              return (
                <tr key={client.id} className="border-b border-border last:border-0 hover:bg-accent/50">
                  <td className="px-4 py-3 text-sm">
                    <Link href={`/clients/${client.id}`} className="font-medium text-primary hover:underline">
                      {client.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono">{client.nif || "—"}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      {typeCfg && <typeCfg.icon className="h-3 w-3" />}
                      {typeCfg?.label || client.client_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{client.city || "—"}</td>
                  <td className="px-4 py-3 text-sm">
                    {client.email || client.phone || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      client.is_active
                        ? "bg-success-surface text-success"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {client.is_active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
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
