// scripts/sentiment/sources.ts

import type { AssetClass, SentimentPoint } from "./types";

/**
 * Normalise une valeur numérique / string vers un score 0–100.
 */
function toScore0to100(value: unknown): number | null {
  if (typeof value === "number") {
    const x = value;
    if (!Number.isFinite(x)) return null;

    if (x >= 0 && x <= 100) return x;
    if (x >= 0 && x <= 1) return x * 100;
    if (x >= -1 && x <= 1) return (x + 1) * 50;

    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    if (!Number.isFinite(n)) return null;

    if (n >= 0 && n <= 100) return n;
    if (n >= 0 && n <= 1) return n * 100;
    if (n >= -1 && n <= 1) return (n + 1) * 50;

    return null;
  }

  return null;
}

/**
 * Recherche récursive d'un score (0–100 après normalisation) dans un objet JSON.
 */
function findScoreCandidate(obj: unknown): number | null {
  const preferredKeys = ["score", "sentiment", "index", "value", "fear_greed"];

  const visit = (value: unknown): number | null => {
    const direct = toScore0to100(value);
    if (direct !== null) return direct;

    if (Array.isArray(value)) {
      for (const v of value) {
        const r = visit(v);
        if (r !== null) return r;
      }
      return null;
    }

    if (value && typeof value === "object") {
      const rec = value as Record<string, unknown>;

      for (const k of preferredKeys) {
        if (k in rec) {
          const r = visit(rec[k]);
          if (r !== null) return r;
        }
      }

      for (const v of Object.values(rec)) {
        const r = visit(v);
        if (r !== null) return r;
      }
    }

    return null;
  };

  const score = visit(obj);
  if (score === null) return null;

  const clamped = Math.max(0, Math.min(100, score));
  return Math.round(clamped);
}

/**
 * Cas particulier Alpha Vantage NEWS_SENTIMENT.
 */
function alphaVantageNewsStats(json: any): {
  score: number | null;
  articleCount: number;
  bullishCount: number;
  bearishCount: number;
} | null {
  if (!json || !Array.isArray(json.feed)) return null;

  const scores: number[] = [];
  let articleCount = 0;
  let bullishCount = 0;
  let bearishCount = 0;

  for (const item of json.feed) {
    if (!item) continue;
    articleCount++;

    const raw = Number(item?.overall_sentiment_score);
    if (Number.isFinite(raw)) {
      scores.push(raw);
    }

    const label = String(item?.overall_sentiment_label || "").toLowerCase();
    if (label.includes("bull")) {
      bullishCount++;
    } else if (label.includes("bear")) {
      bearishCount++;
    } else if (Number.isFinite(raw)) {
      if (raw > 0.05) bullishCount++;
      else if (raw < -0.05) bearishCount++;
    }
  }

  let score: number | null = null;
  if (scores.length) {
    const mean =
      scores.reduce((acc, v) => acc + v, 0) / (scores.length || 1); // [-1,1]
    const scaled = (mean + 1) * 50; // [0,100]
    if (Number.isFinite(scaled)) {
      const clamped = Math.max(0, Math.min(100, scaled));
      score = Math.round(clamped);
    }
  }

  return {
    score,
    articleCount,
    bullishCount,
    bearishCount,
  };
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
  const rawUrl = process.env[envName];
  if (!rawUrl || !rawUrl.trim()) {
    return [];
  }

  const url = rawUrl.trim();
  const json = await fetchJsonSafe(url);
  if (!json) return [];

  let score: number | null = null;
  let articleCount = 0;
  let bullishCount = 0;
  let bearishCount = 0;

  const stats = alphaVantageNewsStats(json);
  if (stats) {
    score = stats.score;
    articleCount = stats.articleCount;
    bullishCount = stats.bullishCount;
    bearishCount = stats.bearishCount;
  }

  if (score === null) {
    score = findScoreCandidate(json);
  }

  if (score === null) {
    console.warn("[sentiment] no score candidate for", envName);
    return [];
  }

  const meta: Record<string, unknown> = { url };
  if (articleCount) {
    meta.articleCount = articleCount;
    meta.bullishCount = bullishCount;
    meta.bearishCount = bearishCount;
  }

  return [
    {
      source: envName,
      assetClass,
      score: Math.max(0, Math.min(100, Math.round(score))),
      meta,
    },
  ];
}

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
  tasks.push(buildPointsForEnv("SENTIMENT_STOCKS_URL_4", "stocks")); // optionnel

  // Commodities
  tasks.push(buildPointsForEnv("SENTIMENT_COMMOD_URL_1", "commodities"));
  tasks.push(buildPointsForEnv("SENTIMENT_COMMOD_URL_2", "commodities"));
  tasks.push(buildPointsForEnv("SENTIMENT_COMMOD_URL_3", "commodities"));

  const results = await Promise.all(tasks);
  const flat = results.flat();

  console.log("[sentiment] collected points:", flat.length);
  return flat;
}
