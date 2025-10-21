import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const FRED_API_KEY = "a560fa6ca4e1d7c54d52b31e5d35573c";
const FMP_API_KEY = "6cAVJDVLNI0HP4fXQJfarQCPoLBNjL03";
const TE_USER = "guest";
const TE_PASS = "guest";

const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "EU", name: "Euro Area" },
  { code: "GB", name: "United Kingdom" },
  { code: "JP", name: "Japan" },
  { code: "CA", name: "Canada" },
  { code: "CH", name: "Switzerland" },
  { code: "NZ", name: "New Zealand" },
  { code: "CN", name: "China" }
];

async function fetchJSON(url: string, headers = {}) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.json();
}

/* ---------- FRED (US only) ---------- */
async function getUSData() {
  const ids: Record<string, string> = {
    GDP: "GDP",
    Inflation: "CPIAUCSL",
    Unemployment: "UNRATE",
    InterestRate: "FEDFUNDS",
    TradeBalance: "NETEXP",
    IndustrialProduction: "INDPRO",
    TenYearBond: "DGS10",
    PMI: "NAPM"
  };

  const out: Record<string, any> = {};
  for (const [k, id] of Object.entries(ids)) {
    const data = await fetchJSON(
      `https://api.stlouisfed.org/fred/series/observations?series_id=${id}&api_key=${FRED_API_KEY}&file_type=json`
    );
    const last = data.observations[data.observations.length - 1];
    out[k] = { value: last.value, date: last.date };
  }
  return out;
}

/* ---------- FinancialModelingPrep (global coverage) ---------- */
async function getFMP(countryCode: string) {
  const url = `https://financialmodelingprep.com/api/v4/economic?country=${countryCode}&apikey=${FMP_API_KEY}`;
  try {
    return await fetchJSON(url);
  } catch {
    return [];
  }
}

/* ---------- TradingEconomics fallback ---------- */
async function getTE(countryName: string) {
  const base = "https://api.tradingeconomics.com";
  const auth = Buffer.from(`${TE_USER}:${TE_PASS}`).toString("base64");
  try {
    const url = `${base}/country/${encodeURIComponent(countryName)}?c=${TE_USER}:${TE_PASS}`;
    return await fetchJSON(url, { Authorization: `Basic ${auth}` });
  } catch {
    return [];
  }
}

/* ---------- Normalisation ---------- */
function normalize(country: string, apiData: any[], fallback: any = {}) {
  const get = (key: string) =>
    apiData.find((d: any) =>
      (d.category || d.name || "").toLowerCase().includes(key.toLowerCase())
    ) || fallback[key];

  const val = (k: string) =>
    get(k)?.latestValue ?? get(k)?.actual ?? get(k)?.value ?? "n/a";

  return {
    country,
    updated: new Date().toISOString(),
    indicators: {
      GDP: val("gdp"),
      Inflation: val("inflation"),
      Unemployment: val("unemployment"),
      InterestRate: val("interest"),
      TradeBalance: val("trade"),
      IndustrialProduction: val("industrial"),
      TenYearBond: val("10y"),
      PMI: val("pmi")
    }
  };
}

/* ---------- MAIN UPDATE ---------- */
async function updateAll() {
  const file = path.resolve("src/data/macroData_Global.json");
  const globalData: any[] = [];

  for (const c of COUNTRIES) {
    console.log(`🌍 Fetching data for ${c.name}...`);
    let data: any[] = [];

    try {
      if (c.code === "US") {
        const fred = await getUSData();
        data = Object.entries(fred).map(([k, v]) => ({
          name: k,
          value: v.value,
          date: v.date
        }));
      } else {
        const fmp = await getFMP(c.code);
        data = fmp.length ? fmp : await getTE(c.name);
      }

      const normalized = normalize(c.name, data);
      globalData.push(normalized);
    } catch (err) {
      console.error(`⚠️ Failed ${c.name}:`, err);
      globalData.push({ country: c.name, error: err.message });
    }
  }

  fs.writeFileSync(file, JSON.stringify({ updated: new Date(), data: globalData }, null, 2));
  console.log("✅ Global macro data updated.");
}

updateAll().catch((e) => console.error("❌ Update error:", e));
