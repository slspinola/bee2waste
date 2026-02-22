"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";

const LQI_GRADE_CLS: Record<string, string> = {
  A: "bg-emerald-100 text-emerald-700 border-emerald-200",
  B: "bg-green-100 text-green-700 border-green-200",
  C: "bg-amber-100 text-amber-700 border-amber-200",
  D: "bg-orange-100 text-orange-700 border-orange-200",
  E: "bg-red-100 text-red-700 border-red-200",
};

interface ActiveLot {
  id: string;
  lot_number: string;
  status: string;
  allowed_ler_codes: string[];
  raw_grade: number | null;
  lot_quality_index: number | null;
  lqi_grade: string | null;
  yield_rate: number | null;
  total_input_kg: number;
  opened_at: string;
  treatment_started_at: string | null;
  closed_at: string | null;
  zones: { code: string; name: string }[];
}

interface ZoneStatus {
  id: string;
  code: string;
  name: string;
  is_blocked: boolean;
  blocked_at: string | null;
  active_lot_id: string | null;
  active_lot_number: string | null;
  is_active: boolean;
}

export function LotsQualityTab({ parkId }: { parkId: string }) {
  const [openLots, setOpenLots] = useState<ActiveLot[]>([]);
  const [inTreatmentLots, setInTreatmentLots] = useState<ActiveLot[]>([]);
  const [recentClosed, setRecentClosed] = useState<ActiveLot[]>([]);
  const [zones, setZones] = useState<ZoneStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createClient();

      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
        .toISOString()
        .split("T")[0];

      const [{ data: activeLots }, { data: closedLots }, { data: areasData }] =
        await Promise.all([
          supabase
            .from("lots")
            .select(
              "id, lot_number, status, allowed_ler_codes, raw_grade, lot_quality_index, lqi_grade, yield_rate, total_input_kg, opened_at, treatment_started_at, lot_zones(storage_areas:zone_id(code, name))"
            )
            .eq("park_id", parkId)
            .in("status", ["open", "in_treatment"])
            .order("opened_at", { ascending: false }) as unknown as Promise<{
            data: Array<{
              id: string;
              lot_number: string;
              status: string;
              allowed_ler_codes: string[];
              raw_grade: number | null;
              lot_quality_index: number | null;
              lqi_grade: string | null;
              yield_rate: number | null;
              total_input_kg: number;
              opened_at: string;
              treatment_started_at: string | null;
              lot_zones: Array<{
                storage_areas: { code: string; name: string } | null;
              }>;
            }> | null;
          }>,
          supabase
            .from("lots")
            .select(
              "id, lot_number, status, allowed_ler_codes, raw_grade, lot_quality_index, lqi_grade, yield_rate, total_input_kg, opened_at, treatment_started_at, closed_at, lot_zones(storage_areas:zone_id(code, name))"
            )
            .eq("park_id", parkId)
            .eq("status", "closed")
            .gte("closed_at", `${thirtyDaysAgo}T00:00:00`)
            .order("closed_at", { ascending: false })
            .limit(8) as unknown as Promise<{
            data: Array<{
              id: string;
              lot_number: string;
              status: string;
              allowed_ler_codes: string[];
              raw_grade: number | null;
              lot_quality_index: number | null;
              lqi_grade: string | null;
              yield_rate: number | null;
              total_input_kg: number;
              opened_at: string;
              treatment_started_at: string | null;
              closed_at: string | null;
              lot_zones: Array<{
                storage_areas: { code: string; name: string } | null;
              }>;
            }> | null;
          }>,
          supabase
            .from("storage_areas")
            .select("id, code, name, is_blocked, blocked_at")
            .eq("park_id", parkId)
            .order("code") as unknown as Promise<{
            data: Array<{
              id: string;
              code: string;
              name: string;
              is_blocked: boolean;
              blocked_at: string | null;
            }> | null;
          }>,
        ]);

      function mapLot(raw: {
        id: string;
        lot_number: string;
        status: string;
        allowed_ler_codes: string[];
        raw_grade: number | null;
        lot_quality_index: number | null;
        lqi_grade: string | null;
        yield_rate: number | null;
        total_input_kg: number;
        opened_at: string;
        treatment_started_at: string | null;
        closed_at?: string | null;
        lot_zones: Array<{ storage_areas: { code: string; name: string } | null }>;
      }): ActiveLot {
        return {
          id: raw.id,
          lot_number: raw.lot_number,
          status: raw.status,
          allowed_ler_codes: raw.allowed_ler_codes || [],
          raw_grade: raw.raw_grade,
          lot_quality_index: raw.lot_quality_index,
          lqi_grade: raw.lqi_grade,
          yield_rate: raw.yield_rate,
          total_input_kg: raw.total_input_kg || 0,
          opened_at: raw.opened_at,
          treatment_started_at: raw.treatment_started_at,
          closed_at: raw.closed_at ?? null,
          zones: raw.lot_zones
            .filter((lz) => lz.storage_areas)
            .map((lz) => lz.storage_areas!),
        };
      }

      const open = (activeLots || [])
        .filter((l) => l.status === "open")
        .map(mapLot);
      const inTreatment = (activeLots || [])
        .filter((l) => l.status === "in_treatment")
        .map(mapLot);
      const closed = (closedLots || []).map(mapLot);

      // Build zone lot map by code (zone_id not returned from lot_zones select)
      const zoneCodeLotMap = new Map<string, { lot_id: string; lot_number: string }>();
      for (const lot of [...(activeLots || [])]) {
        for (const lz of lot.lot_zones) {
          if (lz.storage_areas) {
            zoneCodeLotMap.set(lz.storage_areas.code, {
              lot_id: lot.id,
              lot_number: lot.lot_number,
            });
          }
        }
      }

      const zoneRows: ZoneStatus[] = (areasData || []).map((area) => {
        const lotInfo = zoneCodeLotMap.get(area.code);
        return {
          id: area.id,
          code: area.code,
          name: area.name,
          is_blocked: area.is_blocked,
          blocked_at: area.blocked_at,
          active_lot_id: lotInfo?.lot_id ?? null,
          active_lot_number: lotInfo?.lot_number ?? null,
          is_active: true,
        };
      });

      setOpenLots(open);
      setInTreatmentLots(inTreatment);
      setRecentClosed(closed);
      setZones(zoneRows);
      setLoading(false);
    }
    load();
  }, [parkId]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-lg bg-muted" />
          ))}
        </div>
        <div className="h-48 rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Open lots */}
      {openLots.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-success inline-block" />
            Lotes Abertos ({openLots.length})
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {openLots.map((lot) => (
              <LotCard key={lot.id} lot={lot} />
            ))}
          </div>
        </section>
      )}

      {/* In-treatment lots */}
      {inTreatmentLots.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400 inline-block" />
            Em Tratamento ({inTreatmentLots.length})
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {inTreatmentLots.map((lot) => (
              <LotCard key={lot.id} lot={lot} />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {openLots.length === 0 && inTreatmentLots.length === 0 && (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Sem lotes ativos.{" "}
          <Link href="/lots/new" className="text-primary hover:underline">
            Criar lote
          </Link>
        </div>
      )}

      {/* Recently closed */}
      {recentClosed.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground inline-block" />
              Fechados Recentemente
            </h3>
            <Link
              href="/lots"
              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
            >
              Ver todos <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                    Lote
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                    LER
                  </th>
                  <th className="px-4 py-2 text-center font-medium text-muted-foreground">
                    LQI
                  </th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                    Yield
                  </th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                    Peso (t)
                  </th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                    Fecho
                  </th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {recentClosed.map((lot) => (
                  <tr
                    key={lot.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-2 font-mono text-sm font-medium">
                      {lot.lot_number}
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {lot.allowed_ler_codes.slice(0, 2).join(", ")}
                      {lot.allowed_ler_codes.length > 2 && " ..."}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {lot.lqi_grade ? (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold border ${
                            LQI_GRADE_CLS[lot.lqi_grade] || "bg-muted"
                          }`}
                        >
                          {lot.lqi_grade}
                          {lot.lot_quality_index && (
                            <span className="font-mono">{lot.lot_quality_index.toFixed(1)}</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-sm">
                      {lot.yield_rate != null
                        ? `${lot.yield_rate.toFixed(0)}%`
                        : "—"}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-sm">
                      {(lot.total_input_kg / 1000).toLocaleString("pt-PT", {
                        maximumFractionDigits: 1,
                      })}
                    </td>
                    <td className="px-4 py-2 text-right text-xs text-muted-foreground">
                      {lot.closed_at
                        ? new Date(lot.closed_at).toLocaleDateString("pt-PT")
                        : "—"}
                    </td>
                    <td className="px-4 py-2">
                      <Link
                        href={`/lots/${lot.id}`}
                        className="text-xs text-primary hover:underline"
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Zone map */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Mapa de Zonas</h3>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded bg-success/20 border border-success/40" />
              Livre
            </span>
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded bg-blue-100 border border-blue-300" />
              Com lote
            </span>
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded bg-amber-100 border border-amber-300" />
              Bloqueada
            </span>
          </div>
        </div>
        {zones.length > 0 ? (
          <div className="grid gap-2 grid-cols-3 sm:grid-cols-4 lg:grid-cols-6">
            {zones.map((zone) => {
              const blockedDays = zone.blocked_at
                ? Math.round(
                    (Date.now() - new Date(zone.blocked_at).getTime()) /
                      86400000
                  )
                : 0;
              const isOldBlock = zone.is_blocked && blockedDays > 30;

              let cls =
                "bg-success/10 border-success/30 text-success";
              if (zone.is_blocked) {
                cls = isOldBlock
                  ? "bg-red-50 border-red-300 text-red-600"
                  : "bg-amber-50 border-amber-300 text-amber-600";
              } else if (zone.active_lot_id) {
                cls = "bg-blue-50 border-blue-300 text-blue-600";
              }

              return (
                <div
                  key={zone.id}
                  className={`rounded-lg border p-2 text-center text-xs ${cls} transition-colors cursor-default`}
                  title={
                    zone.is_blocked
                      ? `Bloqueada há ${blockedDays} dias${zone.active_lot_number ? ` — ${zone.active_lot_number}` : ""}`
                      : zone.active_lot_id
                      ? `Lote: ${zone.active_lot_number}`
                      : "Zona livre"
                  }
                >
                  <p className="font-mono font-bold">{zone.code}</p>
                  <p className="truncate text-current opacity-70">
                    {zone.is_blocked
                      ? `${blockedDays}d blq`
                      : zone.active_lot_number
                      ? zone.active_lot_number
                      : "livre"}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Sem zonas configuradas.{" "}
            <Link href="/settings/zones" className="text-primary hover:underline">
              Configurar zonas
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

function LotCard({ lot }: { lot: ActiveLot }) {
  const isOpen = lot.status === "open";
  const daysInTreatment = lot.treatment_started_at
    ? Math.round(
        (Date.now() - new Date(lot.treatment_started_at).getTime()) / 86400000
      )
    : null;

  const borderColor = isOpen ? "border-success/40" : "border-amber-300";
  const weightTonnes = (lot.total_input_kg / 1000).toLocaleString("pt-PT", {
    maximumFractionDigits: 1,
  });

  return (
    <div className={`rounded-lg border ${borderColor} bg-card p-4 space-y-3`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-sm font-semibold">{lot.lot_number}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {lot.allowed_ler_codes.slice(0, 2).join(", ")}
            {lot.allowed_ler_codes.length > 2 && " ..."}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            isOpen
              ? "bg-success-surface text-success"
              : "bg-amber-50 text-amber-600"
          }`}
        >
          {isOpen ? "Aberto" : "Em Tratamento"}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xs text-muted-foreground">Peso</p>
          <p className="text-sm font-mono font-medium">{weightTonnes} t</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Entradas</p>
          <p className="text-sm font-medium">{(lot.total_input_kg / 1000).toFixed(1)} t</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">
            {isOpen ? "Grau Raw" : "Dias"}
          </p>
          <p className="text-sm font-medium">
            {isOpen
              ? lot.raw_grade?.toFixed(1) ?? "—"
              : daysInTreatment !== null
              ? `${daysInTreatment}d`
              : "—"}
          </p>
        </div>
      </div>

      {lot.zones.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {lot.zones.map((z) => (
            <span
              key={z.code}
              className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono"
            >
              {z.code}
            </span>
          ))}
        </div>
      )}

      <Link
        href={`/lots/${lot.id}`}
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        Ver detalhes <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
