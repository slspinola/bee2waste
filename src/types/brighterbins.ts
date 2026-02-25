// BrighterBins Vision API — TypeScript types

export interface LoginResponse {
  token: string;
}

export interface BrighterBinsDevice {
  variant_id: string;
  name: string;
  status: "Online" | "Offline" | string;
  last_seen_at: string | null;
  battery: number | null;
}

export interface DeviceDetail extends BrighterBinsDevice {
  bin_id?: string;
  location?: string;
}

export interface UplinkRecord {
  uplink_time: string;
  uplink_time_ms: number;
  image_url: string | null;
  annotated_img_url: string | null;
  fill_level: number | null;
  contamination: string[] | null;
  contamination_count: number;
  battery_level: number | null;
  battery_type: string | null;
  temperature: number | null;
  flash_on: boolean | null;
  orientation: string | null;
  image_quality: string | null;
  image_resolution: string | null;
  bin_id: string | null;
}


export interface EntradaVisionReading {
  id: string;
  park_id: string;
  entry_id: string | null;
  device_id: string;
  device_name: string | null;
  bin_id: string | null;
  uplink_time: string;
  uplink_time_ms: number;
  image_url: string | null;
  annotated_img_url: string | null;
  fill_level: number | null;
  contamination: string[] | null;
  contamination_count: number;
  battery_level: number | null;
  battery_type: string | null;
  temperature: number | null;
  flash_on: boolean | null;
  orientation: string | null;
  image_quality: string | null;
  image_resolution: string | null;
  synced_at: string;
  created_at: string;
}

export type VisionReading = Omit<
  EntradaVisionReading,
  "id" | "created_at" | "synced_at"
>;
