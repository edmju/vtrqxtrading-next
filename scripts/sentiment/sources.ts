// scripts/sentiment/sources.ts

import { SentimentPoint, AssetClass } from "./types";
import fetch from "node-fetch";

type ProviderConfig = {
  id: string;
  label: string;
  assetClass: AssetClass;
  envUrl: string;              // nom de la variable d'env qui contient l'URL
  envKey?: string;             // optionnel: API key
  keyHeader?: string;          // nom du header pour l'API key
};

const PROVIDERS: ProviderConfig[] = [
  // FOREX (3 sources)
  {
    id: "forex_1",
    label: "FX Sentiment #1",
    assetClass: "forex",
    envUrl: "SENTIMENT_FOREX_URL_1",
    envKey: "SENTIMENT_FOREX_KEY_1",
    keyHeader: "Authorization",
  },
  {
    id: "forex_2",
    label: "FX Sentiment #2",
    assetClass: "forex",
    envUrl: "SENTIMENT_FOREX_URL_2",
  },
  {
    id: "forex_3",
    label: "FX Sentiment #3",
    assetClass: "forex",
    envUrl: "SENTIMENT_FOREX_URL_3",
  },

  // STOCKS (4 sources)
  {
    id: "equity_1",
    label: "Equity Sentiment #1",
    assetClass: "stocks",
    envUrl: "SENTIMENT_STOCKS_URL_1",
    envKey: "SENTIMENT_STOCKS_KEY_1",
    keyHeader: "X-API-Key",
  },
  {
    id: "equity_2",
    label: "Equity Sentiment #2",
    assetClass: "stocks",
    envUrl: "SENTIMENT_STOCKS_URL_2",
  },
  {
    id: "equity_3",
    label: "Equity Sentiment #3",
    assetClass: "stocks",
    envUrl: "SENTIMENT_STOCKS_URL_3",
  },
  {
    id: "equity_4",
    label: "Equity Sentiment #4",
    assetClass: "stocks",
    envUrl: "SENTIMENT_STOCKS_URL_4",
  },

  // COMMODITIES (3 sources)
  {
    id: "commod_1",
    label: "Commodities Sentiment #1",
    assetClass: "commodities",
    envUrl: "SENTIMENT_COMMOD_URL_1",
  },
  {
    id: "commod_2",
    label: "Commodities Sentiment #2",
    assetClass: "commodities",
    envUrl: "SENTIMENT_COMMOD_URL_2",
  },
  {
    id: "commod_3",
    label: "Commodities Sentiment #3",
    assetClass: "commodities",
    envUrl: "SENTIMENT_COMMOD_URL_3",
  },
];

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

/**
 * Normalise un JSON arbitraire vers un score 0..100.
 * Hypothèse de base:
 *  - soit json.score/json.value/json.index est déjà 0..100
 *  - soit c'est -1..1 (on recentre)
 * Tu pourras adapter la logique pour chaque API si besoin.
 */
function extractScore(json: any): number | null {
  if (!json || typeof json !== "object") return null;

  const candidates = [
    json.score,
    json.value,
    json.index,
    json.sentiment,
    json.data?.score,
    json.data?.value,
  ];

  for (const c of candidates) {
    const n = Number(c);
    if (!Number.isFinite(n)) continue;
    // si déjà 0..100
    if (n >= 0 && n <= 100) return n;
    // si -1..1 → map vers 0..100
    if (n >= -1 && n <= 1) return Math.round((n + 1) * 50);
  }

  return null;
}

async function fetchOneProvider(cfg: ProviderConfig): Promise<SentimentPoint | null> {
  const url = process.env[cfg.envUrl];
  if (!url) return null;

  const headers: Record<string, string> = {
    Accept: "application/json",
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
    const json = await res.json();
    const score = extractScore(json);
    if (score == null) {
      console.warn(`[sentiment] ${cfg.id} pas de score exploitable.`);
      return null;
    }

    return {
      id: cfg.id,
      label: cfg.label,
      provider: cfg.id,
      assetClass: cfg.assetClass,
      score: Math.round(clamp01(score / 100) * 100),
      raw: json,
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
