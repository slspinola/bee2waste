"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCurrentPark } from "@/hooks/use-current-park";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Entry {
  id: string;
  entry_number: string;
  ler_code: string | null;
  net_weight_kg: number | null;
}

interface LerCode {
  id: string;
  code: string;
  description_pt: string;
}

interface StorageArea {
  id: string;
  code: string;
  name: string;
}

interface ClassLine {
  output_ler_code_id: string;
  output_ler_code: string;
  weight_kg: string;
  destination_area_id: string;
  notes: string;
}

export default function NewClassificationSheetPage() {
  const tc = useTranslations("common");
  const { currentParkId } = useCurrentPark();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [lerCodes, setLerCodes] = useState<LerCode[]>([]);
  const [areas, setAreas] = useState<StorageArea[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState("");
  const [lines, setLines] = useState<ClassLine[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!currentParkId) return;
      const supabase = createClient();

      const { data: entryData } = await supabase
        .from("entries")
        .select("id, entry_number, ler_code, net_weight_kg")
        .eq("park_id", currentParkId)
        .eq("status", "confirmed")
        .order("created_at", { ascending: false }) as { data: Entry[] | null };
      if (entryData) setEntries(entryData);

      const { data: codeData } = await supabase
        .from("ler_codes")
        .select("id, code, description_pt")
        .eq("is_active", true)
        .order("code") as { data: LerCode[] | null };
      if (codeData) setLerCodes(codeData);

      const { data: areaData } = await supabase
        .from("storage_areas")
        .select("id, code, name")
        .eq("park_id", currentParkId)
        .eq("is_active", true)
        .order("code") as { data: StorageArea[] | null };
      if (areaData) setAreas(areaData);
    }
    loadData();
  }, [currentParkId]);

  const selectedEntry = entries.find((e) => e.id === selectedEntryId);
  const totalOutputKg = lines.reduce((sum, l) => sum + (parseFloat(l.weight_kg) || 0), 0);

  function addLine() {
    setLines([...lines, { output_ler_code_id: "", output_ler_code: "", weight_kg: "", destination_area_id: "", notes: "" }]);
  }

  function updateLine(idx: number, field: keyof ClassLine, value: string) {
    const updated = [...lines];
    updated[idx] = { ...updated[idx], [field]: value };
    if (field === "output_ler_code_id") {
      const code = lerCodes.find((c) => c.id === value);
      if (code) updated[idx].output_ler_code = code.code;
    }
    setLines(updated);
  }

  function removeLine(idx: number) {
    setLines(lines.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentParkId || !selectedEntryId || lines.length === 0) return;
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const orgId = user?.app_metadata?.org_id;

      const { count } = await supabase
        .from("classification_sheets")
        .select("id", { count: "exact", head: true })
        .eq("park_id", currentParkId);

      const sheetNumber = `CS-${String((count || 0) + 1).padStart(5, "0")}`;

      const { data: sheet, error: sheetError } = await supabase
        .from("classification_sheets")
        .insert({
          org_id: orgId,
          park_id: currentParkId,
          entry_id: selectedEntryId,
          sheet_number: sheetNumber,
          status: "completed",
          source_ler_code: selectedEntry?.ler_code,
          source_weight_kg: selectedEntry?.net_weight_kg,
          total_output_kg: totalOutputKg,
          loss_kg: (selectedEntry?.net_weight_kg || 0) - totalOutputKg,
          completed_at: new Date().toISOString(),
        })
        .select("id")
        .single() as { data: { id: string } | null; error: unknown };

      if (sheetError || !sheet) {
        toast.error("Erro ao criar ficha");
        setIsSubmitting(false);
        return;
      }

      const lineInserts = lines.map((l) => ({
        sheet_id: sheet.id,
        output_ler_code_id: l.output_ler_code_id || null,
        output_ler_code: l.output_ler_code,
        weight_kg: parseFloat(l.weight_kg),
        destination_area_id: l.destination_area_id || null,
        notes: l.notes || null,
      }));

      await supabase.from("classification_lines").insert(lineInserts);
      toast.success("Ficha de classificação criada!");
      setSelectedEntryId("");
      setLines([]);
    } catch {
      toast.error("Erro ao criar ficha");
    }
    setIsSubmitting(false);
  }

  return (
    <div className="space-y-6">
      <Link href="/classification" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Classificação
      </Link>

      <h1 className="text-xl font-semibold">Nova Ficha de Classificação</h1>

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        {/* Source Entry */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h3 className="font-semibold">Entrada de Origem</h3>
          <select
            value={selectedEntryId}
            onChange={(e) => setSelectedEntryId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            required
          >
            <option value="">Selecione uma entrada...</option>
            {entries.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.entry_number} — LER: {entry.ler_code || "N/A"} — {entry.net_weight_kg?.toLocaleString("pt-PT")} kg
              </option>
            ))}
          </select>

          {selectedEntry && (
            <div className="grid grid-cols-2 gap-4 rounded-md bg-muted/50 p-3 text-sm">
              <div>
                <span className="text-muted-foreground">LER Origem:</span>
                <p className="font-mono font-medium">{selectedEntry.ler_code}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Peso Entrada:</span>
                <p className="font-mono font-medium">{selectedEntry.net_weight_kg?.toLocaleString("pt-PT")} kg</p>
              </div>
            </div>
          )}
        </div>

        {/* Classification Lines */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Materiais de Saída</h3>
            <button
              type="button"
              onClick={addLine}
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <Plus className="h-4 w-4" /> Adicionar linha
            </button>
          </div>

          {lines.map((line, idx) => (
            <div key={idx} className="rounded-md border border-border p-4 space-y-3">
              <div className="flex items-start justify-between">
                <span className="text-xs font-medium text-muted-foreground">Linha {idx + 1}</span>
                <button type="button" onClick={() => removeLine(idx)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Código LER</label>
                  <select
                    value={line.output_ler_code_id}
                    onChange={(e) => updateLine(idx, "output_ler_code_id", e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                    required
                  >
                    <option value="">Selecione...</option>
                    {lerCodes.map((c) => (
                      <option key={c.id} value={c.id}>{c.code} - {c.description_pt}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Peso (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={line.weight_kg}
                    onChange={(e) => updateLine(idx, "weight_kg", e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Área Destino</label>
                  <select
                    value={line.destination_area_id}
                    onChange={(e) => updateLine(idx, "destination_area_id", e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                  >
                    <option value="">Selecione...</option>
                    {areas.map((a) => (
                      <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}

          {lines.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-4">Adicione linhas de material de saída.</p>
          )}

          {lines.length > 0 && selectedEntry?.net_weight_kg && (
            <div className="flex justify-between rounded-md bg-muted/50 p-3 text-sm">
              <span>Total saída: <strong className="font-mono">{totalOutputKg.toLocaleString("pt-PT")} kg</strong></span>
              <span>Perda: <strong className="font-mono">{((selectedEntry.net_weight_kg || 0) - totalOutputKg).toLocaleString("pt-PT")} kg</strong></span>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting || !selectedEntryId || lines.length === 0}
            className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
          >
            {isSubmitting ? tc("loading") : tc("create")}
          </button>
          <Link href="/classification" className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent">
            {tc("cancel")}
          </Link>
        </div>
      </form>
    </div>
  );
}
