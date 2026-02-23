"use client";

import { useEffect, useState, useTransition } from "react";
import { useCurrentPark } from "@/hooks/use-current-park";
import { createClient } from "@/lib/supabase/client";
import { updateViaturaStatus } from "@/actions/logistics/vehicles";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Plus, Truck, Wrench, CheckCircle, XCircle } from "lucide-react";
import type { VehicleStatus } from "@/types/enums";

type Viatura = {
  id: string;
  matricula: string;
  marca: string | null;
  modelo: string | null;
  tipo: string;
  capacidade_kg: number;
  status: VehicleStatus;
};

const STATUS_CONFIG: Record<
  VehicleStatus,
  {
    label: string;
    className: string;
    iconClassName: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  available: {
    label: "Disponível",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    iconClassName: "text-green-600",
    icon: CheckCircle,
  },
  on_route: {
    label: "Em Rota",
    className:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    iconClassName: "text-blue-600",
    icon: Truck,
  },
  in_maintenance: {
    label: "Manutenção",
    className:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    iconClassName: "text-yellow-600",
    icon: Wrench,
  },
  inactive: {
    label: "Inativa",
    className:
      "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    iconClassName: "text-gray-400",
    icon: XCircle,
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

export default function VeiculosPage() {
  const { currentParkId } = useCurrentPark();
  const [viaturas, setViaturas] = useState<Viatura[]>([]);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!currentParkId) return;
    const supabase = createClient();
    supabase
      .from("viaturas")
      .select("id, matricula, marca, modelo, tipo, capacidade_kg, status")
      .eq("park_id", currentParkId)
      .eq("is_active", true)
      .order("matricula")
      .then(({ data }) => {
        setViaturas((data as Viatura[]) ?? []);
        setLoading(false);
      });
  }, [currentParkId]);

  const handleStatusChange = (id: string, status: VehicleStatus) => {
    startTransition(async () => {
      await updateViaturaStatus(id, status);
      setViaturas((prev) =>
        prev.map((v) => (v.id === id ? { ...v, status } : v))
      );
    });
  };

  const counts: Record<VehicleStatus, number> = {
    available: viaturas.filter((v) => v.status === "available").length,
    on_route: viaturas.filter((v) => v.status === "on_route").length,
    in_maintenance: viaturas.filter((v) => v.status === "in_maintenance")
      .length,
    inactive: viaturas.filter((v) => v.status === "inactive").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Viaturas</h1>
          <p className="text-sm text-muted-foreground">
            Gestão da frota de viaturas
          </p>
        </div>
        <Link href="/logistica/viaturas/nova">
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Registar Viatura
          </Button>
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            "available",
            "on_route",
            "in_maintenance",
            "inactive",
          ] as VehicleStatus[]
        ).map((status) => {
          const cfg = STATUS_CONFIG[status];
          const Icon = cfg.icon;
          return (
            <div
              key={status}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="flex items-center gap-2">
                <Icon className={cn("h-4 w-4", cfg.iconClassName)} />
                <span className="text-xs text-muted-foreground">
                  {cfg.label}
                </span>
              </div>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {counts[status]}
              </p>
            </div>
          );
        })}
      </div>

      {/* Vehicle table */}
      <div className="rounded-lg border border-border bg-card">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            A carregar...
          </div>
        ) : viaturas.length === 0 ? (
          <div className="p-8 text-center">
            <Truck className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              Nenhuma viatura registada
            </p>
            <Link href="/logistica/viaturas/nova">
              <Button size="sm" variant="outline" className="mt-4">
                Registar primeira viatura
              </Button>
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Matrícula
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Tipo
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Capacidade
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Estado
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Ação
                </th>
              </tr>
            </thead>
            <tbody>
              {viaturas.map((v) => {
                const cfg = STATUS_CONFIG[v.status];
                return (
                  <tr
                    key={v.id}
                    className="border-b border-border last:border-0 hover:bg-accent/30"
                  >
                    <td className="px-4 py-3">
                      <div className="font-mono font-medium text-foreground">
                        {v.matricula}
                      </div>
                      {(v.marca || v.modelo) && (
                        <div className="text-xs text-muted-foreground">
                          {[v.marca, v.modelo].filter(Boolean).join(" ")}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {TIPO_LABELS[v.tipo] ?? v.tipo}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {(v.capacidade_kg / 1000).toFixed(1)} t
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                          cfg.className
                        )}
                      >
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link href={`/logistica/viaturas/${v.id}`}>
                          <Button size="sm" variant="outline">
                            Ver
                          </Button>
                        </Link>
                        {v.status === "in_maintenance" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleStatusChange(v.id, "available")
                            }
                          >
                            Disponível
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
