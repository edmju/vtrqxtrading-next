// scripts/sentiment/sources.ts

import fetch from "node-fetch";
import { AssetClass, SentimentPoint } from "./types";

type ProviderConfig = {
  id: string;
  label: string;
  assetClass: AssetClass;
  envUrl: string;
  envKey?: string;
  keyHeader?: string;
};

const PROVIDERS: ProviderConfig[] = [
  // FOREX
  {
    id: "forex_myfxbook",
    label: "MyFXBook Community Outlook",
    assetClass: "forex",
    envUrl: "SENTIMENT_FOREX_URL_1"
  },
  {
    id: "forex_forexfactory",
    label: "ForexFactory Sentiment",
    assetClass: "forex",
    envUrl: "SENTIMENT_FOREX_URL_2"
  },
  {
    id: "forex_dailyfx",
    label: "DailyFX IG Client Sentiment",
    assetClass: "forex",
    envUrl: "SENTIMENT_FOREX_URL_3"
  },

  // STOCKS
  {
    id: "stocks_cnn_fng",
    label: "CNN Fear & Greed",
    assetClass: "stocks",
    envUrl: "SENTIMENT_STOCKS_URL_1"
  },
  {
    id: "stocks_finviz",
    label: "Finviz Map",
    assetClass: "stocks",
    envUrl: "SENTIMENT_STOCKS_URL_2"
  },
  {
    id: "stocks_stocktwits",
    label: "StockTwits Trending",
    assetClass: "stocks",
    envUrl: "SENTIMENT_STOCKS_URL_3"
  },
  {
    id: "stocks_alphavantage",
    label: "AlphaVantage News Sentiment",
    assetClass: "stocks",
    envUrl: "SENTIMENT_STOCKS_URL_4",
    envKey: "SENTIMENT_STOCKS_KEY_4",
    keyHeader: "X-API-Key"
  },

  // COMMODITIES
  {
    id: "commod_oilprice",
    label: "OilPrice.com",
    assetClass: "commodities",
    envUrl: "SENTIMENT_COMMOD_URL_1"
  },
  {
    id: "commod_kitco",
    label: "Kitco Metals",
    assetClass: "commodities",
    envUrl: "SENTIMENT_COMMOD_URL_2"
  },
  {
    id: "commod_barchart",
    label: "Barchart Futures",
    assetClass: "commodities",
    envUrl: "SENTIMENT_COMMOD_URL_3"
  }
];

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

/**
 * Normalisation très générique:
 * - si le JSON contient un champ dans [0,100], on le prend
 * - sinon si [-1,1], on remappe vers [0,100]
 * Tu adapteras pour chaque provider si besoin.
 */
function extractScore(json: any): number | null {
  if (!json || typeof json !== "object") return null;

  const candidates = [
    json.score,
    json.value,
    json.index,
    json.sentiment,
    json.fear_and_greed,
    json.data?.score,
    json.data?.value
  ];

  for (const c of candidates) {
    const n = Number(c);
    if (!Number.isFinite(n)) continue;
    if (n >= 0 && n <= 100) return n;
    if (n >= -1 && n <= 1) return Math.round((n + 1) * 50);
  }

  return null;
}

async function fetchOneProvider(cfg: ProviderConfig): Promise<SentimentPoint | null> {
  const url = process.env[cfg.envUrl];
  if (!url) {
    console.warn(`[sentiment] ${cfg.id} ignoré: variable ${cfg.envUrl} absente.`);
    return null;
  }

  const headers: Record<string, string> = {
    Accept: "application/json, text/html;q=0.8,*/*;q=0.5"
  };

  if (cfg.envKey && cfg.keyHeader && process.env[cfg.envKey]) {
    headers[cfg.keyHeader] = process.env[cfg.envKey] as string;
  }

  try {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.warn(`[sentiment] ${cfg.id} HTTP ${res.status}`);
      return null;
    }

    const text = await res.text();

    let json: any | null = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = { html: text };
    }

    const rawScore = extractScore(json);
    if (rawScore == null) {
      console.warn(`[sentiment] ${cfg.id}: score non trouvé, tu pourras adapter extractScore().`);
      return null;
    }

    const score = Math.round(clamp01(rawScore / 100) * 100);

    return {
      id: cfg.id,
      label: cfg.label,
      provider: cfg.id,
      assetClass: cfg.assetClass,
      score,
      raw: json
    };
  } catch (err) {
    console.warn(`[sentiment] ${cfg.id} erreur réseau`, err);
    return null;
  }
}

export async function fetchAllSentimentSources(): Promise<SentimentPoint[]> {
  const out: SentimentPoint[] = [];

  for (const cfg of PROVIDERS) {
    const pt = await fetchOneProvider(cfg);
    if (pt) out.push(pt);
  }

  return out;
}
