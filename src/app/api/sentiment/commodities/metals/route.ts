// src/app/api/sentiment/commodities/metals/route.ts

import { NextResponse } from "next/server";
import { computeBucketScore } from "../../_newsSentiment";

export const dynamic = "force-dynamic";

export async function GET() {
  const score = await computeBucketScore("commodities_metals");
  return NextResponse.json({ score });
}
