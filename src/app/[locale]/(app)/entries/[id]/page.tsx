"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, Truck, Scale, ClipboardCheck, Package, Layers3 } from "lucide-react";
import { EntryTimeline } from "@/components/entries/entry-timeline";

interface EntryDetail {
  id: string;
  entry_number: string;
  status: string;
  vehicle_plate: string | null;
  driver_name: string | null;
  egar_number: string | null;
  ler_code: string | null;
  is_hazardous: boolean;
  gross_weight_kg: number | null;
  tare_weight_kg: number | null;
  net_weight_kg: number | null;
  inspection_result: string | null;
  inspection_notes: string | null;
  requires_invoice: boolean;
  confirmed_at: string | null;
  created_at: string;
  storage_areas?: { id: string; code: string; name: string } | null;
}

const STATUS_FLOW = [
  { status: "draft", label: "Rascunho" },
  { status: "vehicle_arrived", label: "Veículo Chegou" },
  { status: "gross_weighed", label: "Pesagem Bruta" },
  { status: "egar_validated", label: "e-GAR Validada" },
  { status: "inspected", label: "Inspeção" },
  { status: "tare_weighed", label: "Tara Pesada" },
  { status: "stored", label: "Armazenado" },
  { status: "confirmed", label: "Confirmado" },
];

export default function EntryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations("entries");
  const [entry, setEntry] = useState<EntryDetail | null>(null);
  const [associatedLot, setAssociatedLot] = useState<{
    lot_id: string;
    lot_number: string;
    status: string;
    lqi_grade: string | null;
    allowed_ler_codes: string[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchEntry() {
      const supabase = createClient();
      const { data } = await supabase
        .from("entries")
        .select("*, storage_areas(id, code, name)")
        .eq("id", id)
        .single() as { data: EntryDetail | null };
      if (data) setEntry(data);

      // Fetch associated lot
      const { data: lotEntryData } = await supabase
        .from("lot_entries")
        .select("lot_id, lots(id, lot_number, status, lqi_grade, allowed_ler_codes)")
        .eq("entry_id", id)
        .limit(1)
        .maybeSingle() as unknown as {
          data: {
            lot_id: string;
            lots: {
              id: string;
              lot_number: string;
              status: string;
              lqi_grade: string | null;
              allowed_ler_codes: string[];
            } | null;
          } | null;
        };

      if (lotEntryData?.lots) {
        setAssociatedLot({
          lot_id: lotEntryData.lot_id,
          ...lotEntryData.lots,
        });
      }

      setIsLoading(false);
    }
    fetchEntry();
  }, [id]);

  if (isLoading || !entry) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 rounded bg-muted" />
        <div className="h-64 rounded-lg bg-muted" />
      </div>
    );
  }

  const timelineEvents = STATUS_FLOW.map((s) => {
    const statusOrder = STATUS_FLOW.map((sf) => sf.status);
    const currentIdx = statusOrder.indexOf(entry.status);
    const eventIdx = statusOrder.indexOf(s.status);
    const isCompleted = eventIdx <= currentIdx;

    return {
      status: s.status,
      label: s.label,
      timestamp: isCompleted ? entry.created_at : undefined,
      detail:
        s.status === "gross_weighed" && entry.gross_weight_kg
          ? `${entry.gross_weight_kg.toLocaleString("pt-PT")} kg`
          : s.status === "tare_weighed" && entry.tare_weight_kg
          ? `${entry.tare_weight_kg.toLocaleString("pt-PT")} kg`
          : undefined,
    };
  });

  return (
    <div className="space-y-6">
      <Link
        href="/entries"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {t("title")}
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold font-mono">{entry.entry_number}</h1>
          <p className="text-sm text-muted-foreground">
            Criado em {new Date(entry.created_at).toLocaleString("pt-PT")}
          </p>
        </div>
        <span className="rounded-full bg-success-surface px-3 py-1 text-sm font-medium text-success capitalize">
          {entry.status.replace("_", " ")}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main info */}
        <div className="col-span-2 space-y-6">
          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Truck className="h-4 w-4" /> Dados da Entrada
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Matrícula:</span>
                <p className="font-medium font-mono">{entry.vehicle_plate || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Motorista:</span>
                <p className="font-medium">{entry.driver_name || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">e-GAR:</span>
                <p className="font-medium font-mono">{entry.egar_number || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Código LER:</span>
                <p className="font-medium font-mono">
                  {entry.ler_code || "—"}
                  {entry.is_hazardous && (
                    <span className="ml-2 rounded bg-warning-surface px-1.5 py-0.5 text-xs text-warning">
                      Perigoso
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Scale className="h-4 w-4" /> Pesagens
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="rounded-md bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">Peso Bruto</p>
                <p className="text-xl font-bold font-mono">
                  {entry.gross_weight_kg ? `${entry.gross_weight_kg.toLocaleString("pt-PT")} kg` : "—"}
                </p>
              </div>
              <div className="rounded-md bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">Tara</p>
                <p className="text-xl font-bold font-mono">
                  {entry.tare_weight_kg ? `${entry.tare_weight_kg.toLocaleString("pt-PT")} kg` : "—"}
                </p>
              </div>
              <div className="rounded-md bg-primary-surface p-4">
                <p className="text-sm text-muted-foreground">Peso Líquido</p>
                <p className="text-xl font-bold font-mono text-primary">
                  {entry.net_weight_kg ? `${entry.net_weight_kg.toLocaleString("pt-PT")} kg` : "—"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" /> Inspeção
            </h3>
            <div className="text-sm">
              <p>
                <span className="text-muted-foreground">Resultado: </span>
                <span className="font-medium capitalize">
                  {entry.inspection_result?.replace("_", " ") || "—"}
                </span>
              </p>
              {entry.inspection_notes && (
                <p className="mt-2 text-muted-foreground">{entry.inspection_notes}</p>
              )}
            </div>
          </div>

          {entry.storage_areas && (
            <div className="rounded-lg border border-border bg-card p-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Package className="h-4 w-4" /> Armazenamento
              </h3>
              <div className="text-sm">
                <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium mr-2">
                  {entry.storage_areas.code}
                </span>
                {entry.storage_areas.name}
              </div>
            </div>
          )}

          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Layers3 className="h-4 w-4" /> Lote Associado
            </h3>
            {associatedLot ? (
              <div className="flex items-center gap-4 text-sm">
                <Link
                  href={`/lots/${associatedLot.lot_id}`}
                  className="font-medium font-mono text-primary hover:underline"
                >
                  {associatedLot.lot_number}
                </Link>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium capitalize">
                  {associatedLot.status.replace("_", " ")}
                </span>
                {associatedLot.lqi_grade && (
                  <span className="rounded-full bg-primary-surface px-2.5 py-0.5 text-xs font-bold text-primary">
                    LQI {associatedLot.lqi_grade}
                  </span>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">— Sem lote associado</p>
            )}
          </div>
        </div>

        {/* Timeline sidebar */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 font-semibold">Progresso</h3>
          <EntryTimeline events={timelineEvents} currentStatus={entry.status} />
        </div>
      </div>
    </div>
  );
}
