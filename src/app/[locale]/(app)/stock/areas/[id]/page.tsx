"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";

interface AreaInfo {
  id: string;
  code: string;
  name: string;
  area_type: string;
  capacity_kg: number | null;
  is_active: boolean;
}

interface StockByLer {
  ler_code: string;
  total_kg: number;
  last_movement_at: string;
}

interface Movement {
  id: string;
  movement_type: string;
  ler_code: string;
  quantity_kg: number;
  balance_after_kg: number;
  notes: string | null;
  created_at: string;
}

const MOVEMENT_LABELS: Record<string, string> = {
  entry: "Entrada",
  exit: "Saída",
  transfer_in: "Transf. Entrada",
  transfer_out: "Transf. Saída",
  classification_in: "Class. Entrada",
  classification_out: "Class. Saída",
  adjustment: "Ajuste",
};

export default function AreaStockDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations("stock");
  const [area, setArea] = useState<AreaInfo | null>(null);
  const [stockByLer, setStockByLer] = useState<StockByLer[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();

      const { data: areaData } = await supabase
        .from("storage_areas")
        .select("id, code, name, area_type, capacity_kg, is_active")
        .eq("id", id)
        .single() as { data: AreaInfo | null };
      if (areaData) setArea(areaData);

      const { data: movData } = await supabase
        .from("stock_movements")
        .select("id, movement_type, ler_code, quantity_kg, balance_after_kg, notes, created_at")
        .eq("area_id", id)
        .order("created_at", { ascending: false })
        .limit(100) as { data: Movement[] | null };

      if (movData) {
        setMovements(movData);

        // Aggregate by LER code
        const lerMap = new Map<string, StockByLer>();
        for (const m of movData) {
          const existing = lerMap.get(m.ler_code);
          if (!existing) {
            lerMap.set(m.ler_code, {
              ler_code: m.ler_code,
              total_kg: m.quantity_kg,
              last_movement_at: m.created_at,
            });
          } else {
            existing.total_kg += m.quantity_kg;
            if (m.created_at > existing.last_movement_at) {
              existing.last_movement_at = m.created_at;
            }
          }
        }
        setStockByLer(
          Array.from(lerMap.values()).sort((a, b) => b.total_kg - a.total_kg)
        );
      }

      setIsLoading(false);
    }
    fetchData();
  }, [id]);

  if (isLoading || !area) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 rounded bg-muted" />
        <div className="h-64 rounded-lg bg-muted" />
      </div>
    );
  }

  const totalStock = stockByLer.reduce((sum, s) => sum + s.total_kg, 0);
  const capacityPct = area.capacity_kg
    ? Math.min((totalStock / area.capacity_kg) * 100, 100)
    : null;

  return (
    <div className="space-y-6">
      <Link
        href="/stock"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {t("title")}
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="rounded bg-muted px-2.5 py-1 text-sm font-medium">
              {area.code}
            </span>
            <h1 className="text-xl font-semibold">{area.name}</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground capitalize">
            Tipo: {area.area_type.replace("_", " ")}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-medium ${
          area.is_active
            ? "bg-success-surface text-success"
            : "bg-muted text-muted-foreground"
        }`}>
          {area.is_active ? "Ativa" : "Inativa"}
        </span>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">{t("currentStock")}</p>
          <p className="text-2xl font-bold font-mono">{totalStock.toLocaleString("pt-PT")} kg</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Códigos LER</p>
          <p className="text-2xl font-bold">{stockByLer.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">{t("capacity")}</p>
          {capacityPct !== null ? (
            <div>
              <p className="text-2xl font-bold">{Math.round(capacityPct)}%</p>
              <div className="mt-2 h-2 w-full rounded-full bg-muted">
                <div
                  className={`h-2 rounded-full ${
                    capacityPct > 85
                      ? "bg-destructive"
                      : capacityPct > 60
                      ? "bg-warning"
                      : "bg-success"
                  }`}
                  style={{ width: `${capacityPct}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {totalStock.toLocaleString("pt-PT")} / {area.capacity_kg!.toLocaleString("pt-PT")} kg
              </p>
            </div>
          ) : (
            <p className="text-2xl font-bold text-muted-foreground">—</p>
          )}
        </div>
      </div>

      {/* Stock by LER */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <h3 className="font-semibold">Stock por Código LER</h3>
        {stockByLer.length > 0 ? (
          <div className="rounded-lg border border-border">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Código LER</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">{t("quantity")}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{t("lastMovement")}</th>
                </tr>
              </thead>
              <tbody>
                {stockByLer.map((s) => (
                  <tr key={s.ler_code} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-sm font-mono">{s.ler_code}</td>
                    <td className="px-4 py-3 text-right text-sm font-mono font-medium">
                      {s.total_kg.toLocaleString("pt-PT")} kg
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(s.last_movement_at).toLocaleDateString("pt-PT")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Sem stock nesta área.
          </p>
        )}
      </div>

      {/* Movement History */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <h3 className="font-semibold">Histórico de Movimentos</h3>
        {movements.length > 0 ? (
          <div className="rounded-lg border border-border">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Tipo</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Código LER</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">{t("quantity")}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Data</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => {
                  const isPositive = m.quantity_kg > 0;
                  return (
                    <tr key={m.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 text-sm">
                        <span className="inline-flex items-center gap-1.5">
                          {isPositive ? (
                            <TrendingUp className="h-3 w-3 text-success" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-destructive" />
                          )}
                          {MOVEMENT_LABELS[m.movement_type] || m.movement_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono">{m.ler_code}</td>
                      <td className={`px-4 py-3 text-right text-sm font-mono ${isPositive ? "text-success" : "text-destructive"}`}>
                        {isPositive ? "+" : ""}{m.quantity_kg.toLocaleString("pt-PT")} kg
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {new Date(m.created_at).toLocaleString("pt-PT")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Sem movimentos registados.
          </p>
        )}
      </div>
    </div>
  );
}
