// scripts/sentiment/sources.ts

import type { AssetClass, SentimentPoint } from "./types";

/**
 * Recherche récursive d'un score 0–100 dans un objet JSON.
 * On privilégie les clés qui ressemblent à score/sentiment/index.
 */
function findScoreCandidate(obj: unknown): number | null {
  const preferredKeys = ["score", "sentiment", "index", "value", "fear_greed"];

  const visit = (value: unknown): number | null => {
    if (typeof value === "number" && value >= 0 && value <= 100) {
      return value;
    }
    if (value && typeof value === "object") {
      const rec = value as Record<string, unknown>;
      // 1) clés "intéressantes" en priorité
      for (const k of preferredKeys) {
        if (k in rec) {
          const r = visit(rec[k]);
          if (r !== null) return r;
        }
      }
      // 2) sinon, tout le reste
      for (const v of Object.values(rec)) {
        const r = visit(v);
        if (r !== null) return r;
      }
    }
    if (Array.isArray(value)) {
      for (const v of value) {
        const r = visit(v);
        if (r !== null) return r;
      }
    }
    return null;
  };

  return visit(obj);
}

async function fetchJsonSafe(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) {
      console.warn("[sentiment] HTTP", res.status, "for", url);
      return null;
    }

    const text = await res.text();

    try {
      return JSON.parse(text);
    } catch {
      // HTML ou autre → on ignore
      console.warn("[sentiment] non-JSON response, ignore", url);
      return null;
    }
  } catch (err) {
    console.warn("[sentiment] fetch error for", url, err);
    return null;
  }
}

async function buildPointsForEnv(
  envName: string,
  assetClass: AssetClass
): Promise<SentimentPoint[]> {
  const url = process.env[envName];
  if (!url) return [];

  const json = await fetchJsonSafe(url);
  if (!json) return [];

  const score = findScoreCandidate(json);
  if (score === null) {
    console.warn("[sentiment] no score candidate for", envName);
    return [];
  }

  return [
    {
      source: envName,
      assetClass,
      score: Math.max(0, Math.min(100, Math.round(score))),
      meta: { url },
    },
  ];
}

/**
 * Récupère tous les points de sentiment disponibles à partir
 * des URLs configurées via les variables d'environnement.
 */
export async function fetchAllSentimentPoints(): Promise<SentimentPoint[]> {
  const tasks: Promise<SentimentPoint[]>[] = [];

  // Forex
  tasks.push(buildPointsForEnv("SENTIMENT_FOREX_URL_1", "forex"));
  tasks.push(buildPointsForEnv("SENTIMENT_FOREX_URL_2", "forex"));
  tasks.push(buildPointsForEnv("SENTIMENT_FOREX_URL_3", "forex"));

  // Actions / indices
  tasks.push(buildPointsForEnv("SENTIMENT_STOCKS_URL_1", "stocks"));
  tasks.push(buildPointsForEnv("SENTIMENT_STOCKS_URL_2", "stocks"));
  tasks.push(buildPointsForEnv("SENTIMENT_STOCKS_URL_3", "stocks"));
  tasks.push(buildPointsForEnv("SENTIMENT_STOCKS_URL_4", "stocks"));

  // Commodities
  tasks.push(buildPointsForEnv("SENTIMENT_COMMOD_URL_1", "commodities"));
  tasks.push(buildPointsForEnv("SENTIMENT_COMMOD_URL_2", "commodities"));
  tasks.push(buildPointsForEnv("SENTIMENT_COMMOD_URL_3", "commodities"));

  const results = await Promise.all(tasks);
  const flat = results.flat();

  console.log("[sentiment] collected points:", flat.length);
  return flat;
}
