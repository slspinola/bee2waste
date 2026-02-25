// BrighterBins Vision API — HTTP client
// Stateless: each call authenticates fresh (suitable for serverless/Vercel)

import type {
  BrighterBinsDevice,
  UplinkRecord,
} from "@/types/brighterbins";

const BASE_URL = process.env.BRIGHTERBINS_API_URL!;
const PAGE_SIZE = parseInt(process.env.BRIGHTERBINS_PAGE_SIZE ?? "100", 10);

// Raw device shape returned by GET /vision/list
interface RawVisionDevice {
  variant: string;
  variant_id: string;
  status: string; // "online" | "offline"
}

// Raw record returned by POST /vision/timeseries/v2
interface RawV2Record {
  img: string | null;
  annotated_img: string | null;
  org_timestamp: string;          // Unix ms as string, e.g. "1771936350194"
  time: string;                   // ISO-like: "2026-02-24 12:32:30.263000000"
  y_axis: string | null;
  fill_level: number | null;
  battery: string | null;
  power_type: string | null;      // e.g. "solar/adapter"
  temperature: string | null;
  flash: string | null;           // "1" = on, "0" = off
  quality: string | null;         // "1" = high quality
  resolution: string | null;
  binId: string | null;
  contamination: Record<string, { color: number[]; count: number }> | null;
  contaminationCount: number;
}

// Response from POST /vision/timeseries/v2
interface V2TimeSeriesResponse {
  deviceDetail: Record<string, unknown>;
  data: RawV2Record[];
  noOfRecords: number;
  total_pages: number;
  total_number_of_records: number;
  success: boolean;
}

export async function getBrighterBinsToken(): Promise<string> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.BRIGHTERBINS_EMAIL,
      password: process.env.BRIGHTERBINS_PASSWORD,
    }),
  });

  if (!res.ok) {
    throw new Error(`BrighterBins auth failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  if (!data.success || !data.token) {
    throw new Error(
      `BrighterBins auth failed: ${data.message ?? "no token returned"}`
    );
  }
  return data.token;
}

export async function listVisionDevices(
  token: string
): Promise<BrighterBinsDevice[]> {
  const res = await fetch(`${BASE_URL}/vision/list`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to list Vision devices: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const raw: RawVisionDevice[] = data.devices ?? [];

  // Map Vision list response → BrighterBinsDevice
  return raw.map((d) => ({
    variant_id: d.variant_id,
    name: `Vision ${d.variant.toUpperCase()} ${d.variant_id.slice(0, 8)}`,
    status: d.status === "online" ? "Online" : ("Offline" as const),
    last_seen_at: null,
    battery: null,
  }));
}

export async function fetchTimeSeriesAll(
  token: string,
  deviceId: string,
  fromMs: number,
  toMs: number
): Promise<UplinkRecord[]> {
  const allRecords: UplinkRecord[] = [];
  let page = 1;

  // API expects Unix seconds, not milliseconds
  const fromSec = Math.floor(fromMs / 1000);
  const toSec = Math.floor(toMs / 1000);

  while (true) {
    const res = await fetch(`${BASE_URL}/vision/timeseries/v2`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: deviceId,
        from: fromSec,
        to: toSec,
        status: "all",
        page_number: page,
        page_size: PAGE_SIZE,
      }),
    });

    if (!res.ok) {
      // If data is unavailable, return what was collected so far
      if (res.status === 403 || res.status === 404 || res.status === 500) {
        break;
      }
      throw new Error(
        `Failed to fetch time series (page ${page}): ${res.status} ${res.statusText}`
      );
    }

    const body: V2TimeSeriesResponse = await res.json();
    const records = body.data ?? [];

    for (const r of records) {
      const uplinkMs = parseInt(r.org_timestamp, 10);

      // contamination: extract type names from the object keys
      const contaminationTypes = r.contamination
        ? Object.keys(r.contamination)
        : null;

      const fillLevel = r.fill_level ?? null;

      allRecords.push({
        uplink_time: new Date(uplinkMs).toISOString(),
        uplink_time_ms: uplinkMs,
        image_url: r.img ?? null,
        annotated_img_url: r.annotated_img ?? null,
        fill_level: fillLevel,
        contamination: contaminationTypes && contaminationTypes.length > 0 ? contaminationTypes : null,
        contamination_count: r.contaminationCount ?? 0,
        battery_level: r.battery != null ? parseFloat(r.battery) : null,
        battery_type: r.power_type ?? null,
        temperature: r.temperature != null ? parseFloat(r.temperature) : null,
        flash_on: r.flash != null ? r.flash === "1" : null,
        orientation: null,
        image_quality: r.quality === "1" ? "high" : (r.quality ?? null),
        image_resolution: r.resolution ?? null,
        bin_id: r.binId ?? null,
      });
    }

    if (page >= body.total_pages || records.length === 0) {
      break;
    }

    page++;
  }

  return allRecords;
}
