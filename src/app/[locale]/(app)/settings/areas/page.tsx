"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCurrentPark } from "@/hooks/use-current-park";
import { Warehouse, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Area {
  id: string;
  code: string;
  name: string;
  area_type: string;
  capacity_kg: number | null;
  current_stock_kg: number;
  is_active: boolean;
}

const AREA_TYPES = [
  { value: "physical", label: "Física" },
  { value: "logical", label: "Lógica" },
  { value: "vfv", label: "VFV" },
  { value: "sorting_line", label: "Linha de Triagem" },
  { value: "warehouse", label: "Armazém" },
];

export default function AreasPage() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const { currentParkId } = useCurrentPark();
  const [areas, setAreas] = useState<Area[]>([]);
  const [, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", area_type: "physical", capacity_kg: "" });

  async function fetchAreas() {
    if (!currentParkId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("storage_areas")
      .select("id, code, name, area_type, capacity_kg, current_stock_kg, is_active")
      .eq("park_id", currentParkId)
      .eq("is_active", true)
      .order("code") as { data: Area[] | null };
    if (data) setAreas(data);
    setIsLoading(false);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchAreas(); }, [currentParkId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!currentParkId) return;
    const supabase = createClient();
    const { error } = await supabase.from("storage_areas").insert({
      park_id: currentParkId,
      code: form.code,
      name: form.name,
      area_type: form.area_type,
      capacity_kg: form.capacity_kg ? Number(form.capacity_kg) : null,
    });
    if (error) toast.error(error.message);
    else {
      toast.success(tc("success"));
      setShowCreate(false);
      setForm({ code: "", name: "", area_type: "physical", capacity_kg: "" });
      fetchAreas();
    }
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("storage_areas").update({ is_active: false }).eq("id", id);
    fetchAreas();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Warehouse className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">{t("storageAreas")}</h2>
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo</label>
              <select value={form.area_type} onChange={(e) => setForm({ ...form, area_type: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {AREA_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Capacidade (kg)</label>
              <input type="number" value={form.capacity_kg} onChange={(e) => setForm({ ...form, capacity_kg: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
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
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Capacidade</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Stock Atual</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">{tc("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {areas.map((area) => (
              <tr key={area.id} className="border-b border-border last:border-0 hover:bg-accent/50">
                <td className="px-4 py-3 text-sm"><span className="rounded bg-muted px-2 py-0.5 text-xs font-medium">{area.code}</span></td>
                <td className="px-4 py-3 text-sm font-medium">{area.name}</td>
                <td className="px-4 py-3 text-sm">{AREA_TYPES.find((t) => t.value === area.area_type)?.label}</td>
                <td className="px-4 py-3 text-right text-sm">{area.capacity_kg ? `${area.capacity_kg.toLocaleString()} kg` : "—"}</td>
                <td className="px-4 py-3 text-right text-sm">{area.current_stock_kg.toLocaleString()} kg</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => handleDelete(area.id)} className="rounded p-1.5 text-muted-foreground hover:bg-destructive-surface hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {areas.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">{tc("noResults")}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
