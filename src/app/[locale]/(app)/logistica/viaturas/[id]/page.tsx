"use client";

import { use, useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateViatura, updateViaturaStatus, logMaintenance } from "@/actions/logistics/vehicles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowLeft,
  Truck,
  Wrench,
  CheckCircle,
  XCircle,
  Pencil,
  X,
} from "lucide-react";
import type { VehicleStatus, VehicleType } from "@/types/enums";

type Viatura = {
  id: string;
  matricula: string;
  marca: string | null;
  modelo: string | null;
  tipo: VehicleType;
  capacidade_kg: number;
  capacidade_m3: number | null;
  status: VehicleStatus;
  notas: string | null;
  is_active: boolean;
};

type RotaResumida = {
  id: string;
  numero_rota: string;
  data_rota: string;
  status: string;
};

const STATUS_CONFIG: Record<
  VehicleStatus,
  { label: string; className: string }
> = {
  available: {
    label: "Disponível",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  on_route: {
    label: "Em Rota",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  in_maintenance: {
    label: "Manutenção",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  inactive: {
    label: "Inativa",
    className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  },
};

const TIPO_LABELS: Record<string, string> = {
  open_body: "Caixa Aberta",
  container: "Contentor",
  compactor: "Compactador",
  tank: "Cisterna",
  flatbed: "Plataforma",
  other: "Outro",
};

const TIPOS: { value: VehicleType; label: string }[] = [
  { value: "open_body", label: "Caixa Aberta" },
  { value: "container", label: "Contentor" },
  { value: "compactor", label: "Compactador" },
  { value: "tank", label: "Cisterna" },
  { value: "flatbed", label: "Plataforma" },
  { value: "other", label: "Outro" },
];

const ROTA_STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  confirmed: "Confirmada",
  on_execution: "Em Execução",
  completed: "Concluída",
};

export default function ViaturaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [viatura, setViatura] = useState<Viatura | null>(null);
  const [rotas, setRotas] = useState<RotaResumida[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showMaintenance, setShowMaintenance] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState({
    matricula: "",
    marca: "",
    modelo: "",
    tipo: "open_body" as VehicleType,
    capacidade_kg: "",
    capacidade_m3: "",
    notas: "",
  });

  const [maintenanceForm, setMaintenanceForm] = useState({
    tipo: "scheduled" as "scheduled" | "corrective" | "inspection",
    descricao: "",
    data_agendada: "",
    custo: "",
    realizado_por: "",
    notas: "",
  });

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("viaturas")
      .select("id, matricula, marca, modelo, tipo, capacidade_kg, capacidade_m3, status, notas, is_active")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (!data) { setLoading(false); return; }
        setViatura(data as unknown as Viatura);
        setForm({
          matricula: data.matricula,
          marca: data.marca ?? "",
          modelo: data.modelo ?? "",
          tipo: data.tipo as VehicleType,
          capacidade_kg: String(data.capacidade_kg),
          capacidade_m3: data.capacidade_m3 ? String(data.capacidade_m3) : "",
          notas: data.notas ?? "",
        });
        setLoading(false);
      });

    supabase
      .from("rotas")
      .select("id, numero_rota, data_rota, status")
      .eq("viatura_id", id)
      .order("data_rota", { ascending: false })
      .limit(10)
      .then(({ data }) => setRotas((data as RotaResumida[]) ?? []));
  }, [id]);

  const handleSave = () => {
    startTransition(async () => {
      try {
        await updateViatura(id, {
          matricula: form.matricula,
          marca: form.marca || undefined,
          modelo: form.modelo || undefined,
          tipo: form.tipo,
          capacidade_kg: parseFloat(form.capacidade_kg),
          capacidade_m3: form.capacidade_m3 ? parseFloat(form.capacidade_m3) : undefined,
          notas: form.notas || undefined,
        });
        setViatura((v) =>
          v
            ? {
                ...v,
                matricula: form.matricula,
                marca: form.marca || null,
                modelo: form.modelo || null,
                tipo: form.tipo,
                capacidade_kg: parseFloat(form.capacidade_kg),
                capacidade_m3: form.capacidade_m3 ? parseFloat(form.capacidade_m3) : null,
                notas: form.notas || null,
              }
            : v
        );
        setEditing(false);
        toast.success("Viatura atualizada");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao guardar");
      }
    });
  };

  const handleStatusChange = (status: VehicleStatus) => {
    startTransition(async () => {
      try {
        await updateViaturaStatus(id, status);
        setViatura((v) => (v ? { ...v, status } : v));
        toast.success("Estado atualizado");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao atualizar estado");
      }
    });
  };

  const handleMaintenance = () => {
    startTransition(async () => {
      try {
        await logMaintenance({
          viatura_id: id,
          tipo: maintenanceForm.tipo,
          descricao: maintenanceForm.descricao,
          data_agendada: maintenanceForm.data_agendada || undefined,
          custo: maintenanceForm.custo ? parseFloat(maintenanceForm.custo) : undefined,
          realizado_por: maintenanceForm.realizado_por || undefined,
          notas: maintenanceForm.notas || undefined,
        });
        setViatura((v) => (v ? { ...v, status: "in_maintenance" } : v));
        setShowMaintenance(false);
        setMaintenanceForm({ tipo: "scheduled", descricao: "", data_agendada: "", custo: "", realizado_por: "", notas: "" });
        toast.success("Manutenção registada");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao registar manutenção");
      }
    });
  };

  if (loading)
    return <div className="p-8 text-center text-sm text-muted-foreground">A carregar...</div>;
  if (!viatura)
    return <div className="p-8 text-center text-sm text-muted-foreground">Viatura não encontrada</div>;

  const statusCfg = STATUS_CONFIG[viatura.status];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/logistica/viaturas">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Viaturas
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono text-foreground">
                {viatura.matricula}
              </h1>
              <span
                className={cn(
                  "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                  statusCfg.className
                )}
              >
                {statusCfg.label}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {[viatura.marca, viatura.modelo].filter(Boolean).join(" ") ||
                TIPO_LABELS[viatura.tipo]}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {!editing && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditing(true)}
              className="gap-2"
            >
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
          )}
        </div>
      </div>

      {/* Edit form */}
      {editing && (
        <div className="rounded-lg border border-border bg-card p-6 max-w-lg space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Editar Viatura</h2>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="edit-matricula">Matrícula *</Label>
              <Input
                id="edit-matricula"
                value={form.matricula}
                onChange={(e) => setForm((f) => ({ ...f, matricula: e.target.value.toUpperCase() }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-marca">Marca</Label>
              <Input
                id="edit-marca"
                value={form.marca}
                onChange={(e) => setForm((f) => ({ ...f, marca: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-modelo">Modelo</Label>
              <Input
                id="edit-modelo"
                value={form.modelo}
                onChange={(e) => setForm((f) => ({ ...f, modelo: e.target.value }))}
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="edit-tipo">Tipo</Label>
              <select
                id="edit-tipo"
                value={form.tipo}
                onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as VehicleType }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-cap-kg">Capacidade (kg)</Label>
              <Input
                id="edit-cap-kg"
                type="number"
                min="0"
                step="100"
                value={form.capacidade_kg}
                onChange={(e) => setForm((f) => ({ ...f, capacidade_kg: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-cap-m3">Volume (m³)</Label>
              <Input
                id="edit-cap-m3"
                type="number"
                min="0"
                step="0.5"
                value={form.capacidade_m3}
                onChange={(e) => setForm((f) => ({ ...f, capacidade_m3: e.target.value }))}
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="edit-notas">Notas</Label>
              <Input
                id="edit-notas"
                value={form.notas}
                onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? "A guardar..." : "Guardar"}
            </Button>
            <Button variant="outline" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Info cards */}
      {!editing && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Truck className="h-4 w-4" />
              Identificação
            </div>
            <p className="font-medium text-foreground">{TIPO_LABELS[viatura.tipo]}</p>
            {viatura.marca && (
              <p className="text-sm text-muted-foreground">{viatura.marca}</p>
            )}
            {viatura.modelo && (
              <p className="text-sm text-muted-foreground">{viatura.modelo}</p>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <p className="mb-2 text-sm font-medium text-muted-foreground">Capacidade</p>
            <p className="text-2xl font-bold text-foreground">
              {(viatura.capacidade_kg / 1000).toFixed(1)}{" "}
              <span className="text-base font-normal text-muted-foreground">t</span>
            </p>
            {viatura.capacidade_m3 && (
              <p className="text-sm text-muted-foreground">
                {viatura.capacidade_m3} m³
              </p>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <p className="mb-2 text-sm font-medium text-muted-foreground">Estado</p>
            <span
              className={cn(
                "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                statusCfg.className
              )}
            >
              {statusCfg.label}
            </span>

            <div className="mt-3 flex flex-wrap gap-2">
              {viatura.status !== "available" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange("available")}
                  disabled={isPending}
                  className="gap-1"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Disponível
                </Button>
              )}
              {viatura.status !== "in_maintenance" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowMaintenance(true)}
                  disabled={isPending}
                  className="gap-1"
                >
                  <Wrench className="h-3.5 w-3.5" />
                  Manutenção
                </Button>
              )}
              {viatura.status !== "inactive" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange("inactive")}
                  disabled={isPending}
                  className="gap-1 text-muted-foreground"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Inativa
                </Button>
              )}
            </div>
          </div>

          {viatura.notas && (
            <div className="rounded-lg border border-border bg-card p-4 sm:col-span-2">
              <p className="mb-1 text-xs font-medium text-muted-foreground">Notas</p>
              <p className="text-sm text-foreground">{viatura.notas}</p>
            </div>
          )}
        </div>
      )}

      {/* Maintenance form */}
      {showMaintenance && (
        <div className="rounded-lg border border-border bg-card p-6 max-w-lg space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Registar Manutenção</h2>
            <Button size="sm" variant="ghost" onClick={() => setShowMaintenance(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="maint-tipo">Tipo</Label>
              <select
                id="maint-tipo"
                value={maintenanceForm.tipo}
                onChange={(e) =>
                  setMaintenanceForm((f) => ({
                    ...f,
                    tipo: e.target.value as "scheduled" | "corrective" | "inspection",
                  }))
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="scheduled">Programada</option>
                <option value="corrective">Corretiva</option>
                <option value="inspection">Inspeção</option>
              </select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="maint-desc">Descrição *</Label>
              <Input
                id="maint-desc"
                value={maintenanceForm.descricao}
                onChange={(e) => setMaintenanceForm((f) => ({ ...f, descricao: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="maint-data">Data Agendada</Label>
              <Input
                id="maint-data"
                type="date"
                value={maintenanceForm.data_agendada}
                onChange={(e) => setMaintenanceForm((f) => ({ ...f, data_agendada: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="maint-custo">Custo (€)</Label>
              <Input
                id="maint-custo"
                type="number"
                min="0"
                step="0.01"
                value={maintenanceForm.custo}
                onChange={(e) => setMaintenanceForm((f) => ({ ...f, custo: e.target.value }))}
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="maint-realizado">Realizado Por</Label>
              <Input
                id="maint-realizado"
                value={maintenanceForm.realizado_por}
                onChange={(e) => setMaintenanceForm((f) => ({ ...f, realizado_por: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleMaintenance}
              disabled={isPending || !maintenanceForm.descricao}
            >
              {isPending ? "A registar..." : "Registar"}
            </Button>
            <Button variant="outline" onClick={() => setShowMaintenance(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Recent routes */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Rotas Recentes</h2>
        {rotas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem rotas registadas para esta viatura.</p>
        ) : (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Rota</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Data</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Estado</th>
                </tr>
              </thead>
              <tbody>
                {rotas.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-accent/30">
                    <td className="px-4 py-3">
                      <Link
                        href={`/logistica/rotas/${r.id}`}
                        className="font-mono font-medium text-primary hover:underline"
                      >
                        {r.numero_rota}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(r.data_rota).toLocaleDateString("pt-PT")}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {ROTA_STATUS_LABELS[r.status] ?? r.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
