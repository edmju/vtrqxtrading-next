import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  const aiRaw = await redis.get("ai:feed");
  const ai = aiRaw ? JSON.parse(aiRaw) : null;

  // Exemple simplifié : renvoie contexte + drivers
  return NextResponse.json({
    ok: true,
    research: {
      symbol,
      context: ai.summary,
      drivers: ai.whatMoved,
    },
  });
}
