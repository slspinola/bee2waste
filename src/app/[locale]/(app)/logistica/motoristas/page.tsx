"use client";

import { useEffect, useState } from "react";
import { useCurrentPark } from "@/hooks/use-current-park";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Plus, UserCheck, Phone } from "lucide-react";

type Motorista = {
  id: string;
  nome: string;
  telefone: string | null;
  numero_licenca: string | null;
  categorias_licenca: string[];
  adr_certificado: boolean;
  turno_inicio: string | null;
  turno_fim: string | null;
  is_active: boolean;
  viaturas: { matricula: string } | null;
};

export default function MotoristasPage() {
  const { currentParkId } = useCurrentPark();
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentParkId) return;
    const supabase = createClient();
    supabase
      .from("motoristas")
      .select(
        "id, nome, telefone, numero_licenca, categorias_licenca, adr_certificado, turno_inicio, turno_fim, is_active, viaturas:viatura_default_id(matricula)"
      )
      .eq("park_id", currentParkId)
      .order("nome")
      .then(({ data }) => {
        setMotoristas((data as unknown as Motorista[]) ?? []);
        setLoading(false);
      });
  }, [currentParkId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Motoristas</h1>
          <p className="text-sm text-muted-foreground">
            Gestão de motoristas e turnos
          </p>
        </div>
        <Link href="/logistica/motoristas/novo">
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Adicionar Motorista
          </Button>
        </Link>
      </div>

      <div className="rounded-lg border border-border bg-card">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            A carregar...
          </div>
        ) : motoristas.length === 0 ? (
          <div className="p-8 text-center">
            <UserCheck className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              Nenhum motorista registado
            </p>
            <Link href="/logistica/motoristas/novo">
              <Button size="sm" variant="outline" className="mt-4">
                Adicionar primeiro motorista
              </Button>
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Nome
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Licença
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Viatura
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Turno
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Estado
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {motoristas.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-border last:border-0 hover:bg-accent/30"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{m.nome}</div>
                    {m.telefone && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {m.telefone}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-muted-foreground">
                      {m.numero_licenca ?? "—"}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {m.categorias_licenca?.map((c) => (
                        <span
                          key={c}
                          className="rounded bg-muted px-1 py-0.5 text-xs font-mono"
                        >
                          {c}
                        </span>
                      ))}
                      {m.adr_certificado && (
                        <span className="rounded bg-orange-100 px-1 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                          ADR
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">
                    {m.viaturas?.matricula ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {m.turno_inicio && m.turno_fim
                      ? `${m.turno_inicio.slice(0, 5)} – ${m.turno_fim.slice(0, 5)}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                        m.is_active
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      )}
                    >
                      {m.is_active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/logistica/motoristas/${m.id}`}>
                      <Button size="sm" variant="outline">
                        Ver
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
