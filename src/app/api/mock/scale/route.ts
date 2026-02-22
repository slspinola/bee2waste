import { NextRequest, NextResponse } from "next/server";

/**
 * Mock scale endpoint — simulates weighbridge reading.
 * POST /api/mock/scale
 * Body: { scale_id?: string, simulate_unstable?: boolean }
 * Returns: { weight_kg, timestamp, stable, scale_id }
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { scale_id, simulate_unstable, context, gross_weight_kg } = body as {
    scale_id?: string;
    simulate_unstable?: boolean;
    context?: "gross" | "tare";
    gross_weight_kg?: number;
  };

  // Simulate processing delay (200-800ms)
  await new Promise((resolve) =>
    setTimeout(resolve, 200 + Math.random() * 600)
  );

  let weight_kg: number;

  if (context === "tare" && gross_weight_kg) {
    // Tare is always less than gross — vehicle empty weight is typically 30-60% of gross
    const ratio = 0.3 + Math.random() * 0.3;
    weight_kg = Math.round(gross_weight_kg * ratio * 10) / 10;
  } else {
    // Gross weight: realistic range for waste trucks (8000-40000 kg)
    weight_kg = Math.round((8000 + Math.random() * 32000) * 10) / 10;
  }

  const stable = simulate_unstable ? Math.random() > 0.5 : true;

  return NextResponse.json({
    weight_kg,
    timestamp: new Date().toISOString(),
    stable,
    scale_id: scale_id || "mock-scale-001",
    unit: "kg",
  });
}
