// scripts/sentiment/types.ts

export type AssetClass = "forex" | "stocks" | "commodities";

export type SentimentPoint = {
  id: string;            // id interne
  label: string;         // nom lisible du signal
  provider: string;      // nom du site / API
  assetClass: AssetClass;
  score: number;         // 0..100 (50 = neutre)
  raw?: unknown;         // payload brut si tu veux debugger
};

export type SentimentCategory = {
  key: AssetClass;
  label: string;
  score: number;         // moyenne 0..100
  sources: SentimentPoint[];
};

export type AIFocusDriver = {
  label: string;
  weight: number;        // 0..1 (importance)
  description: string;
};

export type AIMarketRegime = {
  label: string;         // Bullish / Risk-off / etc.
  description: string;
  confidence: number;    // 0..100
};

export type SentimentSnapshot = {
  generatedAt: string;
  globalScore: number;           // moyenne globale 0..100
  categories: SentimentCategory[];
  sources: SentimentPoint[];     // tous les points individuels
  focusDrivers?: AIFocusDriver[]; 
  marketRegime?: AIMarketRegime;
};
