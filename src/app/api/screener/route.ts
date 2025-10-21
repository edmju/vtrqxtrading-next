import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function GET(req: NextRequest) {
  const aiRaw = await redis.get("ai:feed");
  const ai = aiRaw ? JSON.parse(aiRaw) : null;

  // Exemple : renvoie le sentiment & momentum
  const fxSentiment = ai?.whatMoved || {};
  return NextResponse.json({ ok: true, fxSentiment });
}
