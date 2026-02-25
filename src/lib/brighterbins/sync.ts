// BrighterBins Vision API — Sync logic
// Fetches new uplinks per device, matches to entries by timestamp, upserts readings.

import { createAdminClient } from "@/lib/supabase/admin";
import {
  getBrighterBinsToken,
  fetchTimeSeriesAll,
} from "@/lib/brighterbins/client";
import type { VisionReading } from "@/types/brighterbins";

const TOLERANCE_MS =
  parseInt(process.env.BRIGHTERBINS_MATCH_TOLERANCE_MINUTES ?? "10", 10) *
  60 *
  1000;

export interface SyncResult {
  synced: number;
  matched: number;
  errors: string[];
}

export async function syncBrighterBinsReadings(
  parkId?: string
): Promise<SyncResult> {
  const admin = createAdminClient();
  const result: SyncResult = { synced: 0, matched: 0, errors: [] };

  // 1. Fetch active device associations
  let query = admin
    .from("park_brighterbins_devices")
    .select("park_id, device_id, device_name")
    .eq("is_active", true);

  if (parkId) {
    query = query.eq("park_id", parkId);
  }

  const { data: devices, error: devErr } = await query;
  if (devErr) {
    result.errors.push(`Failed to fetch device associations: ${devErr.message}`);
    return result;
  }
  if (!devices || devices.length === 0) {
    return result;
  }

  const token = await getBrighterBinsToken();
  const now = Date.now();
  const defaultFromMs = now - 24 * 60 * 60 * 1000; // 24h ago

  for (const device of devices) {
    try {
      // 2. Get last synced timestamp for this device
      const { data: syncState } = await admin
        .from("brighterbins_sync_state")
        .select("last_uplink_ts")
        .eq("device_id", device.device_id)
        .single();

      const fromMs = syncState?.last_uplink_ts
        ? syncState.last_uplink_ts + 1
        : defaultFromMs;

      // 3. Fetch all uplinks since last sync
      const records = await fetchTimeSeriesAll(
        token,
        device.device_id,
        fromMs,
        now
      );

      if (records.length === 0) continue;

      // 4. For each reading, find a matching entry by timestamp
      const readings: VisionReading[] = [];
      let deviceMatched = 0;

      for (const rec of records) {
        const uplinkMs = rec.uplink_time_ms;
        const fromRange = new Date(uplinkMs - TOLERANCE_MS).toISOString();
        const toRange = new Date(uplinkMs + TOLERANCE_MS).toISOString();

        const { data: matchedEntry } = await admin
          .from("entries")
          .select("id")
          .eq("park_id", device.park_id)
          .gte("created_at", fromRange)
          .lte("created_at", toRange)
          .order("created_at", { ascending: true })
          .limit(1)
          .single();

        if (matchedEntry) deviceMatched++;

        readings.push({
          park_id: device.park_id,
          entry_id: matchedEntry?.id ?? null,
          device_id: device.device_id,
          device_name: device.device_name,
          bin_id: rec.bin_id,
          uplink_time: rec.uplink_time,
          uplink_time_ms: rec.uplink_time_ms,
          image_url: rec.image_url,
          annotated_img_url: rec.annotated_img_url,
          fill_level: rec.fill_level,
          contamination: rec.contamination,
          contamination_count: rec.contamination_count ?? 0,
          battery_level: rec.battery_level,
          battery_type: rec.battery_type,
          temperature: rec.temperature,
          flash_on: rec.flash_on,
          orientation: rec.orientation,
          image_quality: rec.image_quality,
          image_resolution: rec.image_resolution,
        });
      }

      // 5. Upsert readings
      const { error: upsertErr } = await admin
        .from("entrada_vision_readings")
        .upsert(readings, { onConflict: "device_id,uplink_time_ms" });

      if (upsertErr) {
        throw new Error(`Upsert failed: ${upsertErr.message}`);
      }

      // 6. Update sync state only after successful upsert
      const maxUplinkMs = Math.max(...records.map((r) => r.uplink_time_ms));
      await admin.from("brighterbins_sync_state").upsert(
        {
          device_id: device.device_id,
          device_name: device.device_name,
          last_sync_at: new Date().toISOString(),
          last_uplink_ts: maxUplinkMs,
        },
        { onConflict: "device_id" }
      );

      result.synced += records.length;
      result.matched += deviceMatched;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`Device ${device.device_id}: ${msg}`);
    }
  }

  return result;
}
