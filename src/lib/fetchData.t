import fs from "fs";
import path from "path";

const macroPath = path.join(process.cwd(), "src", "data", "macroData.json");

const FRED_API_KEY = process.env.FRED_API_KEY || "a560fa6ca4e1d7c54d52b31e5d35573c";

const FRED_SERIES = [
  { id: "GDP", label: "PIB USA" },
  { id: "FEDFUNDS", label: "Taux directeur Fed" },
  { id: "CPIAUCSL", label: "Inflation USA (CPI)" },
  { id: "UNRATE", label: "Chômage USA" },
];

export async function updateMacroData() {
  try {
    const results: any[] = [];

    for (const serie of FRED_SERIES) {
      const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${serie.id}&api_key=${FRED_API_KEY}&file_type=json`;
      const res = await fetch(url);
      const json = await res.json();
      const last = json.observations.at(-1);
      results.push({
        source: serie.label,
        value: last?.value,
        date: last?.date,
      });
    }

    const meta = {
      updated: new Date().toISOString(),
      sources: results,
    };

    fs.writeFileSync(macroPath, JSON.stringify(meta, null, 2));
    console.log("✅ macroData.json updated.");
    return meta;
  } catch (err) {
    console.error("❌ Error updating macro data:", err);
  }
}
