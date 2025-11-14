// scripts/sentiment/types.ts

export type AssetClass = "forex" | "stocks" | "commodities";

export type SentimentPoint = {
  id: string;
  label: string;
  provider: string;
  assetClass: AssetClass;
  score: number; // 0..100 (50 = neutre)
  raw?: unknown;
};

export type SentimentTheme = {
  id: AssetClass;
  label: string;
  score: number; // 0..100
  direction?: "risk-on" | "risk-off" | "neutral";
  comment?: string;
};

export type RiskIndicator = {
  id: string;
  label: string;
  value: string;
  score: number; // 0..100
  direction: "up" | "down" | "neutral";
  comment?: string;
};

export type AIFocusDriver = {
  label: string;
  weight: number; // 0..1
  description: string;
};

export type AIMarketRegime = {
  label: string;
  description: string;
  confidence: number; // 0..100
};

export type SentimentSnapshot = {
  generatedAt: string;
  globalScore: number; // 0..100
  themes: SentimentTheme[]; // forex / stocks / commodities
  riskIndicators: RiskIndicator[];
  focusDrivers?: AIFocusDriver[];
  marketRegime?: AIMarketRegime;
  sources: string[]; // noms des providers utilisés
};
