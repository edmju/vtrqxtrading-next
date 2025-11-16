// src/app/api/sentiment/_newsSentiment.ts

import path from "path";
import { promises as fs } from "fs";

export type BucketId =
  | "forex_macro"
  | "forex_usd"
  | "forex_crosses"
  | "stocks_macro"
  | "stocks_micro"
  | "stocks_flow"
  | "commodities_energy"
  | "commodities_metals"
  | "commodities_agri";

type NewsArticle = {
  url?: string;
  title?: string;
  publishedAt?: string;
  description?: string;
  source?: string;
  lang?: string;
  id?: string;
  score?: number;
  hits?: string[];
};

type NewsDataset = {
  generatedAt?: string;
  total?: number;
  articles?: NewsArticle[];
};

async function loadNewsDataset(): Promise<NewsDataset | null> {
  try {
    const full = path.join(
      process.cwd(),
      "public",
      "data",
      "news",
      "latest.json"
    );
    const raw = await fs.readFile(full, "utf8");
    const json = JSON.parse(raw) as NewsDataset;

    if (!json || !Array.isArray(json.articles)) {
      console.warn("[sentiment-api] invalid news dataset shape");
      return null;
    }

    return json;
  } catch (err) {
    console.warn("[sentiment-api] unable to read latest news file", err);
    return null;
  }
}

function buildText(article: NewsArticle): string {
  const parts: string[] = [];
  if (article.title) parts.push(article.title);
  if (article.description) parts.push(article.description);
  if (Array.isArray(article.hits)) parts.push(article.hits.join(" "));
  return parts.join(" ").toLowerCase();
}

function includesAny(text: string, keywords: string[]): boolean {
  for (const k of keywords) {
    const key = k.toLowerCase();
    if (key && text.includes(key)) return true;
  }
  return false;
}

function averageScore(articles: NewsArticle[]): number | null {
  const scores = articles
    .map((a) =>
      typeof a.score === "number" && Number.isFinite(a.score) ? a.score : NaN
    )
    .filter((v) => Number.isFinite(v)) as number[];

  if (!scores.length) return null;

  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const clamped = Math.max(0, Math.min(100, mean));
  return Math.round(clamped);
}

function articleMatchesBucket(article: NewsArticle, bucketId: BucketId): boolean {
  const text = buildText(article);
  const source = (article.source || "").toLowerCase();

  const isEquitySource =
    source === "financial times" ||
    source === "telegraph business" ||
    source === "cnbc" ||
    source === "investing.com";

  switch (bucketId) {
    /* ------------------------------ FOREX ------------------------------ */
    case "forex_macro": {
      const keywords = [
        "fed",
        "ecb",
        "boe",
        "boj",
        "rate cut",
        "rate hike",
        "interest rates",
        "inflation",
        "recession",
        "gdp",
        "growth",
        "trade war",
        "tariff",
        "tariffs",
        "sanction",
        "sanctions",
        "jobs",
        "unemployment",
      ];
      return includesAny(text, keywords);
    }

    case "forex_usd": {
      const keywords = [
        "dollar",
        "u.s. dollar",
        "us dollar",
        "usd",
        "eur/usd",
        "eurusd",
        "gbp/usd",
        "gbpusd",
        "usd/jpy",
        "usdjpy",
        "aud/usd",
        "audusd",
        "cad",
        "loonie",
      ];
      return includesAny(text, keywords);
    }

    case "forex_crosses": {
      const keywords = [
        "eur/",
        "gbp/",
        "jpy",
        "yen",
        "euro",
        "sterling",
        "yuan",
        "renminbi",
        "cad",
        "aud",
        "nzd",
        "fx",
        "forex",
      ];
      if (source === "fxstreet") return true;
      return includesAny(text, keywords);
    }

    /* ------------------------------ STOCKS ----------------------------- */
    case "stocks_macro": {
      const keywords = [
        "stocks",
        "equities",
        "stock market",
        "indices",
        "index",
        "ftse",
        "s&p",
        "nasdaq",
        "dow",
        "tariff",
        "tariffs",
        "recession",
        "inflation",
        "valuation",
        "bubble",
        "correction",
      ];
      return isEquitySource && includesAny(text, keywords);
    }

    case "stocks_micro": {
      const keywords = [
        "ipo",
        "earnings",
        "earnings miss",
        "profit warning",
        "guidance",
        "share buyback",
        "buyback",
        "dividend",
        "merger",
        "acquisition",
        "m&a",
        "lawsuit",
        "job cuts",
        "layoffs",
      ];
      return isEquitySource && includesAny(text, keywords);
    }

    case "stocks_flow": {
      const keywords = [
        "rally",
        "sell-off",
        "selloff",
        "volatility",
        "risk-on",
        "risk off",
        "risk-off",
        "rotation",
        "outflows",
        "inflows",
        "flows",
      ];
      return isEquitySource && includesAny(text, keywords);
    }

    /* ---------------------------- COMMODITIES -------------------------- */
    case "commodities_energy": {
      const keywords = [
        "oil",
        "crude",
        "brent",
        "wti",
        "gas",
        "natural gas",
        "lng",
        "lpg",
        "pipeline",
        "refinery",
        "refiner",
        "opec",
        "energy",
      ];
      if (source === "oilprice") return true;
      return includesAny(text, keywords);
    }

    case "commodities_metals": {
      const keywords = [
        "gold",
        "silver",
        "copper",
        "aluminium",
        "aluminum",
        "iron ore",
        "steel",
        "metal",
        "metals",
        "bullion",
      ];
      return includesAny(text, keywords);
    }

    case "commodities_agri": {
      const keywords = [
        "wheat",
        "corn",
        "maize",
        "soy",
        "soybean",
        "grain",
        "grains",
        "coffee",
        "cocoa",
        "sugar",
        "cotton",
        "beef",
        "pork",
        "agriculture",
        "harvest",
      ];
      return includesAny(text, keywords);
    }

    default:
      return false;
  }
}

export async function computeBucketScore(bucketId: BucketId): Promise<number> {
  const dataset = await loadNewsDataset();
  const articles = dataset?.articles ?? [];

  if (!articles.length) {
    console.warn("[sentiment-api] no articles in latest news");
    return 50;
  }

  const globalScore = averageScore(articles) ?? 50;

  const matches = articles.filter((a) => articleMatchesBucket(a, bucketId));
  const bucketScore = averageScore(matches);

  if (bucketScore !== null) return bucketScore;

  // Fallback : si le bucket n'a pas de matches, on retourne un score global neutre-ish
  return globalScore;
}
