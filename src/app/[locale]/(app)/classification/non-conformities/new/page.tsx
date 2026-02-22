"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCurrentPark } from "@/hooks/use-current-park";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const NC_TYPES = [
  { value: "weight_discrepancy", label: "Discrepância de peso" },
  { value: "ler_code_mismatch", label: "Código LER incorreto" },
  { value: "contamination", label: "Contaminação" },
  { value: "documentation", label: "Documentação" },
  { value: "equipment_failure", label: "Falha de equipamento" },
  { value: "process_deviation", label: "Desvio de processo" },
  { value: "other", label: "Outro" },
];

const NC_SEVERITIES = [
  { value: "low", label: "Baixa" },
  { value: "medium", label: "Média" },
  { value: "high", label: "Alta" },
  { value: "critical", label: "Crítica" },
];

export default function NewNonConformityPage() {
  const tc = useTranslations("common");
  const { currentParkId } = useCurrentPark();
  const [form, setForm] = useState({
    nc_type: "other",
    severity: "medium",
    title: "",
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentParkId) return;
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const orgId = user?.app_metadata?.org_id;

      const { count } = await supabase
        .from("non_conformities")
        .select("id", { count: "exact", head: true })
        .eq("park_id", currentParkId);

      const ncNumber = `NC-${String((count || 0) + 1).padStart(5, "0")}`;

      const { error } = await supabase.from("non_conformities").insert({
        org_id: orgId,
        park_id: currentParkId,
        nc_number: ncNumber,
        nc_type: form.nc_type,
        severity: form.severity,
        title: form.title,
        description: form.description,
        reported_by: user?.id,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Não-conformidade registada!");
        setForm({ nc_type: "other", severity: "medium", title: "", description: "" });
      }
    } catch {
      toast.error("Erro ao registar não-conformidade");
    }
    setIsSubmitting(false);
  }

  return (
    <div className="space-y-6">
      <Link href="/classification" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Classificação
      </Link>

      <h1 className="text-xl font-semibold">Nova Não-Conformidade</h1>

      <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Título</label>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo</label>
            <select
              value={form.nc_type}
              onChange={(e) => setForm({ ...form, nc_type: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {NC_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Severidade</label>
            <select
              value={form.severity}
              onChange={(e) => setForm({ ...form, severity: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {NC_SEVERITIES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Descrição</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={5}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            required
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
          >
            {isSubmitting ? tc("loading") : "Registar NC"}
          </button>
          <Link href="/classification" className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent">
            {tc("cancel")}
          </Link>
        </div>
      </form>
    </div>
  );
}
