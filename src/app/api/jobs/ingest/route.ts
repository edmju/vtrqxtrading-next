import { NextRequest, NextResponse } from "next/server";
import { fetch } from "node-fetch";
import { redis } from "@/lib/redis";

const FRED_BASE = "https://api.stlouisfed.org/fred";
const FMP_BASE = "https://financialmodelingprep.com/api";

export async function GET(req: NextRequest) {
  // Ingestion FRED example
  const fredUrl = `${FRED_BASE}/series/observations?series_id=GDP&api_key=${process.env.FRED_API_KEY}&file_type=json`;
  const fredRes = await fetch(fredUrl);
  const fredJson = await fredRes.json();

  // Stocke dans Redis ou traite ici
  await redis.set("fred:latest", JSON.stringify(fredJson), { ex: 3600 });

  // Ingestion news marché via FMP
  const fmpUrl = `${FMP_BASE}/v3/stock_news?apikey=${process.env.FMP_API_KEY}`;
  const fmpRes = await fetch(fmpUrl);
  const fmpJson = await fmpRes.json();
  await redis.set("news:latest", JSON.stringify(fmpJson), { ex: 3600 });

  return NextResponse.json({ ok: true });
}
