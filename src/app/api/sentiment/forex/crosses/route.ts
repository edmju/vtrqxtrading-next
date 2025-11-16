// src/app/api/sentiment/forex/crosses/route.ts

import { NextResponse } from "next/server";
import { computeBucketScore } from "../../_newsSentiment";

export const dynamic = "force-dynamic";

export async function GET() {
  const score = await computeBucketScore("forex_crosses");
  return NextResponse.json({ score });
}
