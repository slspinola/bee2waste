"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function upsertMarketPrice(
  parkId: string,
  data: {
    ler_code: string;
    product_type?: string;
    price_per_ton: number;
    effective_date: string;
    notes?: string;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { error } = await supabase.from("market_prices").insert({
    park_id: parkId,
    ler_code: data.ler_code.trim(),
    product_type: data.product_type?.trim() || null,
    price_per_ton: data.price_per_ton,
    effective_date: data.effective_date,
    source: "manual",
    notes: data.notes?.trim() || null,
    created_by: user.id,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}
