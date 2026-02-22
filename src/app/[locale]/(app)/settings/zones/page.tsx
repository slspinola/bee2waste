"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCurrentPark } from "@/hooks/use-current-park";
import { Plus, Layers3, Warehouse, Edit2, Trash2, Link as LinkIcon } from "lucide-react";
import { createAreaGroup, updateAreaGroup, deleteAreaGroup, assignZoneToGroup } from "@/actions/lots";
import { toast } from "sonner";

interface AreaGroup {
  id: string;
  name: string;
  code: string;
  description: string | null;
  is_active: boolean;
}

interface Zone {
  id: string;
  name: string;
  code: string;
  area_type: string;
  area_group_id: string | null;
  is_blocked: boolean;
  capacity_kg: number | null;
}

export default function ZonesSettingsPage() {
  const { currentParkId } = useCurrentPark();
  const [groups, setGroups] = useState<AreaGroup[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AreaGroup | null>(null);
  const [formData, setFormData] = useState({ name: "", code: "", description: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async function load() {
    if (!currentParkId) return;
    const supabase = createClient();
    const [{ data: grps }, { data: zns }] = await Promise.all([
      supabase.from("area_groups").select("*").eq("park_id", currentParkId).eq("is_active", true).order("name"),
      supabase.from("storage_areas").select("id, name, code, area_type, area_group_id, is_blocked, capacity_kg").eq("park_id", currentParkId).eq("is_active", true).order("code"),
    ]);
    if (grps) setGroups(grps);
    if (zns) setZones(zns as Zone[]);
  }, [currentParkId]);

  useEffect(() => { load(); }, [load]);

  async function handleSaveGroup() {
    if (!currentParkId || !formData.name || !formData.code) return;
    setSaving(true);
    try {
      if (editingGroup) {
        await updateAreaGroup(editingGroup.id, { name: formData.name, code: formData.code, description: formData.description || undefined });
        toast.success("Grupo atualizado");
      } else {
        await createAreaGroup({ park_id: currentParkId, name: formData.name, code: formData.code, description: formData.description || undefined });
        toast.success("Grupo criado");
      }
      setShowGroupForm(false);
      setEditingGroup(null);
      setFormData({ name: "", code: "", description: "" });
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteGroup(id: string) {
    if (!confirm("Eliminar grupo? As zonas associadas serão desvinculadas.")) return;
    try {
      await deleteAreaGroup(id);
      toast.success("Grupo eliminado");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao eliminar");
    }
  }

  async function handleAssignZone(zoneId: string, groupId: string | null) {
    try {
      await assignZoneToGroup(zoneId, groupId);
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao associar zona");
    }
  }

  function startEdit(g: AreaGroup) {
    setEditingGroup(g);
    setFormData({ name: g.name, code: g.code, description: g.description || "" });
    setShowGroupForm(true);
  }

  const ungroupedZones = zones.filter((z) => !z.area_group_id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Grupos e Zonas</h2>
          <p className="text-sm text-muted-foreground">Organize as zonas do parque em grupos lógicos para gestão de lotes</p>
        </div>
        <button
          onClick={() => { setShowGroupForm(true); setEditingGroup(null); setFormData({ name: "", code: "", description: "" }); }}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" /> Novo Grupo
        </button>
      </div>

      {/* Group form */}
      {showGroupForm && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-4">
          <h3 className="font-medium">{editingGroup ? "Editar Grupo" : "Novo Grupo de Áreas"}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Nome *</label>
              <input
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                placeholder="ex: Armazém Norte"
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Código *</label>
              <input
                value={formData.code}
                onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                placeholder="ex: ARM-N"
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">Descrição</label>
              <input
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                placeholder="Descrição opcional"
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSaveGroup} disabled={saving} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50">
              {saving ? "A guardar..." : "Guardar"}
            </button>
            <button onClick={() => { setShowGroupForm(false); setEditingGroup(null); }} className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Groups with zones */}
      <div className="space-y-4">
        {groups.map((group) => {
          const groupZones = zones.filter((z) => z.area_group_id === group.id);
          return (
            <div key={group.id} className="rounded-lg border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-3">
                  <Layers3 className="h-4 w-4 text-primary" />
                  <div>
                    <span className="font-medium">{group.name}</span>
                    <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs font-mono">{group.code}</span>
                    {group.description && <span className="ml-2 text-sm text-muted-foreground">{group.description}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => startEdit(group)} className="rounded p-1.5 hover:bg-accent">
                    <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  <button onClick={() => handleDeleteGroup(group.id)} className="rounded p-1.5 hover:bg-destructive-surface">
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </button>
                </div>
              </div>
              <div className="p-3">
                {groupZones.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic py-2 px-1">Nenhuma zona associada</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {groupZones.map((zone) => (
                      <div key={zone.id} className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Warehouse className="h-3.5 w-3.5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{zone.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{zone.code}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAssignZone(zone.id, null)}
                          title="Remover do grupo"
                          className="rounded p-1 hover:bg-destructive-surface text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {/* Assign ungrouped zones to this group */}
                {ungroupedZones.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {ungroupedZones.map((z) => (
                      <button
                        key={z.id}
                        onClick={() => handleAssignZone(z.id, group.id)}
                        className="inline-flex items-center gap-1 rounded border border-dashed border-border px-2 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary"
                      >
                        <LinkIcon className="h-3 w-3" /> {z.code}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Ungrouped zones */}
        {ungroupedZones.length > 0 && (
          <div className="rounded-lg border border-dashed border-border bg-muted/30">
            <div className="border-b border-border px-4 py-3">
              <span className="text-sm font-medium text-muted-foreground">Zonas sem grupo</span>
            </div>
            <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3">
              {ungroupedZones.map((zone) => (
                <div key={zone.id} className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
                  <Warehouse className="h-3.5 w-3.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{zone.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{zone.code}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {groups.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-12 text-center">
            <Layers3 className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Nenhum grupo criado. Crie grupos para organizar as zonas do parque.</p>
          </div>
        )}
      </div>
    </div>
  );
}
