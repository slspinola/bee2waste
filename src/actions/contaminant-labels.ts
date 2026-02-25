"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { DEFAULT_CONTAMINANT_LABELS } from "@/lib/contaminant-labels";

export interface ContaminantLabel {
  api_key: string;
  label_pt: string;
  label_en: string | null;
  color: string | null;
  updated_at: string;
}

export async function listContaminantLabels(): Promise<ContaminantLabel[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contaminant_labels")
    .select("api_key, label_pt, label_en, color, updated_at")
    .order("api_key");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function upsertContaminantLabel(
  api_key: string,
  label_pt: string,
  label_en?: string | null,
  color?: string | null
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("contaminant_labels")
    .upsert(
      {
        api_key,
        label_pt,
        label_en: label_en ?? null,
        color: color ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "api_key" }
    );
  if (error) throw new Error(error.message);
  revalidatePath("/settings/contaminants");
}

export async function deleteContaminantLabel(api_key: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("contaminant_labels")
    .delete()
    .eq("api_key", api_key);
  if (error) throw new Error(error.message);
  revalidatePath("/settings/contaminants");
}

/** Re-seeds all built-in PT-PT defaults without overwriting existing custom labels. */
export async function resetDefaultContaminantLabels(): Promise<void> {
  const supabase = await createClient();
  const rows = Object.entries(DEFAULT_CONTAMINANT_LABELS).map(([api_key, label_pt]) => ({
    api_key,
    label_pt,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase
    .from("contaminant_labels")
    .upsert(rows, { onConflict: "api_key" });
  if (error) throw new Error(error.message);
  revalidatePath("/settings/contaminants");
}

/** Returns a flat map of api_key → label_pt for use in display components. */
export async function getContaminantLabelsMap(): Promise<Record<string, string>> {
  try {
    const labels = await listContaminantLabels();
    const map: Record<string, string> = {};
    for (const l of labels) {
      map[l.api_key] = l.label_pt;
    }
    return map;
  } catch {
    return {};
  }
}

/** Returns a flat map of api_key → color (hex string) for badge styling. */
export async function getContaminantColorsMap(): Promise<Record<string, string>> {
  try {
    const labels = await listContaminantLabels();
    const map: Record<string, string> = {};
    for (const l of labels) {
      if (l.color) map[l.api_key] = l.color;
    }
    return map;
  } catch {
    return {};
  }
}
