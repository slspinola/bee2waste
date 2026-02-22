"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface LotSuggestion {
  id: string;
  lot_number: string;
  name: string | null;
  status: string;
  allowed_ler_codes: string[];
  total_input_kg: number;
  raw_grade: number | null;
}

export interface ZoneWithLot {
  id: string;
  name: string;
  code: string;
  area_type: string;
  capacity_kg: number | null;
  current_stock_kg: number;
  is_blocked: boolean;
  area_group_id: string | null;
  area_group_name?: string;
  active_lot: LotSuggestion | null;
}

export function useLotSuggestions(parkId: string | null, lerCode: string | null) {
  const [zones, setZones] = useState<ZoneWithLot[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetch() {
      if (!parkId) return;
      setLoading(true);
      const supabase = createClient();

      // Fetch all active zones for the park
      const { data: rawZones } = await supabase
        .from("storage_areas")
        .select("id, name, code, area_type, capacity_kg, current_stock_kg, is_blocked, area_group_id, area_groups(name)")
        .eq("park_id", parkId)
        .eq("is_active", true)
        .order("code");

      if (!rawZones) { setLoading(false); return; }

      // Fetch active lot for each zone
      const { data: activeLotZones } = await supabase
        .from("lot_zones")
        .select("zone_id, lots!inner(id, lot_number, name, status, allowed_ler_codes, total_input_kg, raw_grade)")
        .is("removed_at", null)
        .in("lots.status", ["open", "in_treatment"]);

      const lotByZone: Record<string, LotSuggestion> = {};
      if (activeLotZones) {
        for (const lz of activeLotZones) {
          const lot = lz.lots as unknown as LotSuggestion;
          lotByZone[lz.zone_id] = lot;
        }
      }

      const result: ZoneWithLot[] = rawZones.map((z) => ({
        id: z.id,
        name: z.name,
        code: z.code,
        area_type: z.area_type,
        capacity_kg: z.capacity_kg,
        current_stock_kg: z.current_stock_kg ?? 0,
        is_blocked: z.is_blocked ?? false,
        area_group_id: z.area_group_id,
        area_group_name: (z.area_groups as unknown as { name: string } | null)?.name,
        active_lot: lotByZone[z.id] ?? null,
      }));

      // Filter: if lerCode provided, prioritise zones with compatible open lots
      if (lerCode) {
        result.sort((a, b) => {
          const aMatch = a.active_lot?.status === "open" && a.active_lot.allowed_ler_codes.includes(lerCode);
          const bMatch = b.active_lot?.status === "open" && b.active_lot.allowed_ler_codes.includes(lerCode);
          if (aMatch && !bMatch) return -1;
          if (!aMatch && bMatch) return 1;
          return 0;
        });
      }

      setZones(result);
      setLoading(false);
    }
    fetch();
  }, [parkId, lerCode]);

  const availableZones = zones.filter((z) => !z.is_blocked);
  const compatibleZones = lerCode
    ? availableZones.filter((z) =>
        !z.active_lot ||
        (z.active_lot.status === "open" && z.active_lot.allowed_ler_codes.includes(lerCode))
      )
    : availableZones;

  return { zones, availableZones, compatibleZones, loading };
}
