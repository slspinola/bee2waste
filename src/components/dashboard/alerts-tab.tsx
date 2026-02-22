"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Link } from "@/i18n/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  TrendingDown,
  ExternalLink,
} from "lucide-react";

interface AlertItem {
  id: string;
  type:
    | "nc"
    | "blocked_zone"
    | "supplier_cycle"
    | "quality_alert"
    | "lot_capacity"
    | "market_opportunity";
  severity: "critical" | "high" | "medium" | "low" | "info" | "opportunity";
  title: string;
  description: string;
  href: string;
  date: string;
}

const SEVERITY_CONFIG = {
  critical: {
    icon: AlertTriangle,
    cls: "border-destructive bg-destructive-surface text-destructive",
    label: "Crítico",
  },
  high: {
    icon: AlertTriangle,
    cls: "border-warning bg-warning-surface text-warning",
    label: "Alta",
  },
  medium: {
    icon: AlertTriangle,
    cls: "border-amber-200 bg-amber-50 text-amber-600",
    label: "Média",
  },
  low: {
    icon: Info,
    cls: "border-border bg-muted/30 text-muted-foreground",
    label: "Baixa",
  },
  info: {
    icon: Info,
    cls: "border-blue-200 bg-blue-50 text-blue-600",
    label: "Info",
  },
  opportunity: {
    icon: TrendingDown,
    cls: "border-emerald-200 bg-emerald-50 text-emerald-600",
    label: "Oport.",
  },
};

export function AlertsTab({ parkId }: { parkId: string }) {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | AlertItem["severity"]>("all");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createClient();
      const nextWeek = new Date(Date.now() + 7 * 86400000)
        .toISOString()
        .split("T")[0];
      const today = new Date().toISOString().split("T")[0];

      const [
        { data: openNCs },
        { data: blockedZones },
        { data: cyclesDue },
        { data: qualityAlerts },
      ] = await Promise.all([
        supabase
          .from("non_conformities")
          .select("id, type, severity, description, entry_id, created_at")
          .eq("park_id", parkId)
          .in("status", ["open", "investigating"])
          .order("created_at", {
            ascending: false,
          }) as unknown as Promise<{
          data: {
            id: string;
            type: string;
            severity: string;
            description: string;
            entry_id: string | null;
            created_at: string;
          }[] | null;
        }>,
        supabase
          .from("storage_areas")
          .select("id, code, name, blocked_at")
          .eq("park_id", parkId)
          .eq("is_blocked", true) as unknown as Promise<{
          data: {
            id: string;
            code: string;
            name: string;
            blocked_at: string | null;
          }[] | null;
        }>,
        supabase
          .from("client_production_cycles")
          .select("client_id, next_predicted_date, clients:client_id(name)")
          .eq("park_id", parkId)
          .lte("next_predicted_date", nextWeek)
          .not("next_predicted_date", "is", null) as unknown as Promise<{
          data: {
            client_id: string;
            next_predicted_date: string;
            clients: { name: string } | null;
          }[] | null;
        }>,
        supabase
          .from("lots")
          .select("id, lot_number, raw_grade, opened_at")
          .eq("park_id", parkId)
          .eq("status", "open")
          .not("raw_grade", "is", null)
          .lt("raw_grade", 2.5) as unknown as Promise<{
          data: {
            id: string;
            lot_number: string;
            raw_grade: number;
            opened_at: string;
          }[] | null;
        }>,
      ]);

      const items: AlertItem[] = [];

      // Non-conformities
      if (openNCs) {
        for (const nc of openNCs) {
          const sevMap: Record<string, AlertItem["severity"]> = {
            critical: "critical",
            high: "high",
            medium: "medium",
            low: "low",
          };
          items.push({
            id: `nc-${nc.id}`,
            type: "nc",
            severity: sevMap[nc.severity] || "medium",
            title: `Não-Conformidade: ${formatNCType(nc.type)}`,
            description: nc.description || "Sem descrição",
            href: `/classification/non-conformities/${nc.id}`,
            date: nc.created_at,
          });
        }
      }

      // Blocked zones
      if (blockedZones) {
        for (const zone of blockedZones) {
          const days = zone.blocked_at
            ? Math.round(
                (Date.now() - new Date(zone.blocked_at).getTime()) / 86400000
              )
            : 0;
          items.push({
            id: `zone-${zone.id}`,
            type: "blocked_zone",
            severity: days > 30 ? "high" : "low",
            title: `Zona bloqueada: ${zone.code} — ${zone.name}`,
            description: `Bloqueada há ${days} dia(s). Em tratamento ou aguarda liberação.`,
            href: "/lots",
            date: zone.blocked_at || today,
          });
        }
      }

      // Supplier cycles due
      if (cyclesDue) {
        for (const cycle of cyclesDue) {
          const daysAway = Math.round(
            (new Date(cycle.next_predicted_date).getTime() - Date.now()) /
              86400000
          );
          items.push({
            id: `cycle-${cycle.client_id}`,
            type: "supplier_cycle",
            severity: daysAway < 0 ? "medium" : "info",
            title: `${cycle.clients?.name || "Fornecedor"} — Entrega ${
              daysAway < 0 ? "em atraso" : "prevista"
            }`,
            description:
              daysAway < 0
                ? `Em atraso há ${Math.abs(daysAway)} dia(s). Previsão: ${new Date(
                    cycle.next_predicted_date
                  ).toLocaleDateString("pt-PT")}`
                : `Entrega prevista a ${new Date(
                    cycle.next_predicted_date
                  ).toLocaleDateString("pt-PT")} (em ${daysAway} dia(s))`,
            href: `/clients/${cycle.client_id}`,
            date: cycle.next_predicted_date,
          });
        }
      }

      // Quality alerts
      if (qualityAlerts) {
        for (const lot of qualityAlerts) {
          items.push({
            id: `quality-${lot.id}`,
            type: "quality_alert",
            severity: lot.raw_grade < 1.5 ? "high" : "medium",
            title: `Lote ${lot.lot_number} — Qualidade Abaixo do Esperado`,
            description: `Grau raw médio: ${lot.raw_grade.toFixed(
              1
            )} (classificação ${lot.raw_grade < 1.5 ? "E" : "D"}). Rever fornecedores contribuintes.`,
            href: `/lots/${lot.id}`,
            date: lot.opened_at,
          });
        }
      }

      // Sort: critical > high > medium > low > info > opportunity, then by date
      const sevOrder: Record<string, number> = {
        critical: 0,
        high: 1,
        medium: 2,
        low: 3,
        info: 4,
        opportunity: 5,
      };
      items.sort((a, b) => {
        const diff = (sevOrder[a.severity] || 5) - (sevOrder[b.severity] || 5);
        if (diff !== 0) return diff;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });

      setAlerts(items);
      setLoading(false);
    }
    load();
  }, [parkId]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  const severities = ["all", "critical", "high", "medium", "low", "info"] as const;
  const filtered =
    filter === "all" ? alerts : alerts.filter((a) => a.severity === filter);

  return (
    <div className="space-y-4">
      {/* Summary counts */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {severities.map((sev) => {
          const count =
            sev === "all"
              ? alerts.length
              : alerts.filter((a) => a.severity === sev).length;
          const cfg = sev !== "all" ? SEVERITY_CONFIG[sev] : null;
          return (
            <button
              key={sev}
              onClick={() => setFilter(sev)}
              className={`rounded-lg border p-2 text-center transition-colors ${
                filter === sev
                  ? "border-primary bg-primary-surface"
                  : "border-border hover:bg-accent"
              }`}
            >
              <p className="text-lg font-bold">{count}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {sev === "all" ? "Todos" : cfg?.label || sev}
              </p>
            </button>
          );
        })}
      </div>

      {/* Alert list */}
      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((alert) => {
            const cfg = SEVERITY_CONFIG[alert.severity];
            const Icon = cfg.icon;
            return (
              <div
                key={alert.id}
                className={`flex items-start gap-3 rounded-lg border p-4 ${cfg.cls}`}
              >
                <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{alert.title}</p>
                    <span className="text-xs opacity-70 flex-shrink-0 whitespace-nowrap">
                      {new Date(alert.date).toLocaleDateString("pt-PT")}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5 opacity-80">{alert.description}</p>
                </div>
                <Link
                  href={alert.href}
                  className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-medium underline"
                >
                  Ver <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card p-12 text-center space-y-2">
          <CheckCircle2 className="h-10 w-10 mx-auto text-success" />
          <p className="font-medium">
            {filter === "all"
              ? "Sem alertas ativos"
              : `Sem alertas do nível "${filter}"`}
          </p>
          <p className="text-sm text-muted-foreground">
            O parque está a funcionar normalmente.
          </p>
        </div>
      )}
    </div>
  );
}

const NC_TYPE_LABELS: Record<string, string> = {
  weight_discrepancy: "Discrepância de Peso",
  ler_code_mismatch: "Erro de Código LER",
  contamination: "Contaminação",
  packaging_issue: "Problema de Embalagem",
  documentation_missing: "Documentação em Falta",
  vehicle_issue: "Problema com Veículo",
  other: "Outro",
};

function formatNCType(type: string): string {
  return NC_TYPE_LABELS[type] || type;
}
