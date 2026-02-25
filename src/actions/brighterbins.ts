"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { syncBrighterBinsReadings } from "@/lib/brighterbins/sync";
import {
  getBrighterBinsToken,
  listVisionDevices,
} from "@/lib/brighterbins/client";
import type { BrighterBinsDevice } from "@/types/brighterbins";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Não autenticado");
  return { user, supabase };
}

export async function syncBrighterBinsAction(parkId: string) {
  await requireUser();
  const result = await syncBrighterBinsReadings(parkId);
  revalidatePath("/entries");
  return result;
}

export async function listBrighterBinsDevicesAction(): Promise<
  BrighterBinsDevice[]
> {
  await requireUser();
  const token = await getBrighterBinsToken();
  return listVisionDevices(token);
}

export async function associateDeviceAction(
  parkId: string,
  deviceId: string,
  deviceName: string
) {
  const { user, supabase } = await requireUser();

  const { error } = await supabase.from("park_brighterbins_devices").upsert(
    {
      park_id: parkId,
      device_id: deviceId,
      device_name: deviceName,
      is_active: true,
      added_by: user.id,
    },
    { onConflict: "park_id,device_id" }
  );

  if (error) throw new Error(error.message);
  revalidatePath("/settings/cameras");
}

export async function dissociateDeviceAction(
  parkId: string,
  deviceId: string
) {
  const { supabase } = await requireUser();

  const { error } = await supabase
    .from("park_brighterbins_devices")
    .update({ is_active: false })
    .eq("park_id", parkId)
    .eq("device_id", deviceId);

  if (error) throw new Error(error.message);
  revalidatePath("/settings/cameras");
}
