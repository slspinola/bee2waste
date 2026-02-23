"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCurrentPark } from "@/hooks/use-current-park";
import { Link } from "@/i18n/navigation";
import { FileText, ArrowLeftRight, AlertTriangle, Plus } from "lucide-react";

interface ClassSheet {
  id: string;
  sheet_number: string;
  status: string;
  source_ler_code: string | null;
  source_weight_kg: number | null;
  total_output_kg: number | null;
  created_at: string;
}

interface Transfer {
  id: string;
  transfer_number: string;
  status: string;
  ler_code: string | null;
  weight_kg: number;
  created_at: string;
}

interface NonConformity {
  id: string;
  nc_number: string;
  nc_type: string;
  severity: string;
  status: string;
  title: string;
  created_at: string;
}

export default function ClassificationPage() {
  const t = useTranslations("classification");
  const tc = useTranslations("common");
  const { currentParkId } = useCurrentPark();
  const [activeTab, setActiveTab] = useState<"sheets" | "transfers" | "nc">("sheets");
  const [sheets, setSheets] = useState<ClassSheet[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [ncs, setNcs] = useState<NonConformity[]>([]);

  useEffect(() => {
    async function fetchData() {
      if (!currentParkId) return;
      const supabase = createClient();

      const { data: sheetData } = await supabase
        .from("classification_sheets")
        .select("id, sheet_number, status, source_ler_code, source_weight_kg, total_output_kg, created_at")
        .eq("park_id", currentParkId)
        .order("created_at", { ascending: false })
        .limit(50) as { data: ClassSheet[] | null };
      if (sheetData) setSheets(sheetData);

      const { data: transferData } = await supabase
        .from("area_transfers")
        .select("id, transfer_number, status, ler_code, weight_kg, created_at")
        .eq("park_id", currentParkId)
        .order("created_at", { ascending: false })
        .limit(50) as { data: Transfer[] | null };
      if (transferData) setTransfers(transferData);

      const { data: ncData } = await supabase
        .from("non_conformities")
        .select("id, nc_number, nc_type, severity, status, title, created_at")
        .eq("park_id", currentParkId)
        .order("created_at", { ascending: false })
        .limit(50) as { data: NonConformity[] | null };
      if (ncData) setNcs(ncData);
    }
    fetchData();
  }, [currentParkId]);

  const openNcs = ncs.filter((nc) => nc.status !== "closed");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">Fichas de classificação, transferências e não-conformidades</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Fichas</p>
          <p className="text-2xl font-bold">{sheets.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Em Curso</p>
          <p className="text-2xl font-bold text-primary">
            {sheets.filter((s) => s.status === "in_progress").length}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Transferências</p>
          <p className="text-2xl font-bold">{transfers.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">NC Abertas</p>
          <p className="text-2xl font-bold text-destructive">{openNcs.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {([
          { id: "sheets" as const, label: t("sheets"), icon: FileText },
          { id: "transfers" as const, label: t("transfers"), icon: ArrowLeftRight },
          { id: "nc" as const, label: t("nonConformities"), icon: AlertTriangle },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sheets Tab */}
      {activeTab === "sheets" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Link
              href="/classification/sheets/new"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
            >
              <Plus className="h-4 w-4" /> {t("newSheet")}
            </Link>
          </div>
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Nº Ficha</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Estado</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">LER Origem</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Peso Entrada</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Peso Saída</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Data</th>
                </tr>
              </thead>
              <tbody>
                {sheets.map((sheet) => (
                  <tr key={sheet.id} className="border-b border-border last:border-0 hover:bg-accent/50">
                    <td className="px-4 py-3 text-sm">
                      <Link href={`/classification/sheets/${sheet.id}`} className="font-medium text-primary hover:underline">
                        {sheet.sheet_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium capitalize">
                        {sheet.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono">{sheet.source_ler_code || "—"}</td>
                    <td className="px-4 py-3 text-right text-sm font-mono">
                      {sheet.source_weight_kg ? `${sheet.source_weight_kg.toLocaleString("pt-PT")} kg` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-mono">
                      {sheet.total_output_kg ? `${sheet.total_output_kg.toLocaleString("pt-PT")} kg` : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(sheet.created_at).toLocaleDateString("pt-PT")}
                    </td>
                  </tr>
                ))}
                {sheets.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">{tc("noResults")}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transfers Tab */}
      {activeTab === "transfers" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Link
              href="/classification/transfers/new"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
            >
              <Plus className="h-4 w-4" /> {t("newTransfer")}
            </Link>
          </div>
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Nº Transferência</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Estado</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">LER</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Peso</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Data</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((tr) => (
                  <tr key={tr.id} className="border-b border-border last:border-0 hover:bg-accent/50">
                    <td className="px-4 py-3 text-sm font-medium">{tr.transfer_number}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium capitalize">
                        {tr.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono">{tr.ler_code || "—"}</td>
                    <td className="px-4 py-3 text-right text-sm font-mono">{tr.weight_kg.toLocaleString("pt-PT")} kg</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(tr.created_at).toLocaleDateString("pt-PT")}
                    </td>
                  </tr>
                ))}
                {transfers.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">{tc("noResults")}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Non-Conformities Tab */}
      {activeTab === "nc" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Link
              href="/classification/non-conformities/new"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
            >
              <Plus className="h-4 w-4" /> Nova NC
            </Link>
          </div>
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Nº NC</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Título</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Tipo</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Severidade</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Estado</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Data</th>
                </tr>
              </thead>
              <tbody>
                {ncs.map((nc) => (
                  <tr key={nc.id} className="border-b border-border last:border-0 hover:bg-accent/50">
                    <td className="px-4 py-3 text-sm">
                      <Link href={`/classification/non-conformities/${nc.id}`} className="font-medium text-primary hover:underline">
                        {nc.nc_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">{nc.title}</td>
                    <td className="px-4 py-3 text-sm capitalize">{nc.nc_type.replace("_", " ")}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        nc.severity === "critical" ? "bg-destructive-surface text-destructive" :
                        nc.severity === "high" ? "bg-warning-surface text-warning" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {nc.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm capitalize">{nc.status}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(nc.created_at).toLocaleDateString("pt-PT")}
                    </td>
                  </tr>
                ))}
                {ncs.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">{tc("noResults")}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
