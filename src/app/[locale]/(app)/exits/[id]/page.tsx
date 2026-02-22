"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, Truck, Package, Building2, Users, Scale, Play, Layers3 } from "lucide-react";

interface DeliveryLine {
  id: string;
  ler_code: string;
  planned_weight_kg: number;
  actual_weight_kg: number | null;
  source_area_id: string | null;
  storage_areas?: { code: string; name: string } | null;
}

interface DeliveryDetail {
  id: string;
  request_number: string;
  exit_type: string;
  status: string;
  destination_name: string | null;
  destination_nif: string | null;
  destination_address: string | null;
  transporter_name: string | null;
  transporter_nif: string | null;
  vehicle_plate: string | null;
  driver_name: string | null;
  egar_number: string | null;
  planned_date: string | null;
  actual_date: string | null;
  total_weight_kg: number | null;
  notes: string | null;
  created_at: string;
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

export default function ExitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations("exits");
  const [request, setRequest] = useState<DeliveryDetail | null>(null);
  const [lines, setLines] = useState<DeliveryLine[]>([]);
  const [tracedLots, setTracedLots] = useState<Array<{
    id: string;
    lot_number: string;
    status: string;
    lqi_grade: string | null;
    allowed_ler_codes: string[];
    zone_code: string;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();

      const { data: reqData } = await supabase
        .from("delivery_requests")
        .select("*")
        .eq("id", id)
        .single() as { data: DeliveryDetail | null };
      if (reqData) setRequest(reqData);

      const { data: lineData } = await supabase
        .from("delivery_lines")
        .select("*, storage_areas:source_area_id(code, name)")
        .eq("request_id", id)
        .order("created_at") as { data: DeliveryLine[] | null };
      if (lineData) setLines(lineData);

      // Trace lots from source zones
      if (lineData && lineData.length > 0) {
        const sourceAreaIds = lineData
          .map((l) => l.source_area_id)
          .filter((id): id is string => id != null);

        if (sourceAreaIds.length > 0) {
          const { data: lotZoneData } = await supabase
            .from("lot_zones")
            .select("lots(id, lot_number, status, lqi_grade, allowed_ler_codes), storage_areas:zone_id(code)")
            .in("zone_id", sourceAreaIds)
            .is("removed_at", null) as unknown as {
              data: Array<{
                lots: {
                  id: string;
                  lot_number: string;
                  status: string;
                  lqi_grade: string | null;
                  allowed_ler_codes: string[];
                } | null;
                storage_areas: { code: string } | null;
              }> | null;
            };

          if (lotZoneData) {
            const seen = new Set<string>();
            const traced = lotZoneData
              .filter((lz) => lz.lots && !seen.has(lz.lots.id) && !!seen.add(lz.lots.id))
              .map((lz) => ({
                ...lz.lots!,
                zone_code: lz.storage_areas?.code || "",
              }));
            setTracedLots(traced);
          }
        }
      }

      setIsLoading(false);
    }
    fetchData();
  }, [id]);

  if (isLoading || !request) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 rounded bg-muted" />
        <div className="h-64 rounded-lg bg-muted" />
      </div>
    );
  }

  const typeCfg = EXIT_TYPE_CONFIG[request.exit_type];
  const statusCfg = STATUS_CONFIG[request.status] || STATUS_CONFIG.draft;
  const TypeIcon = typeCfg?.icon || Package;

  return (
    <div className="space-y-6">
      <Link
        href="/exits"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {t("title")}
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold font-mono">{request.request_number}</h1>
          <div className="mt-1 flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <TypeIcon className="h-4 w-4" />
              {typeCfg?.label || request.exit_type}
            </span>
            <span className="text-sm text-muted-foreground">
              {new Date(request.created_at).toLocaleString("pt-PT")}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {request.status === "planned" && (
            <Link
              href={`/exits/${id}/load`}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
            >
              <Play className="h-3.5 w-3.5" /> Iniciar Carregamento
            </Link>
          )}
          {request.status === "loaded" && (
            <Link
              href={`/exits/${id}/guide`}
              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-accent"
            >
              Imprimir Guia
            </Link>
          )}
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${statusCfg.className}`}>
            {statusCfg.label}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Destination */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4" /> {t("destination")}
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Nome:</span>
              <p className="font-medium">{request.destination_name || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">NIF:</span>
              <p className="font-medium font-mono">{request.destination_nif || "—"}</p>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Morada:</span>
              <p className="font-medium">{request.destination_address || "—"}</p>
            </div>
          </div>
        </div>

        {/* Transport */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Truck className="h-4 w-4" /> {t("transport")}
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Transportadora:</span>
              <p className="font-medium">{request.transporter_name || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">NIF Transp.:</span>
              <p className="font-medium font-mono">{request.transporter_nif || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Matrícula:</span>
              <p className="font-medium font-mono">{request.vehicle_plate || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Motorista:</span>
              <p className="font-medium">{request.driver_name || "—"}</p>
            </div>
          </div>
        </div>

        {/* Planning */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h3 className="font-semibold">Planeamento</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Data Planeada:</span>
              <p className="font-medium">
                {request.planned_date
                  ? new Date(request.planned_date).toLocaleDateString("pt-PT")
                  : "—"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Data Efetiva:</span>
              <p className="font-medium">
                {request.actual_date
                  ? new Date(request.actual_date).toLocaleDateString("pt-PT")
                  : "—"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">e-GAR:</span>
              <p className="font-medium font-mono">{request.egar_number || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Peso Total:</span>
              <p className="font-medium font-mono">
                {request.total_weight_kg
                  ? `${request.total_weight_kg.toLocaleString("pt-PT")} kg`
                  : "—"}
              </p>
            </div>
          </div>
          {request.notes && (
            <div className="text-sm">
              <span className="text-muted-foreground">Notas:</span>
              <p className="mt-1">{request.notes}</p>
            </div>
          )}
        </div>

        {/* Weight Summary */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Scale className="h-4 w-4" /> Resumo de Peso
          </h3>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="rounded-md bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">Peso Planeado</p>
              <p className="text-xl font-bold font-mono">
                {lines.reduce((sum, l) => sum + (l.planned_weight_kg || 0), 0).toLocaleString("pt-PT")} kg
              </p>
            </div>
            <div className="rounded-md bg-primary-surface p-4">
              <p className="text-sm text-muted-foreground">Peso Efetivo</p>
              <p className="text-xl font-bold font-mono text-primary">
                {lines.some((l) => l.actual_weight_kg != null)
                  ? `${lines.reduce((sum, l) => sum + (l.actual_weight_kg || 0), 0).toLocaleString("pt-PT")} kg`
                  : "—"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Lines */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <h3 className="font-semibold">Linhas de Saída</h3>
        <div className="rounded-lg border border-border">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">#</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Código LER</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Área Origem</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Peso Plan. (kg)</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Peso Efet. (kg)</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => (
                <tr key={line.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-sm text-muted-foreground">{idx + 1}</td>
                  <td className="px-4 py-3 text-sm font-mono">{line.ler_code}</td>
                  <td className="px-4 py-3 text-sm">
                    {line.storage_areas ? (
                      <>
                        <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium mr-1.5">
                          {line.storage_areas.code}
                        </span>
                        {line.storage_areas.name}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-mono">
                    {line.planned_weight_kg.toLocaleString("pt-PT")}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-mono">
                    {line.actual_weight_kg != null
                      ? line.actual_weight_kg.toLocaleString("pt-PT")
                      : "—"}
                  </td>
                </tr>
              ))}
              {lines.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Sem linhas de saída.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rastreabilidade */}
      {tracedLots.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Layers3 className="h-4 w-4" /> Rastreabilidade — Lotes de Origem
          </h3>
          <div className="flex flex-wrap gap-3">
            {tracedLots.map((lot) => (
              <Link
                key={lot.id}
                href={`/lots/${lot.id}`}
                className="rounded-lg border border-border bg-background px-4 py-3 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium text-primary">{lot.lot_number}</span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-xs">{lot.zone_code}</span>
                  {lot.lqi_grade && (
                    <span className="rounded-full bg-primary-surface px-2 py-0.5 text-xs font-bold text-primary">
                      {lot.lqi_grade}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground capitalize">{lot.status.replace("_", " ")}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
