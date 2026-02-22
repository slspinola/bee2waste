"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCurrentPark } from "@/hooks/use-current-park";
import { useRouter } from "@/i18n/navigation";
import { createLot } from "@/actions/lots";
import { toast } from "sonner";
import { Boxes, X } from "lucide-react";

interface LerAuth {
  id: string;
  ler_code: string;
  ler_codes: { code: string; description_pt: string };
}

interface Zone {
  id: string;
  name: string;
  code: string;
  is_blocked: boolean;
  area_group_id: string | null;
  area_groups: { name: string } | null;
}

export default function NewLotPage() {
  const { currentParkId } = useCurrentPark();
  const router = useRouter();
  const [lerAuths, setLerAuths] = useState<LerAuth[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [selectedLerIds, setSelectedLerIds] = useState<string[]>([]);
  const [selectedZoneIds, setSelectedZoneIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    async function load() {
      if (!currentParkId) return;
      const supabase = createClient();
      const [{ data: auths }, { data: zns }] = await Promise.all([
        supabase
          .from("park_ler_authorizations")
          .select("id, ler_code_id, ler_codes(code, description_pt)")
          .eq("park_id", currentParkId)
          .eq("is_active", true),
        supabase
          .from("storage_areas")
          .select("id, name, code, is_blocked, area_group_id, area_groups(name)")
          .eq("park_id", currentParkId)
          .eq("is_active", true)
          .order("code"),
      ]);
      if (auths) setLerAuths(auths as unknown as LerAuth[]);
      if (zns) setZones(zns as unknown as Zone[]);
    }
    load();
  }, [currentParkId]);

  function toggleLer(lerId: string) {
    setSelectedLerIds((prev) =>
      prev.includes(lerId) ? prev.filter((id) => id !== lerId) : [...prev, lerId]
    );
  }

  function toggleZone(zoneId: string) {
    setSelectedZoneIds((prev) =>
      prev.includes(zoneId) ? prev.filter((id) => id !== zoneId) : [...prev, zoneId]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentParkId) return;
    if (selectedLerIds.length === 0) { toast.error("Selecione pelo menos um código LER"); return; }
    if (selectedZoneIds.length === 0) { toast.error("Selecione pelo menos uma zona"); return; }

    setSaving(true);
    try {
      const selectedLers = lerAuths.filter((a) => selectedLerIds.includes(a.id));
      await createLot({
        park_id: currentParkId,
        name: name || undefined,
        allowed_ler_codes: selectedLers.map((a) => a.ler_codes.code),
        allowed_ler_code_ids: selectedLers.map((a) => a.id),
        zone_ids: selectedZoneIds,
        notes: notes || undefined,
      });
      toast.success("Lote criado com sucesso");
      router.push("/lots");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar lote");
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-surface">
          <Boxes className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Novo Lote</h1>
          <p className="text-sm text-muted-foreground">Crie um novo lote para rastrear resíduos</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-4">
          <h2 className="font-medium">Identificação</h2>
          <div>
            <label className="text-sm font-medium">Nome do Lote <span className="text-muted-foreground font-normal">(opcional)</span></label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Papel/Cartão Março"
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-muted-foreground">Se não preenchido, o número do lote é usado como identificação.</p>
          </div>
          <div>
            <label className="text-sm font-medium">Notas <span className="text-muted-foreground font-normal">(opcional)</span></label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* LER Codes */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <h2 className="font-medium">Códigos LER aceites *</h2>
          <p className="text-sm text-muted-foreground">Selecione os códigos LER que este lote pode receber</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {lerAuths.map((auth) => {
              const selected = selectedLerIds.includes(auth.id);
              return (
                <button
                  type="button"
                  key={auth.id}
                  onClick={() => toggleLer(auth.id)}
                  className={`flex items-center gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                    selected
                      ? "border-primary bg-primary-surface text-primary"
                      : "border-border hover:border-primary/50 hover:bg-accent"
                  }`}
                >
                  <span className={`rounded px-1.5 py-0.5 text-xs font-mono font-medium ${selected ? "bg-primary/10" : "bg-muted"}`}>
                    {auth.ler_codes.code}
                  </span>
                  <span className="flex-1 text-xs leading-tight">{auth.ler_codes.description_pt}</span>
                  {selected && <X className="h-3.5 w-3.5 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
          {lerAuths.length === 0 && (
            <p className="text-sm text-warning">Nenhuma autorização LER configurada para este parque.</p>
          )}
        </div>

        {/* Zones */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <h2 className="font-medium">Zonas de armazenamento *</h2>
          <p className="text-sm text-muted-foreground">Selecione as zonas onde este lote será armazenado</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {zones.map((zone) => {
              const selected = selectedZoneIds.includes(zone.id);
              const disabled = zone.is_blocked;
              return (
                <button
                  type="button"
                  key={zone.id}
                  onClick={() => !disabled && toggleZone(zone.id)}
                  disabled={disabled}
                  className={`flex items-center gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    selected
                      ? "border-primary bg-primary-surface text-primary"
                      : "border-border hover:border-primary/50 hover:bg-accent"
                  }`}
                >
                  <span className={`rounded px-1.5 py-0.5 text-xs font-mono font-medium ${selected ? "bg-primary/10" : "bg-muted"}`}>
                    {zone.code}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{zone.name}</p>
                    {zone.area_groups?.name && (
                      <p className="text-xs text-muted-foreground">{zone.area_groups.name}</p>
                    )}
                  </div>
                  {disabled && <span className="text-xs text-destructive">Bloqueada</span>}
                  {selected && !disabled && <X className="h-3.5 w-3.5 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving || selectedLerIds.length === 0 || selectedZoneIds.length === 0}
            className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
          >
            {saving ? "A criar..." : "Criar Lote"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/lots")}
            className="rounded-md border border-border px-6 py-2 text-sm font-medium hover:bg-accent"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
