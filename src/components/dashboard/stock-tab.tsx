"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { upsertMarketPrice } from "@/actions/market-prices";
import { TrendingUp, TrendingDown, Minus, Plus, X, DollarSign } from "lucide-react";

interface StockRow {
  ler_code: string;
  stock_kg: number;
  price_per_ton: number | null;
  prev_price: number | null;
  effective_date: string | null;
  product_type: string | null;
}

interface TotalCard {
  total_kg: number;
  total_eur: number;
}

export function StockTab({ parkId }: { parkId: string }) {
  const [rows, setRows] = useState<StockRow[]>([]);
  const [total, setTotal] = useState<TotalCard>({ total_kg: 0, total_eur: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    ler_code: "",
    product_type: "",
    price_per_ton: "",
    effective_date: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    const supabase = createClient();

    const [{ data: stockData }, { data: pricesData }] = await Promise.all([
      supabase
        .from("stock_movements")
        .select("ler_code, quantity_kg")
        .eq("park_id", parkId) as unknown as Promise<{
        data: { ler_code: string; quantity_kg: number }[] | null;
      }>,
      supabase
        .from("market_prices")
        .select("ler_code, price_per_ton, effective_date, product_type")
        .eq("park_id", parkId)
        .order("effective_date", {
          ascending: false,
        }) as unknown as Promise<{
        data: {
          ler_code: string;
          price_per_ton: number;
          effective_date: string;
          product_type: string | null;
        }[] | null;
      }>,
    ]);

    // Build stock by LER
    const stockByLer = new Map<string, number>();
    if (stockData) {
      for (const s of stockData) {
        stockByLer.set(s.ler_code, (stockByLer.get(s.ler_code) || 0) + s.quantity_kg);
      }
    }

    // Build latest + prev prices per LER
    const latestPrice = new Map<
      string,
      { price: number; date: string; product_type: string | null }
    >();
    const prevPrice = new Map<string, number>();
    if (pricesData) {
      for (const p of pricesData) {
        if (!latestPrice.has(p.ler_code)) {
          latestPrice.set(p.ler_code, {
            price: p.price_per_ton,
            date: p.effective_date,
            product_type: p.product_type,
          });
        } else if (!prevPrice.has(p.ler_code)) {
          prevPrice.set(p.ler_code, p.price_per_ton);
        }
      }
    }

    // Union of LER codes
    const lerCodes = new Set([
      ...stockByLer.keys(),
      ...latestPrice.keys(),
    ]);

    const result: StockRow[] = [];
    let totalKg = 0;
    let totalEur = 0;

    for (const ler of lerCodes) {
      const kg = stockByLer.get(ler) || 0;
      const info = latestPrice.get(ler);
      const price = info?.price ?? null;
      const prev = prevPrice.get(ler) ?? null;

      if (kg > 0 || price !== null) {
        result.push({
          ler_code: ler,
          stock_kg: kg,
          price_per_ton: price,
          prev_price: prev,
          effective_date: info?.date ?? null,
          product_type: info?.product_type ?? null,
        });
        totalKg += kg;
        if (price !== null) totalEur += (kg / 1000) * price;
      }
    }

    result.sort((a, b) => b.stock_kg - a.stock_kg);
    setRows(result);
    setTotal({ total_kg: totalKg, total_eur: totalEur });
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData(); }, [parkId]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const price = parseFloat(form.price_per_ton);
    if (!form.ler_code.trim() || isNaN(price) || price < 0) {
      setFormError("Preencha código LER e cotação válidos.");
      return;
    }
    startTransition(async () => {
      try {
        await upsertMarketPrice(parkId, {
          ler_code: form.ler_code,
          product_type: form.product_type || undefined,
          price_per_ton: price,
          effective_date: form.effective_date,
          notes: form.notes || undefined,
        });
        setForm({
          ler_code: "",
          product_type: "",
          price_per_ton: "",
          effective_date: new Date().toISOString().split("T")[0],
          notes: "",
        });
        setShowForm(false);
        await loadData();
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Erro ao guardar cotação.");
      }
    });
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-20 rounded-lg bg-muted" />
        <div className="h-64 rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Total card */}
      <div className="rounded-lg border border-border bg-primary-surface p-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Valor Total em Parque</p>
          <p className="text-3xl font-bold font-mono text-primary mt-1">
            {total.total_eur > 0
              ? `€ ${Math.round(total.total_eur).toLocaleString("pt-PT")}`
              : "— (sem cotações)"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {(total.total_kg / 1000).toLocaleString("pt-PT", { maximumFractionDigits: 1 })} t em parque
          </p>
        </div>
        <DollarSign className="h-10 w-10 text-primary opacity-30" />
      </div>

      {/* Add price form */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Stock Valorizado por Tipo de Resíduo</h3>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
        >
          {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {showForm ? "Cancelar" : "Registar Cotação"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-border bg-card p-4 space-y-4"
        >
          <h4 className="text-sm font-medium">Nova Cotação de Mercado</h4>
          {formError && (
            <p className="text-sm text-destructive">{formError}</p>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Código LER *
              </label>
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="ex: 20 01 01"
                value={form.ler_code}
                onChange={(e) => setForm((f) => ({ ...f, ler_code: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Tipo de Produto
              </label>
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="ex: Papel/Cartão"
                value={form.product_type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, product_type: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Cotação (€/t) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="ex: 120.00"
                value={form.price_per_ton}
                onChange={(e) =>
                  setForm((f) => ({ ...f, price_per_ton: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Data de Referência *
              </label>
              <input
                type="date"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={form.effective_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, effective_date: e.target.value }))
                }
                required
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Notas (opcional)
            </label>
            <input
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="Fonte, observações..."
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
          >
            {isPending ? "A guardar..." : "Guardar Cotação"}
          </button>
        </form>
      )}

      {/* Stock table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Código LER</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipo de Produto</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Stock (t)</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Cotação (€/t)</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Valor Est. (€)</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Tendência</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ref. Cotação</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const tonnes = row.stock_kg / 1000;
              const valueEur =
                row.price_per_ton !== null
                  ? tonnes * row.price_per_ton
                  : null;
              const priceDelta =
                row.price_per_ton !== null && row.prev_price !== null
                  ? ((row.price_per_ton - row.prev_price) / row.prev_price) * 100
                  : null;

              return (
                <tr
                  key={row.ler_code}
                  className="border-b border-border last:border-0 hover:bg-muted/30"
                >
                  <td className="px-4 py-3 font-mono font-medium">{row.ler_code}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.product_type || "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {tonnes.toLocaleString("pt-PT", { maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {row.price_per_ton !== null
                      ? `€ ${row.price_per_ton.toLocaleString("pt-PT")}`
                      : <span className="text-muted-foreground text-xs">sem cotação</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-medium text-primary">
                    {valueEur !== null
                      ? `€ ${Math.round(valueEur).toLocaleString("pt-PT")}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {priceDelta !== null ? (
                      <span
                        className={`inline-flex items-center gap-0.5 text-xs font-medium ${
                          priceDelta > 1
                            ? "text-success"
                            : priceDelta < -1
                            ? "text-destructive"
                            : "text-muted-foreground"
                        }`}
                      >
                        {priceDelta > 1 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : priceDelta < -1 ? (
                          <TrendingDown className="h-3 w-3" />
                        ) : (
                          <Minus className="h-3 w-3" />
                        )}
                        {Math.abs(priceDelta).toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {row.effective_date
                      ? new Date(row.effective_date).toLocaleDateString("pt-PT")
                      : "—"}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  Sem stock registado. Registe entradas para ver stock valorizado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {rows.some((r) => r.price_per_ton === null && r.stock_kg > 0) && (
        <p className="text-xs text-muted-foreground">
          * Tipos de resíduo sem cotação não são incluídos no valor total. Clique em &quot;Registar Cotação&quot; para adicionar.
        </p>
      )}
    </div>
  );
}
