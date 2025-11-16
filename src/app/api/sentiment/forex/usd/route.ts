// src/app/api/sentiment/forex/usd/route.ts

import { NextResponse } from "next/server";
import { computeBucketScore } from "../../_newsSentiment";

export const dynamic = "force-dynamic";

export async function GET() {
  const score = await computeBucketScore("forex_usd");
  return NextResponse.json({ score });
}
