"use client";

import { useEffect, useState, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCurrentPark } from "@/hooks/use-current-park";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, Printer } from "lucide-react";

interface DeliveryLine {
  id: string;
  ler_code: string;
  planned_weight_kg: number;
  actual_weight_kg: number | null;
  storage_areas?: { code: string; name: string } | null;
}

interface DeliveryRequest {
  id: string;
  request_number: string;
  exit_type: string;
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
}

interface ParkInfo {
  name: string;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  apa_number: string | null;
  license_number: string | null;
}

export default function ExitGuidePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { currentParkId } = useCurrentPark();
  const [request, setRequest] = useState<DeliveryRequest | null>(null);
  const [lines, setLines] = useState<DeliveryLine[]>([]);
  const [park, setPark] = useState<ParkInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const [{ data: reqData }, { data: lineData }] = await Promise.all([
        supabase
          .from("delivery_requests")
          .select("id, request_number, exit_type, destination_name, destination_nif, destination_address, transporter_name, transporter_nif, vehicle_plate, driver_name, egar_number, planned_date, actual_date, total_weight_kg, notes")
          .eq("id", id)
          .single(),
        supabase
          .from("delivery_lines")
          .select("id, ler_code, planned_weight_kg, actual_weight_kg, storage_areas:source_area_id(code, name)")
          .eq("request_id", id)
          .order("created_at"),
      ]);

      if (reqData) setRequest(reqData as unknown as DeliveryRequest);
      if (lineData) setLines(lineData as unknown as DeliveryLine[]);

      if (currentParkId) {
        const { data: parkData } = await supabase
          .from("parks")
          .select("name, address, city, postal_code, apa_number, license_number")
          .eq("id", currentParkId)
          .single();
        if (parkData) setPark(parkData as unknown as ParkInfo);
      }

      setIsLoading(false);
    }
    fetchData();
  }, [id, currentParkId]);

  if (isLoading || !request) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 rounded bg-muted" />
        <div className="h-96 rounded-lg bg-muted" />
      </div>
    );
  }

  const printDate = (request.actual_date || request.planned_date)
    ? new Date(request.actual_date || request.planned_date!).toLocaleDateString("pt-PT")
    : new Date().toLocaleDateString("pt-PT");

  const totalWeight = lines.reduce(
    (sum, l) => sum + (l.actual_weight_kg ?? l.planned_weight_kg ?? 0),
    0
  );

  return (
    <>
      {/* Print CSS — hides sidebar, header, and no-print elements */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          aside, nav, header { display: none !important; }
          body { background: white !important; }
          .print-page { max-width: none !important; box-shadow: none !important; }
        }
        @page {
          size: A4;
          margin: 15mm 15mm 20mm 15mm;
        }
      `}</style>

      {/* Screen-only controls */}
      <div className="no-print mb-6 flex items-center justify-between">
        <Link
          href={`/exits/${id}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar à saída
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
        >
          <Printer className="h-4 w-4" /> Imprimir
        </button>
      </div>

      {/* Printable document */}
      <div className="print-page mx-auto max-w-3xl rounded-lg border border-border bg-white p-8 shadow-sm text-sm">
        {/* Park Header */}
        <div className="mb-6 border-b border-border pb-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-lg font-bold">{park?.name || "Parque de Resíduos"}</h1>
              {park?.address && <p className="text-muted-foreground">{park.address}</p>}
              {(park?.city || park?.postal_code) && (
                <p className="text-muted-foreground">
                  {[park.postal_code, park.city].filter(Boolean).join(" ")}
                </p>
              )}
              {park?.apa_number && (
                <p className="text-muted-foreground font-mono">Nº APA: {park.apa_number}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xl font-bold">GUIA DE SAÍDA</p>
              <p className="mt-1 font-mono font-semibold">{request.request_number}</p>
              {request.egar_number && (
                <p className="text-sm text-muted-foreground font-mono">e-GAR: {request.egar_number}</p>
              )}
              <p className="text-sm text-muted-foreground">Data: {printDate}</p>
            </div>
          </div>
        </div>

        {/* Destination + Transport */}
        <div className="mb-6 grid grid-cols-2 gap-6">
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Destinatário</h3>
            <div className="rounded border border-border p-3 space-y-1">
              <p className="font-semibold">{request.destination_name || "—"}</p>
              {request.destination_nif && <p className="font-mono text-xs">NIF: {request.destination_nif}</p>}
              {request.destination_address && <p className="text-muted-foreground">{request.destination_address}</p>}
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Transporte</h3>
            <div className="rounded border border-border p-3 space-y-1">
              {request.transporter_name && <p className="font-semibold">{request.transporter_name}</p>}
              {request.transporter_nif && <p className="font-mono text-xs">NIF: {request.transporter_nif}</p>}
              {request.vehicle_plate && (
                <p>
                  Matrícula:{" "}
                  <span className="font-mono font-semibold">{request.vehicle_plate}</span>
                </p>
              )}
              {request.driver_name && <p>Motorista: {request.driver_name}</p>}
            </div>
          </div>
        </div>

        {/* Waste Table */}
        <div className="mb-6">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resíduos Transportados</h3>
          <table className="w-full border-collapse border border-border text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="border border-border px-3 py-2 text-left">#</th>
                <th className="border border-border px-3 py-2 text-left">Código LER</th>
                <th className="border border-border px-3 py-2 text-left">Área Origem</th>
                <th className="border border-border px-3 py-2 text-right">Peso Plan. (kg)</th>
                <th className="border border-border px-3 py-2 text-right">Peso Efet. (kg)</th>
                {request.egar_number && (
                  <th className="border border-border px-3 py-2 text-left">Ref. e-GAR</th>
                )}
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => (
                <tr key={line.id}>
                  <td className="border border-border px-3 py-2 text-muted-foreground">{idx + 1}</td>
                  <td className="border border-border px-3 py-2 font-mono">{line.ler_code}</td>
                  <td className="border border-border px-3 py-2">
                    {line.storage_areas
                      ? `${line.storage_areas.code} — ${line.storage_areas.name}`
                      : "—"}
                  </td>
                  <td className="border border-border px-3 py-2 text-right font-mono">
                    {line.planned_weight_kg.toLocaleString("pt-PT")}
                  </td>
                  <td className="border border-border px-3 py-2 text-right font-mono">
                    {line.actual_weight_kg != null
                      ? line.actual_weight_kg.toLocaleString("pt-PT")
                      : "—"}
                  </td>
                  {request.egar_number && (
                    <td className="border border-border px-3 py-2 font-mono text-xs">
                      {request.egar_number}
                    </td>
                  )}
                </tr>
              ))}
              <tr className="bg-muted/30 font-semibold">
                <td colSpan={3} className="border border-border px-3 py-2 text-right">
                  Total
                </td>
                <td className="border border-border px-3 py-2 text-right font-mono">
                  {lines.reduce((s, l) => s + l.planned_weight_kg, 0).toLocaleString("pt-PT")}
                </td>
                <td className="border border-border px-3 py-2 text-right font-mono">
                  {totalWeight.toLocaleString("pt-PT")}
                </td>
                {request.egar_number && <td className="border border-border" />}
              </tr>
            </tbody>
          </table>
        </div>

        {request.notes && (
          <div className="mb-6">
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Observações</h3>
            <p className="rounded border border-border p-3 text-muted-foreground">{request.notes}</p>
          </div>
        )}

        {/* Signatures */}
        <div className="mt-10 grid grid-cols-2 gap-12">
          <div>
            <div className="mb-1 h-16 border-b border-border" />
            <p className="text-xs text-center text-muted-foreground">
              Responsável do Parque / Data
            </p>
          </div>
          <div>
            <div className="mb-1 h-16 border-b border-border" />
            <p className="text-xs text-center text-muted-foreground">
              Motorista / Data
            </p>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Documento gerado automaticamente por Bee2Waste — {new Date().toLocaleString("pt-PT")}
        </p>
      </div>
    </>
  );
}
