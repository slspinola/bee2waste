"use client";

import { useState, useEffect, useTransition } from "react";
import { Tags, Plus, Trash2, RefreshCw, AlertCircle, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import {
  listContaminantLabels,
  upsertContaminantLabel,
  deleteContaminantLabel,
  resetDefaultContaminantLabels,
} from "@/actions/contaminant-labels";
import { DEFAULT_CONTAMINANT_LABELS } from "@/lib/contaminant-labels";
import type { ContaminantLabel } from "@/actions/contaminant-labels";
import { useContaminantLabels } from "@/hooks/use-contaminant-labels";

export default function ContaminantsSettingsPage() {
  const { refresh: refreshGlobalLabels } = useContaminantLabels();
  const [labels, setLabels] = useState<ContaminantLabel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Per-row edit state: api_key → current input value
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [editColors, setEditColors] = useState<Record<string, string>>({});
  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set());
  const [deletingKeys, setDeletingKeys] = useState<Set<string>>(new Set());

  // "Add new" form
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("#6366f1");
  const [isAdding, startAdd] = useTransition();

  // Reset all defaults
  const [isResetting, startReset] = useTransition();

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await listContaminantLabels();
      setLabels(data);
      const values: Record<string, string> = {};
      const colors: Record<string, string> = {};
      data.forEach((l) => {
        values[l.api_key] = l.label_pt;
        if (l.color) colors[l.api_key] = l.color;
      });
      setEditValues(values);
      setEditColors(colors);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar mapeamentos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave(api_key: string) {
    const label_pt = (editValues[api_key] ?? "").trim();
    if (!label_pt) {
      toast.error("A label não pode estar vazia.");
      return;
    }
    const color = editColors[api_key] ?? null;
    setSavingKeys((prev) => { const n = new Set(prev); n.add(api_key); return n; });
    try {
      await upsertContaminantLabel(api_key, label_pt, null, color);
      setLabels((prev) =>
        prev.map((l) => (l.api_key === api_key ? { ...l, label_pt, color } : l))
      );
      refreshGlobalLabels();
      toast.success("Mapeamento guardado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao guardar.");
    } finally {
      setSavingKeys((prev) => { const n = new Set(prev); n.delete(api_key); return n; });
    }
  }

  async function handleResetRow(api_key: string) {
    const defaultLabel = DEFAULT_CONTAMINANT_LABELS[api_key];
    if (!defaultLabel) return;
    setEditValues((prev) => ({ ...prev, [api_key]: defaultLabel }));
    setSavingKeys((prev) => { const n = new Set(prev); n.add(api_key); return n; });
    try {
      const color = editColors[api_key] ?? null;
      await upsertContaminantLabel(api_key, defaultLabel, null, color);
      setLabels((prev) =>
        prev.map((l) => (l.api_key === api_key ? { ...l, label_pt: defaultLabel } : l))
      );
      refreshGlobalLabels();
      toast.success("Label reposta para o valor padrão.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao repor.");
    } finally {
      setSavingKeys((prev) => { const n = new Set(prev); n.delete(api_key); return n; });
    }
  }

  async function handleDelete(api_key: string) {
    if (!confirm(`Eliminar o mapeamento para "${api_key}"?`)) return;
    setDeletingKeys((prev) => { const n = new Set(prev); n.add(api_key); return n; });
    try {
      await deleteContaminantLabel(api_key);
      setLabels((prev) => prev.filter((l) => l.api_key !== api_key));
      setEditValues((prev) => { const n = { ...prev }; delete n[api_key]; return n; });
      setEditColors((prev) => { const n = { ...prev }; delete n[api_key]; return n; });
      refreshGlobalLabels();
      toast.success("Mapeamento eliminado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao eliminar.");
    } finally {
      setDeletingKeys((prev) => { const n = new Set(prev); n.delete(api_key); return n; });
    }
  }

  function handleResetAll() {
    if (!confirm("Repor todos os mapeamentos para os valores padrão? Os mapeamentos personalizados serão substituídos.")) return;
    startReset(async () => {
      try {
        await resetDefaultContaminantLabels();
        refreshGlobalLabels();
        toast.success("Padrões repostos.");
        await load();
      } catch {
        toast.error("Erro ao repor padrões.");
      }
    });
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const key = newKey.trim();
    const label = newLabel.trim();
    if (!key || !label) {
      toast.error("Preencha a chave e a label PT-PT.");
      return;
    }
    if (labels.some((l) => l.api_key === key)) {
      toast.error(`A chave "${key}" já existe. Edite o valor existente.`);
      return;
    }
    startAdd(async () => {
      try {
        const color = newColor || null;
        await upsertContaminantLabel(key, label, null, color);
        const newEntry: ContaminantLabel = {
          api_key: key,
          label_pt: label,
          label_en: null,
          color: color,
          updated_at: new Date().toISOString(),
        };
        setLabels((prev) =>
          [...prev, newEntry].sort((a, b) => a.api_key.localeCompare(b.api_key))
        );
        setEditValues((prev) => ({ ...prev, [key]: label }));
        if (color) setEditColors((prev) => ({ ...prev, [key]: color }));
        setNewKey("");
        setNewLabel("");
        setNewColor("#6366f1");
        refreshGlobalLabels();
        toast.success("Mapeamento adicionado.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao adicionar.");
      }
    });
  }

  // Loading
  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 flex items-center justify-center gap-3 text-muted-foreground">
        <RefreshCw className="h-5 w-5 animate-spin" />
        <span className="text-sm">A carregar mapeamentos...</span>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 flex flex-col items-center gap-4 text-center">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <div>
          <p className="text-sm font-medium text-foreground">Erro de carregamento</p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Tags className="h-4 w-4" />
            Mapeamento de Resíduos Detetados
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure os nomes PT-PT e a cor para os tipos de resíduo devolvidos pelos
            dispositivos de inspeção visual. Aplicado globalmente a todos os parques.
          </p>
        </div>
        <button
          onClick={handleResetAll}
          disabled={isResetting}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:pointer-events-none disabled:opacity-50"
        >
          <RotateCcw className={`h-4 w-4 ${isResetting ? "animate-spin" : ""}`} />
          Repor Padrões
        </button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-xs font-medium text-muted-foreground">
              <th className="px-4 py-3 text-left w-52">Chave API</th>
              <th className="px-4 py-3 text-left">Label PT-PT</th>
              <th className="px-4 py-3 text-left w-32">Cor</th>
              <th className="px-4 py-3 text-right w-44">Ações</th>
            </tr>
          </thead>
          <tbody>
            {labels.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Nenhum mapeamento configurado.
                </td>
              </tr>
            )}
            {labels.map((label) => {
              const currentEdit = editValues[label.api_key] ?? label.label_pt;
              const currentColor = editColors[label.api_key] ?? "";
              const savedColor = label.color ?? "";
              const isDirty = currentEdit !== label.label_pt || currentColor !== savedColor;
              const defaultLabel = DEFAULT_CONTAMINANT_LABELS[label.api_key];
              const isModifiedFromDefault = defaultLabel !== undefined && label.label_pt !== defaultLabel;
              const isSaving = savingKeys.has(label.api_key);
              const isDeleting = deletingKeys.has(label.api_key);

              return (
                <tr
                  key={label.api_key}
                  className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors"
                >
                  {/* API key */}
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5">
                      {label.api_key}
                    </span>
                    {defaultLabel === undefined && (
                      <span className="ml-2 rounded-full px-1.5 py-0.5 text-xs font-medium text-blue-700 bg-blue-50">
                        personalizado
                      </span>
                    )}
                  </td>

                  {/* Editable label */}
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={currentEdit}
                      onChange={(e) =>
                        setEditValues((prev) => ({
                          ...prev,
                          [label.api_key]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && isDirty) handleSave(label.api_key);
                      }}
                      className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                      disabled={isSaving || isDeleting}
                    />
                  </td>

                  {/* Color picker */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {/* Color swatch preview */}
                      {currentColor && (
                        <span
                          className="rounded-full px-2 py-0.5 text-xs font-medium border border-border/50"
                          style={{ backgroundColor: currentColor + "20", color: currentColor }}
                        >
                          {editValues[label.api_key]?.split(" ")[0] ?? label.api_key}
                        </span>
                      )}
                      <input
                        type="color"
                        value={currentColor || "#6366f1"}
                        onChange={(e) =>
                          setEditColors((prev) => ({ ...prev, [label.api_key]: e.target.value }))
                        }
                        disabled={isSaving || isDeleting}
                        className="h-8 w-8 rounded cursor-pointer border border-input bg-background p-0.5 disabled:pointer-events-none disabled:opacity-50"
                        title="Escolher cor"
                      />
                      {currentColor && (
                        <button
                          onClick={() =>
                            setEditColors((prev) => { const n = { ...prev }; delete n[label.api_key]; return n; })
                          }
                          disabled={isSaving || isDeleting}
                          className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:pointer-events-none disabled:opacity-50"
                          title="Remover cor"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Save (when dirty) */}
                      {isDirty && (
                        <button
                          onClick={() => handleSave(label.api_key)}
                          disabled={isSaving}
                          className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover transition-colors disabled:pointer-events-none disabled:opacity-50"
                        >
                          {isSaving ? <RefreshCw className="h-3 w-3 animate-spin" /> : null}
                          Guardar
                        </button>
                      )}

                      {/* Reset to default (when value differs from default and not dirty) */}
                      {isModifiedFromDefault && !isDirty && (
                        <button
                          onClick={() => handleResetRow(label.api_key)}
                          disabled={isSaving}
                          className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:pointer-events-none disabled:opacity-50"
                          title={`Repor para: "${defaultLabel}"`}
                        >
                          <RotateCcw className="h-3 w-3" />
                          Repor
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(label.api_key)}
                        disabled={isDeleting || isSaving}
                        className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-destructive hover:border-destructive hover:bg-destructive/10 transition-colors disabled:pointer-events-none disabled:opacity-50"
                      >
                        {isDeleting ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer count */}
      <p className="text-xs text-muted-foreground">
        {labels.length} mapeamento{labels.length !== 1 ? "s" : ""} configurado{labels.length !== 1 ? "s" : ""}
      </p>

      {/* Add new */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Adicionar Mapeamento
        </h3>
        <p className="text-xs text-muted-foreground">
          Adicione um mapeamento para uma chave de resíduo que não está na lista acima.
        </p>
        <form onSubmit={handleAdd} className="flex items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Chave API
            </label>
            <input
              type="text"
              placeholder="ex: plastic_bag"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              className="w-44 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Label PT-PT
            </label>
            <input
              type="text"
              placeholder="ex: Sacos de Plástico"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Cor
            </label>
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="h-[34px] w-10 rounded-md cursor-pointer border border-input bg-background p-0.5"
              title="Escolher cor"
            />
          </div>
          <button
            type="submit"
            disabled={isAdding || !newKey.trim() || !newLabel.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover transition-colors disabled:pointer-events-none disabled:opacity-50"
          >
            {isAdding ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Adicionar
          </button>
        </form>
      </div>
    </div>
  );
}
