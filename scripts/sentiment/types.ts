// scripts/sentiment/types.ts

export type AssetClass = "forex" | "stocks" | "commodities";

export type SentimentPoint = {
  source: string;
  assetClass: AssetClass;
  score: number; // 0–100
  meta?: Record<string, unknown>;
};

export type ThemeSentiment = {
  id: AssetClass;
  label: string;
  score: number; // 0–100
  direction: "bullish" | "bearish" | "neutral";
  comment: string;
};

export type RiskIndicator = {
  id: string;
  label: string;
  score: number; // 0–100
  comment: string;
  value?: string;
  direction?: "up" | "down" | "neutral";
};

export type FocusDriver = {
  label: string;
  weight: number; // 0–1
  description: string;
};

export type MarketRegime = {
  label: string;
  description: string;
  confidence: number; // 0–100
};

export type SentimentTradeIdea = {
  id: string;
  label: string;
  asset: string; // ex: "US500", "EURUSD", "Gold"
  direction: "long" | "short";
  horizon: string; // ex: "intraday", "1–3 jours"
  confidence: number; // 0–100
  reasoning: string;
};

export type SentimentHistoryPoint = {
  generatedAt: string;
  globalScore: number;
  forexScore: number;
  stocksScore: number;
  commoditiesScore: number;
  totalArticles: number;
  bullishArticles: number;
  bearishArticles: number;
};

export type SentimentSnapshot = {
  generatedAt: string;
  globalScore: number;
  themes: ThemeSentiment[];
  riskIndicators: RiskIndicator[];
  focusDrivers: FocusDriver[];
  marketRegime: MarketRegime;
  tradeIdeas: SentimentTradeIdea[];
  totalArticles: number;
  bullishArticles: number;
  bearishArticles: number;
  globalConfidence: number;
  sources: {
    name: string;
    assetClass: AssetClass | "global";
    weight: number;
  }[];
};
