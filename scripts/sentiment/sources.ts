// scripts/sentiment/sources.ts

import { AssetClass, SentimentPoint } from "./types";

type RawNewsResponse = {
  feed?: {
    overall_sentiment_score?: number;
    overall_sentiment_label?: string;
  }[];
};

// Normalise un score -1..1 en 0..100
function normaliseScore(raw: number | undefined | null): number {
  if (raw == null || Number.isNaN(raw)) return 50;
  const clamped = Math.max(-1, Math.min(1, raw));
  return Math.round((clamped + 1) * 50);
}

async function fetchJson(url: string): Promise<RawNewsResponse | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn("[sentiment] fetch failed", url, res.status);
      return null;
    }
    const json = (await res.json()) as RawNewsResponse;
    return json;
  } catch (err) {
    console.error("[sentiment] fetch error", url, err);
    return null;
  }
}

function buildPointFromNews(
  url: string,
  assetClass: AssetClass,
  json: RawNewsResponse | null
): SentimentPoint {
  if (!json || !Array.isArray(json.feed) || json.feed.length === 0) {
    return {
      source: url,
      assetClass,
      score: 50,
      meta: {
        url,
        articleCount: 0,
        bullishCount: 0,
        bearishCount: 0,
      },
    };
  }

  let sumScore = 0;
  let articleCount = 0;
  let bullishCount = 0;
  let bearishCount = 0;

  for (const item of json.feed) {
    if (!item) continue;

    const rawScore =
      typeof item.overall_sentiment_score === "number"
        ? item.overall_sentiment_score
        : 0;
    sumScore += rawScore;
    articleCount += 1;

    const label = (item.overall_sentiment_label || "").toLowerCase();
    if (label.includes("bull")) bullishCount += 1;
    if (label.includes("bear")) bearishCount += 1;
  }

  const avg = articleCount ? sumScore / articleCount : 0;
  const score = normaliseScore(avg);

  return {
    source: url,
    assetClass,
    score,
    meta: {
      url,
      articleCount,
      bullishCount,
      bearishCount,
    },
  };
}

export async function fetchAllSentimentPoints(): Promise<SentimentPoint[]> {
  const forexUrls = [
    process.env.SENTIMENT_FOREX_URL_1,
    process.env.SENTIMENT_FOREX_URL_2,
    process.env.SENTIMENT_FOREX_URL_3,
  ].filter(Boolean) as string[];

  const stocksUrls = [
    process.env.SENTIMENT_STOCKS_URL_1,
    process.env.SENTIMENT_STOCKS_URL_2,
    process.env.SENTIMENT_STOCKS_URL_3,
  ].filter(Boolean) as string[];

  const commodUrls = [
    process.env.SENTIMENT_COMMOD_URL_1,
    process.env.SENTIMENT_COMMOD_URL_2,
    process.env.SENTIMENT_COMMOD_URL_3,
  ].filter(Boolean) as string[];

  const tasks: Promise<SentimentPoint | null>[] = [];

  for (const url of forexUrls) {
    tasks.push(
      fetchJson(url).then((json) => buildPointFromNews(url, "forex", json))
    );
  }
  for (const url of stocksUrls) {
    tasks.push(
      fetchJson(url).then((json) => buildPointFromNews(url, "stocks", json))
    );
  }
  for (const url of commodUrls) {
    tasks.push(
      fetchJson(url).then((json) => buildPointFromNews(url, "commodities", json))
    );
  }

  const results = await Promise.all(tasks);
  const points = results.filter(Boolean) as SentimentPoint[];

  console.log("[sentiment] collected points:", points.length);

  return points;
}
