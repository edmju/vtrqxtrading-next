// src/app/api/sentiment/stocks/macro/route.ts

import { NextResponse } from "next/server";
import { computeBucketScore } from "../../_newsSentiment";

export const dynamic = "force-dynamic";

export async function GET() {
  const score = await computeBucketScore("stocks_macro");
  return NextResponse.json({ score });
}
