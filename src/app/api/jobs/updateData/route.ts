import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const FRED_KEY = process.env.FRED_API_KEY!;
const FMP_KEY = process.env.FMP_API_KEY!;

async function fetchJSON(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Erreur API : ${url}`);
  return res.json();
}

export async function GET() {
  try {
    // === FRED ===
    const inflationData = await fetchJSON(
      `https://api.stlouisfed.org/fred/series/observations?series_id=CPIAUCSL&api_key=${FRED_KEY}&file_type=json`
    );

    const gdpData = await fetchJSON(
      `https://api.stlouisfed.org/fred/series/observations?series_id=GDP&api_key=${FRED_KEY}&file_type=json`
    );

    const rateData = await fetchJSON(
      `https://api.stlouisfed.org/fred/series/observations?series_id=FEDFUNDS&api_key=${FRED_KEY}&file_type=json`
    );

    // === FINANCIAL MODELING PREP ===
    const sp500 = await fetchJSON(`https://financialmodelingprep.com/api/v3/quote/%5EGSPC?apikey=${FMP_KEY}`);
    const nasdaq = await fetchJSON(`https://financialmodelingprep.com/api/v3/quote/%5EIXIC?apikey=${FMP_KEY}`);
    const dowjones = await fetchJSON(`https://financialmodelingprep.com/api/v3/quote/%5EDJI?apikey=${FMP_KEY}`);

    const latest = (arr: any) => arr?.observations?.at(-1)?.value ?? null;

    const result = {
      asof: new Date().toISOString(),
      global: {
        inflation: parseFloat(latest(inflationData)),
        gdp: parseFloat(latest(gdpData)),
        interest_rate: parseFloat(latest(rateData)),
        sp500: sp500?.[0]?.price ?? null,
        nasdaq: nasdaq?.[0]?.price ?? null,
        dowjones: dowjones?.[0]?.price ?? null,
      },
      summary: `Les marchés ont été mis à jour le ${new Date().toLocaleString("fr-FR")}.`,
    };

    const filePath = path.join(process.cwd(), "src/lib/data.ts");
    const content = `export const data = ${JSON.stringify(result, null, 2)};`;
    fs.writeFileSync(filePath, content, "utf-8");

    return NextResponse.json({ status: "ok", updated: result });
  } catch (error) {
    console.error("Erreur updateData:", error);
    return NextResponse.json({ status: "error", message: String(error) });
  }
}
