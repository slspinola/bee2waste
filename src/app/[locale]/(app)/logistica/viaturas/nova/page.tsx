"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { useCurrentPark } from "@/hooks/use-current-park";
import { createViatura } from "@/actions/logistics/vehicles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { VehicleType } from "@/types/enums";

const TIPOS: { value: VehicleType; label: string }[] = [
  { value: "open_body", label: "Caixa Aberta" },
  { value: "container", label: "Contentor" },
  { value: "compactor", label: "Compactador" },
  { value: "tank", label: "Cisterna" },
  { value: "flatbed", label: "Plataforma" },
  { value: "other", label: "Outro" },
];

export default function NovaViaturaPage() {
  const router = useRouter();
  const { currentParkId } = useCurrentPark();
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentParkId) {
      toast.error("Selecione um parque primeiro");
      return;
    }
    startTransition(async () => {
      try {
        await createViatura({
          park_id: currentParkId,
          matricula: form.matricula,
          marca: form.marca || undefined,
          modelo: form.modelo || undefined,
          tipo: form.tipo,
          capacidade_kg: parseFloat(form.capacidade_kg),
          capacidade_m3: form.capacidade_m3
            ? parseFloat(form.capacidade_m3)
            : undefined,
          notas: form.notas || undefined,
          ler_autorizados: [],
        });
        toast.success("Viatura registada com sucesso");
        router.push("/logistica/viaturas");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Erro ao registar viatura"
        );
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/logistica/viaturas">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Registar Viatura
          </h1>
          <p className="text-sm text-muted-foreground">
            Adicionar nova viatura à frota
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="max-w-lg space-y-6 rounded-lg border border-border bg-card p-6"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="matricula">Matrícula *</Label>
            <Input
              id="matricula"
              placeholder="00-AA-00"
              value={form.matricula}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  matricula: e.target.value.toUpperCase(),
                }))
              }
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="marca">Marca</Label>
            <Input
              id="marca"
              placeholder="Mercedes"
              value={form.marca}
              onChange={(e) =>
                setForm((f) => ({ ...f, marca: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="modelo">Modelo</Label>
            <Input
              id="modelo"
              placeholder="Actros"
              value={form.modelo}
              onChange={(e) =>
                setForm((f) => ({ ...f, modelo: e.target.value }))
              }
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="tipo">Tipo de Viatura *</Label>
            <select
              id="tipo"
              value={form.tipo}
              onChange={(e) =>
                setForm((f) => ({ ...f, tipo: e.target.value as VehicleType }))
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="capacidade_kg">Capacidade (kg) *</Label>
            <Input
              id="capacidade_kg"
              type="number"
              min="0"
              step="100"
              placeholder="15000"
              value={form.capacidade_kg}
              onChange={(e) =>
                setForm((f) => ({ ...f, capacidade_kg: e.target.value }))
              }
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="capacidade_m3">Volume (m³)</Label>
            <Input
              id="capacidade_m3"
              type="number"
              min="0"
              step="0.5"
              placeholder="25"
              value={form.capacidade_m3}
              onChange={(e) =>
                setForm((f) => ({ ...f, capacidade_m3: e.target.value }))
              }
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="notas">Notas</Label>
            <Input
              id="notas"
              placeholder="Observações..."
              value={form.notas}
              onChange={(e) =>
                setForm((f) => ({ ...f, notas: e.target.value }))
              }
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={isPending}>
            {isPending ? "A guardar..." : "Registar Viatura"}
          </Button>
          <Link href="/logistica/viaturas">
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
