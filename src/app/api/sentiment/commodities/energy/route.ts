// src/app/api/sentiment/commodities/energy/route.ts

import { NextResponse } from "next/server";
import { computeBucketScore } from "../../_newsSentiment";

export const dynamic = "force-dynamic";

export async function GET() {
  const score = await computeBucketScore("commodities_energy");
  return NextResponse.json({ score });
}
