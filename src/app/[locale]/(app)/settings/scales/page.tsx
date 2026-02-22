"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCurrentPark } from "@/hooks/use-current-park";
import { Scale, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface ScaleRecord {
  id: string;
  code: string;
  name: string;
  scale_type: string;
  max_capacity_kg: number;
  precision_kg: number;
  last_calibration: string | null;
  next_calibration: string | null;
  is_active: boolean;
}

const SCALE_TYPES = [
  { value: "platform", label: "Plataforma" },
  { value: "floor", label: "Pavimento" },
  { value: "bench", label: "Bancada" },
  { value: "crane", label: "Grua" },
];

export default function ScalesPage() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const { currentParkId } = useCurrentPark();
  const [scales, setScales] = useState<ScaleRecord[]>([]);
  const [, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", scale_type: "platform", max_capacity_kg: "", precision_kg: "0.5" });

  async function fetchScales() {
    if (!currentParkId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("scales")
      .select("id, code, name, scale_type, max_capacity_kg, precision_kg, last_calibration, next_calibration, is_active")
      .eq("park_id", currentParkId)
      .eq("is_active", true)
      .order("code") as { data: ScaleRecord[] | null };
    if (data) setScales(data);
    setIsLoading(false);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchScales(); }, [currentParkId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!currentParkId) return;
    const supabase = createClient();
    const { error } = await supabase.from("scales").insert({
      park_id: currentParkId,
      code: form.code,
      name: form.name,
      scale_type: form.scale_type,
      max_capacity_kg: Number(form.max_capacity_kg),
      precision_kg: Number(form.precision_kg),
    });
    if (error) toast.error(error.message);
    else {
      toast.success(tc("success"));
      setShowCreate(false);
      setForm({ code: "", name: "", scale_type: "platform", max_capacity_kg: "", precision_kg: "0.5" });
      fetchScales();
    }
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("scales").update({ is_active: false }).eq("id", id);
    fetchScales();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Scale className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">{t("scales")}</h2>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover">
          <Plus className="h-4 w-4" /> {tc("add")}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="rounded-lg border border-border bg-card p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Código</label>
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo</label>
              <select value={form.scale_type} onChange={(e) => setForm({ ...form, scale_type: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {SCALE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Capacidade Máx. (kg)</label>
              <input type="number" value={form.max_capacity_kg} onChange={(e) => setForm({ ...form, max_capacity_kg: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Precisão (kg)</label>
              <input type="number" step="0.1" value={form.precision_kg} onChange={(e) => setForm({ ...form, precision_kg: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover">{tc("create")}</button>
            <button type="button" onClick={() => setShowCreate(false)} className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent">{tc("cancel")}</button>
          </div>
        </form>
      )}

      <div className="rounded-lg border border-border">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Código</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Nome</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Tipo</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Cap. Máx.</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Precisão</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Próx. Calibração</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">{tc("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {scales.map((scale) => (
              <tr key={scale.id} className="border-b border-border last:border-0 hover:bg-accent/50">
                <td className="px-4 py-3 text-sm"><span className="rounded bg-muted px-2 py-0.5 text-xs font-medium">{scale.code}</span></td>
                <td className="px-4 py-3 text-sm font-medium">{scale.name}</td>
                <td className="px-4 py-3 text-sm">{SCALE_TYPES.find((t) => t.value === scale.scale_type)?.label}</td>
                <td className="px-4 py-3 text-right text-sm">{scale.max_capacity_kg.toLocaleString()} kg</td>
                <td className="px-4 py-3 text-right text-sm">{scale.precision_kg} kg</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{scale.next_calibration || "—"}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => handleDelete(scale.id)} className="rounded p-1.5 text-muted-foreground hover:bg-destructive-surface hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {scales.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">{tc("noResults")}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
