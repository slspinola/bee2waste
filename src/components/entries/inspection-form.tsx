"use client";

import { useState } from "react";
import { ClipboardCheck, Plus, Trash2 } from "lucide-react";

type InspectionResult = "approved" | "approved_with_divergence" | "rejected";

interface Divergence {
  type: string;
  severity: string;
  description: string;
}

interface InspectionData {
  result: InspectionResult;
  notes: string;
  divergences: Divergence[];
}

interface InspectionFormProps {
  onComplete: (data: InspectionData) => void;
  disabled?: boolean;
}

const DIVERGENCE_TYPES = [
  { value: "weight_mismatch", label: "Discrepância de peso" },
  { value: "ler_code_mismatch", label: "Código LER incorreto" },
  { value: "contamination", label: "Contaminação" },
  { value: "packaging_issue", label: "Problema de embalagem" },
  { value: "documentation_issue", label: "Problema de documentação" },
  { value: "other", label: "Outro" },
];

const SEVERITY_LEVELS = [
  { value: "minor", label: "Menor", color: "text-warning" },
  { value: "major", label: "Maior", color: "text-orange-500" },
  { value: "critical", label: "Crítica", color: "text-destructive" },
];

export function InspectionForm({ onComplete, disabled }: InspectionFormProps) {
  const [result, setResult] = useState<InspectionResult | "">("");
  const [notes, setNotes] = useState("");
  const [divergences, setDivergences] = useState<Divergence[]>([]);

  function addDivergence() {
    setDivergences([
      ...divergences,
      { type: "weight_mismatch", severity: "minor", description: "" },
    ]);
  }

  function updateDivergence(index: number, field: keyof Divergence, value: string) {
    const updated = [...divergences];
    updated[index] = { ...updated[index], [field]: value };
    setDivergences(updated);
  }

  function removeDivergence(index: number) {
    setDivergences(divergences.filter((_, i) => i !== index));
  }

  function handleSubmit() {
    if (!result) return;
    onComplete({
      result,
      notes,
      divergences: result === "approved_with_divergence" ? divergences : [],
    });
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-6">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-semibold">Inspeção Física</h3>
      </div>

      {/* Result Selection */}
      <div className="space-y-3">
        <label className="text-sm font-medium">Resultado da Inspeção</label>
        <div className="grid grid-cols-3 gap-3">
          {([
            { value: "approved", label: "Aprovado", desc: "Conforme documentação", bgClass: "border-success/50 bg-success-surface" },
            { value: "approved_with_divergence", label: "Aprovado c/ Divergência", desc: "Com observações", bgClass: "border-warning/50 bg-warning-surface" },
            { value: "rejected", label: "Rejeitado", desc: "Não conforme", bgClass: "border-destructive/50 bg-destructive-surface" },
          ] as const).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setResult(option.value)}
              disabled={disabled}
              className={`rounded-lg border-2 p-4 text-left transition-colors ${
                result === option.value ? option.bgClass : "border-border hover:border-muted-foreground/30"
              }`}
            >
              <div className="text-sm font-medium">{option.label}</div>
              <div className="text-xs text-muted-foreground">{option.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Divergences */}
      {result === "approved_with_divergence" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Divergências</label>
            <button
              type="button"
              onClick={addDivergence}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Plus className="h-3 w-3" /> Adicionar
            </button>
          </div>

          {divergences.map((div, idx) => (
            <div key={idx} className="rounded-md border border-border p-3 space-y-2">
              <div className="flex items-start gap-2">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <select
                    value={div.type}
                    onChange={(e) => updateDivergence(idx, "type", e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                  >
                    {DIVERGENCE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  <select
                    value={div.severity}
                    onChange={(e) => updateDivergence(idx, "severity", e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                  >
                    {SEVERITY_LEVELS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => removeDivergence(idx)}
                  className="rounded p-1 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <textarea
                value={div.description}
                onChange={(e) => updateDivergence(idx, "description", e.target.value)}
                placeholder="Descreva a divergência..."
                rows={2}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          ))}

          {divergences.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Adicione pelo menos uma divergência.
            </p>
          )}
        </div>
      )}

      {/* Notes */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Observações</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas adicionais sobre a inspeção..."
          rows={3}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          disabled={disabled}
        />
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={disabled || !result || (result === "approved_with_divergence" && divergences.length === 0)}
        className="rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
      >
        Registar Inspeção
      </button>
    </div>
  );
}
