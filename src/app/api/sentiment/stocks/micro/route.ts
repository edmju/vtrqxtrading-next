// src/app/api/sentiment/stocks/micro/route.ts

import { NextResponse } from "next/server";
import { computeBucketScore } from "../../_newsSentiment";

export const dynamic = "force-dynamic";

export async function GET() {
  const score = await computeBucketScore("stocks_micro");
  return NextResponse.json({ score });
}
