// scripts/news/types.ts

export type RawArticle = {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  description?: string;
  score?: number;
  hits?: string[];
};

export type NewsBundle = {
  generatedAt: string;
  total: number;
  articles: RawArticle[];
};

export type AIAction = {
  symbol: string;
  direction: "BUY" | "SELL";
  conviction: number; // 0..10
  confidence: number; // 0..100
  reason: string;
  evidenceIds?: string[];

  explanation?: string;
  horizon?: string;
  themeLabel?: string;
  articleCount?: number;
};

export type AITheme = {
  label: string;
  weight: number; // 0..1
  summary?: string;
  evidenceIds?: string[];
};

export type AICluster = {
  label: string;
  weight: number;
  summary: string;
  articleIds: string[];
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

export type AIOutput = {
  generatedAt: string;
  mainThemes: AITheme[];
  actions: AIAction[];
  clusters?: AICluster[];
  focusDrivers?: AIFocusDriver[];
  marketRegime?: AIMarketRegime;
};
