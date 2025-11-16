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

export type SentimentSnapshot = {
  generatedAt: string;
  globalScore: number; // 0–100
  themes: ThemeSentiment[];
  riskIndicators: RiskIndicator[];
  focusDrivers: FocusDriver[];
  marketRegime: MarketRegime;
  sources: {
    name: string;
    assetClass: AssetClass | "global";
    weight: number;
  }[];
};
