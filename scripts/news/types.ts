export type RawArticle = {
  id?: string;
  url: string;
  title: string;
  source: string;
  publishedAt: string;
  description?: string;
  tickers?: string[];
  lang?: string;
  score?: number;      // score hot
  hits?: string[];     // mots/expressions qui ont matché (preuve)
};

export type NewsBundle = {
  generatedAt: string;
  total: number;
  articles: RawArticle[];
};

export type AiAction = {
  symbol: string;
  direction: "BUY" | "SELL";
  conviction: number;   // 0..10 (intention de trade)
  confidence: number;   // 0..100 (fiabilité du signal)
  reason: string;       // explications synthétiques
};

export type AiOutputs = {
  generatedAt: string;
  mainThemes: { label: string; weight: number }[];
  actions: AiAction[];
};
