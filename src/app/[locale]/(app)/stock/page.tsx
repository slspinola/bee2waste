"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCurrentPark } from "@/hooks/use-current-park";
import { Link } from "@/i18n/navigation";
import { Search, Package, ArrowRightLeft, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";

interface StockByArea {
  area_id: string;
  area_code: string;
  area_name: string;
  area_capacity_kg: number | null;
  total_kg: number;
  ler_count: number;
  last_movement_at: string | null;
}

interface RecentMovement {
  id: string;
  movement_type: string;
  ler_code: string;
  quantity_kg: number;
  created_at: string;
  area_code: string;
  area_name: string;
}

const MOVEMENT_LABELS: Record<string, { label: string; color: string }> = {
  entry: { label: "Entrada", color: "text-success" },
  exit: { label: "Saída", color: "text-destructive" },
  transfer_in: { label: "Transf. Entrada", color: "text-blue-600" },
  transfer_out: { label: "Transf. Saída", color: "text-amber-600" },
  classification_in: { label: "Class. Entrada", color: "text-blue-600" },
  classification_out: { label: "Class. Saída", color: "text-amber-600" },
  adjustment: { label: "Ajuste", color: "text-muted-foreground" },
};

export default function StockPage() {
  const t = useTranslations("stock");
  const tc = useTranslations("common");
  const { currentParkId } = useCurrentPark();
  const [stockByArea, setStockByArea] = useState<StockByArea[]>([]);
  const [movements, setMovements] = useState<RecentMovement[]>([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"areas" | "movements">("areas");

  useEffect(() => {
    async function fetchStock() {
      if (!currentParkId) return;
      const supabase = createClient();

      // Aggregate stock by area from stock_movements
      const { data: movData } = await supabase
        .from("stock_movements")
        .select("area_id, ler_code, quantity_kg, created_at, storage_areas:area_id(code, name, capacity_kg)")
        .eq("park_id", currentParkId)
        .order("created_at", { ascending: false }) as { data: Array<{
          area_id: string;
          ler_code: string;
          quantity_kg: number;
          created_at: string;
          storage_areas: { code: string; name: string; capacity_kg: number | null } | null;
        }> | null };

      if (movData) {
        // Group by area
        const areaMap = new Map<string, StockByArea>();
        const lerSets = new Map<string, Set<string>>();

        for (const m of movData) {
          const existing = areaMap.get(m.area_id);
          if (!existing) {
            areaMap.set(m.area_id, {
              area_id: m.area_id,
              area_code: m.storage_areas?.code || "",
              area_name: m.storage_areas?.name || "",
              area_capacity_kg: m.storage_areas?.capacity_kg || null,
              total_kg: m.quantity_kg,
              ler_count: 0,
              last_movement_at: m.created_at,
            });
            lerSets.set(m.area_id, new Set([m.ler_code]));
          } else {
            existing.total_kg += m.quantity_kg;
            lerSets.get(m.area_id)!.add(m.ler_code);
            if (!existing.last_movement_at || m.created_at > existing.last_movement_at) {
              existing.last_movement_at = m.created_at;
            }
          }
        }

        for (const [areaId, area] of areaMap) {
          area.ler_count = lerSets.get(areaId)?.size || 0;
        }

        setStockByArea(
          Array.from(areaMap.values()).sort((a, b) => a.area_code.localeCompare(b.area_code))
        );
      }

      // Recent movements
      const { data: recentData } = await supabase
        .from("stock_movements")
        .select("id, movement_type, ler_code, quantity_kg, created_at, storage_areas:area_id(code, name)")
        .eq("park_id", currentParkId)
        .order("created_at", { ascending: false })
        .limit(50) as { data: Array<{
          id: string;
          movement_type: string;
          ler_code: string;
          quantity_kg: number;
          created_at: string;
          storage_areas: { code: string; name: string } | null;
        }> | null };

      if (recentData) {
        setMovements(recentData.map((m) => ({
          ...m,
          area_code: m.storage_areas?.code || "",
          area_name: m.storage_areas?.name || "",
        })));
      }
    }
    fetchStock();
  }, [currentParkId]);

  const totalStock = stockByArea.reduce((sum, a) => sum + a.total_kg, 0);
  const areasWithStock = stockByArea.filter((a) => a.total_kg > 0).length;
  const nearCapacity = stockByArea.filter(
    (a) => a.area_capacity_kg && a.total_kg / a.area_capacity_kg > 0.85
  );

  const filteredAreas = stockByArea.filter(
    (a) =>
      !search ||
      a.area_code.toLowerCase().includes(search.toLowerCase()) ||
      a.area_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("overview")}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">{t("currentStock")}</p>
          <p className="text-2xl font-bold font-mono">{totalStock.toLocaleString("pt-PT")} kg</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Áreas com Stock</p>
          <p className="text-2xl font-bold">{areasWithStock}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">{t("movements")}</p>
          <p className="text-2xl font-bold">{movements.length}</p>
        </div>
      </div>

      {/* Capacity warnings */}
      {nearCapacity.length > 0 && (
        <div className="rounded-lg border border-warning bg-warning-surface p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-warning">
            <AlertTriangle className="h-4 w-4" />
            {nearCapacity.length} área(s) perto da capacidade máxima
          </div>
          <ul className="mt-2 space-y-1 text-sm text-warning">
            {nearCapacity.map((a) => (
              <li key={a.area_id}>
                <strong>{a.area_code}</strong> — {a.total_kg.toLocaleString("pt-PT")} /{" "}
                {a.area_capacity_kg!.toLocaleString("pt-PT")} kg (
                {Math.round((a.total_kg / a.area_capacity_kg!) * 100)}%)
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {[
          { id: "areas" as const, label: t("byArea"), icon: Package },
          { id: "movements" as const, label: t("movements"), icon: ArrowRightLeft },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`${tc("search")}...`}
          className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm"
        />
      </div>

      {activeTab === "areas" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAreas.map((area) => {
            const capacityPct = area.area_capacity_kg
              ? Math.min((area.total_kg / area.area_capacity_kg) * 100, 100)
              : null;

            return (
              <Link
                key={area.area_id}
                href={`/stock/areas/${area.area_id}`}
                className="rounded-lg border border-border bg-card p-5 space-y-3 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium">
                      {area.area_code}
                    </span>
                    <p className="mt-1 text-sm font-medium">{area.area_name}</p>
                  </div>
                  <Package className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-lg font-bold font-mono">
                    {area.total_kg.toLocaleString("pt-PT")} kg
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {area.ler_count} código(s) LER
                  </p>
                </div>
                {capacityPct !== null && (
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{t("capacity")}</span>
                      <span>{Math.round(capacityPct)}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          capacityPct > 85
                            ? "bg-destructive"
                            : capacityPct > 60
                            ? "bg-warning"
                            : "bg-success"
                        }`}
                        style={{ width: `${capacityPct}%` }}
                      />
                    </div>
                  </div>
                )}
                {area.last_movement_at && (
                  <p className="text-xs text-muted-foreground">
                    {t("lastMovement")}: {new Date(area.last_movement_at).toLocaleDateString("pt-PT")}
                  </p>
                )}
              </Link>
            );
          })}
          {filteredAreas.length === 0 && (
            <div className="col-span-full py-12 text-center text-sm text-muted-foreground">
              {tc("noResults")}
            </div>
          )}
        </div>
      )}

      {activeTab === "movements" && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Tipo</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Área</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Código LER</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Quantidade</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Data</th>
              </tr>
            </thead>
            <tbody>
              {movements
                .filter(
                  (m) =>
                    !search ||
                    m.area_code.toLowerCase().includes(search.toLowerCase()) ||
                    m.ler_code.toLowerCase().includes(search.toLowerCase())
                )
                .map((m) => {
                  const cfg = MOVEMENT_LABELS[m.movement_type] || {
                    label: m.movement_type,
                    color: "text-foreground",
                  };
                  const isPositive = m.quantity_kg > 0;
                  return (
                    <tr key={m.id} className="border-b border-border last:border-0 hover:bg-accent/50">
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex items-center gap-1.5 ${cfg.color}`}>
                          {isPositive ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium mr-1.5">
                          {m.area_code}
                        </span>
                        {m.area_name}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono">{m.ler_code}</td>
                      <td className={`px-4 py-3 text-right text-sm font-mono ${isPositive ? "text-success" : "text-destructive"}`}>
                        {isPositive ? "+" : ""}
                        {m.quantity_kg.toLocaleString("pt-PT")} kg
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {new Date(m.created_at).toLocaleString("pt-PT")}
                      </td>
                    </tr>
                  );
                })}
              {movements.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    {tc("noResults")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
