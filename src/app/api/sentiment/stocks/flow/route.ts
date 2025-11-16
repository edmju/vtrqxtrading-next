// src/app/api/sentiment/stocks/flow/route.ts

import { NextResponse } from "next/server";
import { computeBucketScore } from "../../_newsSentiment";

export const dynamic = "force-dynamic";

export async function GET() {
  const score = await computeBucketScore("stocks_flow");
  return NextResponse.json({ score });
}
