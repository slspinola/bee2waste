"use client";

import { useEffect, useState, useCallback, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, AlertTriangle, ClipboardList } from "lucide-react";
import { updateNonConformity } from "@/actions/classification";
import { toast } from "sonner";

interface NCDetail {
  id: string;
  nc_number: string;
  nc_type: string;
  severity: string;
  status: string;
  title: string;
  description: string | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  entry_id: string | null;
}

interface EntryInfo {
  entry_number: string;
}

const SEVERITY_CONFIG: Record<string, { label: string; className: string }> = {
  low: { label: "Baixa", className: "bg-blue-50 text-blue-600" },
  medium: { label: "Média", className: "bg-amber-50 text-amber-600" },
  high: { label: "Alta", className: "bg-orange-50 text-orange-600" },
  critical: { label: "Crítica", className: "bg-destructive-surface text-destructive" },
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  open: { label: "Aberta", className: "bg-muted text-muted-foreground" },
  investigating: { label: "Em investigação", className: "bg-amber-50 text-amber-600" },
  resolved: { label: "Resolvida", className: "bg-blue-50 text-blue-600" },
  closed: { label: "Fechada", className: "bg-success-surface text-success" },
};

const NC_TYPE_LABELS: Record<string, string> = {
  weight_discrepancy: "Discrepância de Peso",
  ler_code_mismatch: "Código LER Incorreto",
  contamination: "Contaminação",
  packaging_issue: "Problema de Embalagem",
  documentation_missing: "Documentação em Falta",
  vehicle_issue: "Problema com Veículo",
  other: "Outro",
};

const STATUS_TRANSITIONS: Record<string, string[]> = {
  open: ["investigating", "resolved", "closed"],
  investigating: ["resolved", "closed"],
  resolved: ["closed"],
  closed: [],
};

const NEXT_STATUS_LABELS: Record<string, string> = {
  investigating: "Iniciar Investigação",
  resolved: "Marcar como Resolvida",
  closed: "Fechar NC",
};

export default function NCDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [nc, setNc] = useState<NCDetail | null>(null);
  const [entry, setEntry] = useState<EntryInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [resolveNote, setResolveNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from("non_conformities")
      .select("*")
      .eq("id", id)
      .single() as { data: NCDetail | null };

    if (data) {
      setNc(data);
      if (data.resolution_notes) setResolveNote(data.resolution_notes);
      if (data.entry_id) {
        const { data: entryData } = await supabase
          .from("entries")
          .select("entry_number")
          .eq("id", data.entry_id)
          .single() as { data: EntryInfo | null };
        if (entryData) setEntry(entryData);
      }
    }
    setIsLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleTransition(newStatus: string) {
    if (!nc) return;
    setSaving(true);
    try {
      await updateNonConformity(nc.id, {
        status: newStatus,
        resolution_notes: resolveNote || undefined,
      });
      toast.success("Estado atualizado");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar estado");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveNote() {
    if (!nc) return;
    setSaving(true);
    try {
      await updateNonConformity(nc.id, {
        status: nc.status,
        resolution_notes: resolveNote,
      });
      toast.success("Nota guardada");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao guardar nota");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading || !nc) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 rounded bg-muted" />
        <div className="h-64 rounded-lg bg-muted" />
      </div>
    );
  }

  const severityCfg = SEVERITY_CONFIG[nc.severity] || SEVERITY_CONFIG.low;
  const statusCfg = STATUS_CONFIG[nc.status] || STATUS_CONFIG.open;
  const nextStatuses = STATUS_TRANSITIONS[nc.status] || [];

  return (
    <div className="space-y-6">
      <Link
        href="/classification"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Classificação
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-xl font-semibold font-mono">{nc.nc_number}</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${severityCfg.className}`}>
              {severityCfg.label}
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusCfg.className}`}>
              {statusCfg.label}
            </span>
          </div>
          <p className="mt-1 text-base font-medium">{nc.title}</p>
          <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
            <span>{NC_TYPE_LABELS[nc.nc_type] || nc.nc_type}</span>
            <span>·</span>
            <span>{new Date(nc.created_at).toLocaleString("pt-PT")}</span>
            {entry && nc.entry_id && (
              <>
                <span>·</span>
                <Link
                  href={`/entries/${nc.entry_id}`}
                  className="text-primary hover:underline font-mono"
                >
                  {entry.entry_number}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Description */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <ClipboardList className="h-4 w-4" /> Descrição
          </h3>
          {nc.description ? (
            <p className="text-sm">{nc.description}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">Sem descrição</p>
          )}
        </div>

        {/* Details */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h3 className="font-semibold">Detalhes</h3>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Tipo</dt>
              <dd className="font-medium">{NC_TYPE_LABELS[nc.nc_type] || nc.nc_type}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Severidade</dt>
              <dd>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${severityCfg.className}`}>
                  {severityCfg.label}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Estado</dt>
              <dd>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusCfg.className}`}>
                  {statusCfg.label}
                </span>
              </dd>
            </div>
            {nc.resolved_at && (
              <div>
                <dt className="text-muted-foreground">Resolvida em</dt>
                <dd className="font-medium">{new Date(nc.resolved_at).toLocaleDateString("pt-PT")}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Resolution workflow */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <h3 className="font-semibold">Resolução</h3>

        <div className="space-y-2">
          <label className="text-sm font-medium">Nota de resolução</label>
          <textarea
            value={resolveNote}
            onChange={(e) => setResolveNote(e.target.value)}
            rows={4}
            disabled={nc.status === "closed"}
            placeholder="Descreva as acções tomadas para resolver esta não-conformidade..."
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
          />
        </div>

        {nc.status !== "closed" && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSaveNote}
              disabled={saving}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
            >
              Guardar Nota
            </button>
            {nextStatuses.map((nextStatus) => (
              <button
                key={nextStatus}
                onClick={() => handleTransition(nextStatus)}
                disabled={saving}
                className={`rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 ${
                  nextStatus === "closed"
                    ? "bg-success text-white hover:bg-success/90"
                    : nextStatus === "resolved"
                    ? "bg-primary px-4 py-2 text-primary-foreground hover:bg-primary-hover"
                    : "border border-border hover:bg-accent"
                }`}
              >
                {NEXT_STATUS_LABELS[nextStatus] || nextStatus}
              </button>
            ))}
          </div>
        )}

        {nc.status === "closed" && (
          <p className="text-sm text-muted-foreground italic">Esta não-conformidade está fechada.</p>
        )}
      </div>
    </div>
  );
}
