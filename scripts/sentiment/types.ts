// scripts/sentiment/types.ts
export type AssetClass = "forex" | "stocks" | "commodities";

export type SentimentPointMeta = {
  url?: string;
  articleCount?: number;
  bullishCount?: number;
  bearishCount?: number;
  [key: string]: unknown;
};

export type SentimentPoint = {
  source: string;
  assetClass: AssetClass;
  score: number; // 0–100 normalisé
  meta?: SentimentPointMeta;
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

export type SentimentSource = {
  name: string;
  assetClass: AssetClass | "global";
  weight: number;
};

export type SentimentHistoryPoint = {
  timestamp: string;
  globalScore: number;
  forexScore?: number;
  stocksScore?: number;
  commoditiesScore?: number;
  totalArticles?: number;
};

export type SentimentSuggestion = {
  id: string;
  label: string;
  assetClass: AssetClass | "global";
  bias: "long" | "short" | "neutral";
  confidence: number; // 0–100
  rationale: string;
};

export type SentimentSnapshot = {
  generatedAt: string;
  globalScore: number; // 0–100
  marketRegime: MarketRegime;
  themes: ThemeSentiment[];
  riskIndicators: RiskIndicator[];
  focusDrivers: FocusDriver[];
  sources: SentimentSource[];

  history?: SentimentHistoryPoint[];
  globalConfidence?: number;
  sourceConsensus?: number;
  tensionScore?: number;
  suggestions?: SentimentSuggestion[];

  totalArticles?: number;
  bullishArticles?: number;
  bearishArticles?: number;
};
