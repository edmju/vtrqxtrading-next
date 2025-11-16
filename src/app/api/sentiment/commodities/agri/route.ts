// src/app/api/sentiment/commodities/agri/route.ts

import { NextResponse } from "next/server";
import { computeBucketScore } from "../../_newsSentiment";

export const dynamic = "force-dynamic";

export async function GET() {
  const score = await computeBucketScore("commodities_agri");
  return NextResponse.json({ score });
}
