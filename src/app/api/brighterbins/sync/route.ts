import { NextRequest, NextResponse } from "next/server";
import { syncBrighterBinsReadings } from "@/lib/brighterbins/sync";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-sync-secret");
  if (!secret || secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncBrighterBinsReadings();
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
