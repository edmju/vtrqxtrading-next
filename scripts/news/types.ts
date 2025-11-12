export type RawArticle = {
  id?: string;
  url: string;
  title: string;
  source: string;
  publishedAt: string;
  description?: string;
  tickers?: string[];
  lang?: string;
  score?: number;      // score hot (rule-based)
  hits?: string[];     // mots/expressions détectés (preuves)
};

export type NewsBundle = {
  generatedAt: string;
  total: number;
  articles: RawArticle[];
};

export type AiAction = {
  symbol: string;
  direction: "BUY" | "SELL";
  conviction: number;     // 0..10 (intention de trade)
  confidence: number;     // 0..100 (fiabilité synthétisée)
  reason: string;         // justification courte
  evidenceIds?: string[]; // ids d’articles qui justifient l’action
};

export type AiOutputs = {
  generatedAt: string;
  mainThemes: { label: string; weight: number }[];
  actions: AiAction[];
};
