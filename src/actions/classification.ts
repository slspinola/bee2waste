"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateNonConformity(
  id: string,
  data: { status: string; resolution_notes?: string }
) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Não autenticado");

  const updateData: Record<string, unknown> = {
    status: data.status,
    updated_at: new Date().toISOString(),
  };

  if (data.resolution_notes !== undefined) {
    updateData.resolution_notes = data.resolution_notes;
  }

  if (data.status === "resolved" || data.status === "closed") {
    updateData.resolved_at = new Date().toISOString();
    updateData.resolved_by = user.id;
  }

  const { error } = await supabase
    .from("non_conformities")
    .update(updateData)
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath(`/[locale]/(app)/classification/non-conformities/${id}`);
  revalidatePath("/[locale]/(app)/classification");
}
