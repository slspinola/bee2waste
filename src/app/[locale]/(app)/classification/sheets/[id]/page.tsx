"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, FileText, Scale, Package } from "lucide-react";

interface SheetDetail {
  id: string;
  sheet_number: string;
  status: string;
  source_ler_code: string | null;
  source_weight_kg: number | null;
  total_output_kg: number | null;
  loss_kg: number | null;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
  entries?: {
    id: string;
    entry_number: string;
    vehicle_plate: string | null;
    ler_code: string | null;
    net_weight_kg: number | null;
    storage_areas?: { code: string; name: string } | null;
  } | null;
}

export default function SheetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations("classification");
  const [sheet, setSheet] = useState<SheetDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchSheet() {
      const supabase = createClient();
      const { data } = await supabase
        .from("classification_sheets")
        .select("*, entries(id, entry_number, vehicle_plate, ler_code, net_weight_kg, storage_areas(code, name))")
        .eq("id", id)
        .single() as { data: SheetDetail | null };
      if (data) setSheet(data);
      setIsLoading(false);
    }
    fetchSheet();
  }, [id]);

  if (isLoading || !sheet) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 rounded bg-muted" />
        <div className="h-64 rounded-lg bg-muted" />
      </div>
    );
  }

  const recoveryRate =
    sheet.source_weight_kg && sheet.total_output_kg
      ? ((sheet.total_output_kg / sheet.source_weight_kg) * 100).toFixed(1)
      : null;

  return (
    <div className="space-y-6">
      <Link
        href="/classification"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {t("title")}
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold font-mono">{sheet.sheet_number}</h1>
          <p className="text-sm text-muted-foreground">
            Criado em {new Date(sheet.created_at).toLocaleString("pt-PT")}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${
            sheet.status === "completed"
              ? "bg-success-surface text-success"
              : sheet.status === "in_progress"
              ? "bg-primary-surface text-primary"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {sheet.status === "completed"
            ? "Concluída"
            : sheet.status === "in_progress"
            ? "Em curso"
            : sheet.status.replace("_", " ")}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          {/* Source entry */}
          {sheet.entries && (
            <div className="rounded-lg border border-border bg-card p-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Package className="h-4 w-4" /> Entrada de Origem
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Nº Entrada:</span>
                  <p className="font-medium">
                    <Link
                      href={`/entries/${sheet.entries.id}`}
                      className="text-primary hover:underline font-mono"
                    >
                      {sheet.entries.entry_number}
                    </Link>
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Matrícula:</span>
                  <p className="font-medium font-mono">{sheet.entries.vehicle_plate || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Código LER:</span>
                  <p className="font-medium font-mono">{sheet.entries.ler_code || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Área:</span>
                  <p className="font-medium">
                    {sheet.entries.storage_areas ? (
                      <>
                        <span className="rounded bg-muted px-1.5 py-0.5 text-xs mr-1">
                          {sheet.entries.storage_areas.code}
                        </span>
                        {sheet.entries.storage_areas.name}
                      </>
                    ) : (
                      "—"
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Weights */}
          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Scale className="h-4 w-4" /> Pesos da Classificação
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="rounded-md bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">Peso Entrada</p>
                <p className="text-xl font-bold font-mono">
                  {sheet.source_weight_kg
                    ? `${sheet.source_weight_kg.toLocaleString("pt-PT")} kg`
                    : "—"}
                </p>
              </div>
              <div className="rounded-md bg-success-surface p-4">
                <p className="text-sm text-muted-foreground">Peso Saída</p>
                <p className="text-xl font-bold font-mono text-success">
                  {sheet.total_output_kg
                    ? `${sheet.total_output_kg.toLocaleString("pt-PT")} kg`
                    : "—"}
                </p>
              </div>
              <div className="rounded-md bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">Perdas</p>
                <p className="text-xl font-bold font-mono text-destructive">
                  {sheet.loss_kg
                    ? `${sheet.loss_kg.toLocaleString("pt-PT")} kg`
                    : "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {sheet.notes && (
            <div className="rounded-lg border border-border bg-card p-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" /> Notas
              </h3>
              <p className="text-sm text-muted-foreground">{sheet.notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <h3 className="font-semibold">Resumo</h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">LER Origem:</span>
                <p className="font-medium font-mono">{sheet.source_ler_code || "—"}</p>
              </div>
              {recoveryRate && (
                <div>
                  <span className="text-muted-foreground">Taxa de Recuperação:</span>
                  <p className="text-lg font-bold text-success">{recoveryRate}%</p>
                </div>
              )}
              {sheet.completed_at && (
                <div>
                  <span className="text-muted-foreground">Concluída em:</span>
                  <p className="font-medium">
                    {new Date(sheet.completed_at).toLocaleString("pt-PT")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
