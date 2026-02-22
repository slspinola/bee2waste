"use client";

import { useEffect, useState, useCallback, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, Scale, RefreshCw, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface DeliveryLine {
  id: string;
  ler_code: string;
  planned_weight_kg: number;
  actual_weight_kg: number | null;
  source_area_id: string | null;
  storage_areas?: { code: string; name: string } | null;
}

interface DeliveryRequest {
  id: string;
  request_number: string;
  exit_type: string;
  status: string;
  destination_name: string | null;
  vehicle_plate: string | null;
  driver_name: string | null;
}

export default function ExitLoadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [request, setRequest] = useState<DeliveryRequest | null>(null);
  const [lines, setLines] = useState<DeliveryLine[]>([]);
  const [lineWeights, setLineWeights] = useState<Record<string, string>>({});
  const [readingLine, setReadingLine] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(async function load() {
    const supabase = createClient();
    const [{ data: reqData }, { data: lineData }] = await Promise.all([
      supabase.from("delivery_requests").select("id, request_number, exit_type, status, destination_name, vehicle_plate, driver_name").eq("id", id).single(),
      supabase.from("delivery_lines").select("*, storage_areas:source_area_id(code, name)").eq("request_id", id).order("created_at"),
    ]);
    if (reqData) setRequest(reqData as unknown as DeliveryRequest);
    if (lineData) {
      const typedLines = lineData as unknown as DeliveryLine[];
      setLines(typedLines);
      const weights: Record<string, string> = {};
      for (const line of typedLines) {
        weights[line.id] = line.actual_weight_kg != null ? String(line.actual_weight_kg) : "";
      }
      setLineWeights(weights);
    }
    setIsLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function readScaleForLine(lineId: string) {
    setReadingLine(lineId);
    try {
      const res = await fetch("/api/mock/scale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scale_id: "main", context: "gross" }),
      });
      const data = await res.json();
      if (data?.weight_kg) {
        setLineWeights((prev) => ({ ...prev, [lineId]: String(data.weight_kg) }));
      }
    } catch {
      toast.error("Erro ao ler balança");
    }
    setReadingLine(null);
  }

  async function saveLineWeight(lineId: string) {
    const weight = parseFloat(lineWeights[lineId] || "");
    if (isNaN(weight) || weight <= 0) {
      toast.error("Peso inválido");
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("delivery_lines")
        .update({ actual_weight_kg: weight })
        .eq("id", lineId);
      if (error) throw new Error(error.message);
      toast.success("Peso confirmado");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao guardar peso");
    } finally {
      setSaving(false);
    }
  }

  async function confirmLoading() {
    if (!request) return;
    setConfirming(true);
    try {
      // Issue mock e-GAR
      let egarNumber: string | null = null;
      try {
        const res = await fetch("/api/mock/egar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "issue", request_id: id }),
        });
        const data = await res.json();
        egarNumber = data?.egar_number || null;
      } catch {
        // Non-blocking — proceed without e-GAR
      }

      const totalWeight = lines.reduce((sum, l) => sum + (l.actual_weight_kg || 0), 0);
      const supabase = createClient();
      const { error } = await supabase
        .from("delivery_requests")
        .update({
          status: "loaded",
          actual_weight_kg: totalWeight,
          actual_date: new Date().toISOString().split("T")[0],
          ...(egarNumber ? { egar_number: egarNumber } : {}),
        })
        .eq("id", id);

      if (error) throw new Error(error.message);
      toast.success("Carregamento confirmado!");
      router.push(`/exits/${id}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao confirmar carregamento");
    } finally {
      setConfirming(false);
    }
  }

  if (isLoading || !request) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 rounded bg-muted" />
        <div className="h-64 rounded-lg bg-muted" />
      </div>
    );
  }

  const allWeighed = lines.length > 0 && lines.every((l) => l.actual_weight_kg != null);

  return (
    <div className="space-y-6">
      <Link
        href={`/exits/${id}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {request.request_number}
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Carregamento</h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
            <span className="font-mono">{request.request_number}</span>
            {request.destination_name && <span>→ {request.destination_name}</span>}
            {request.vehicle_plate && (
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                {request.vehicle_plate}
              </span>
            )}
          </div>
        </div>
        {allWeighed && (
          <button
            onClick={confirmLoading}
            disabled={confirming}
            className="inline-flex items-center gap-2 rounded-md bg-success px-4 py-2 text-sm font-medium text-white hover:bg-success/90 disabled:opacity-50"
          >
            <CheckCircle className="h-4 w-4" />
            {confirming ? "A confirmar..." : "Confirmar Carregamento"}
          </button>
        )}
      </div>

      {/* Progress summary */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {lines.filter((l) => l.actual_weight_kg != null).length} / {lines.length} linhas pesadas
          </span>
          <span className="font-mono font-medium">
            Total efetivo:{" "}
            {lines.reduce((sum, l) => sum + (l.actual_weight_kg || 0), 0).toLocaleString("pt-PT")} kg
            {" "}
            <span className="text-muted-foreground">
              (planeado:{" "}
              {lines.reduce((sum, l) => sum + (l.planned_weight_kg || 0), 0).toLocaleString("pt-PT")} kg)
            </span>
          </span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-muted">
          <div
            className="h-2 rounded-full bg-primary transition-all"
            style={{
              width: `${lines.length === 0 ? 0 : (lines.filter((l) => l.actual_weight_kg != null).length / lines.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Lines */}
      <div className="space-y-3">
        {lines.map((line, idx) => {
          const isWeighed = line.actual_weight_kg != null;
          const isReading = readingLine === line.id;
          return (
            <div
              key={line.id}
              className={`rounded-lg border bg-card p-4 ${
                isWeighed ? "border-success/30 bg-success-surface/20" : "border-border"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">{idx + 1}</span>
                    <span className="font-mono text-sm font-medium">{line.ler_code}</span>
                    {line.storage_areas && (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">
                        {line.storage_areas.code}
                      </span>
                    )}
                    <span className="text-sm text-muted-foreground">
                      Planeado: <span className="font-mono">{line.planned_weight_kg.toLocaleString("pt-PT")} kg</span>
                    </span>
                    {isWeighed && (
                      <span className="inline-flex items-center gap-1 text-xs text-success font-medium">
                        <CheckCircle className="h-3 w-3" /> Pesado
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <div className="relative flex-1 max-w-xs">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={lineWeights[line.id] || ""}
                        onChange={(e) =>
                          setLineWeights((prev) => ({ ...prev, [line.id]: e.target.value }))
                        }
                        placeholder="Peso efetivo (kg)"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono pr-10"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => readScaleForLine(line.id)}
                      disabled={isReading}
                      title="Ler balança"
                      className="inline-flex h-10 items-center gap-1.5 rounded-md border border-border px-3 text-sm text-muted-foreground hover:bg-accent disabled:opacity-50"
                    >
                      {isReading ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Scale className="h-4 w-4" />
                      )}
                      {isReading ? "A ler..." : "Balança"}
                    </button>
                    <button
                      type="button"
                      onClick={() => saveLineWeight(line.id)}
                      disabled={saving || !lineWeights[line.id]}
                      className="inline-flex h-10 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
                    >
                      Confirmar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {lines.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-12 text-center">
            <p className="text-sm text-muted-foreground">Sem linhas de saída para carregar.</p>
          </div>
        )}
      </div>

      {allWeighed && (
        <div className="rounded-lg border border-success/30 bg-success-surface/20 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-success">
              Todas as linhas pesadas. Pronto para confirmar carregamento.
            </p>
            <button
              onClick={confirmLoading}
              disabled={confirming}
              className="inline-flex items-center gap-2 rounded-md bg-success px-4 py-2 text-sm font-medium text-white hover:bg-success/90 disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4" />
              {confirming ? "A confirmar..." : "Confirmar Carregamento"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
