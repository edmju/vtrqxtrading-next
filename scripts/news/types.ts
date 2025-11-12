export type RawArticle = {
  id?: string;
  url: string;
  title: string;
  source: string;
  publishedAt: string;
  description?: string;
  tickers?: string[];
  lang?: string;
  score?: number;
  hits?: string[];
};

export type NewsBundle = {
  generatedAt: string;
  total: number;
  articles: RawArticle[];
};

export type AiAction = {
  symbol: string;
  direction: "BUY" | "SELL";
  conviction: number;     // 0..10
  confidence: number;     // 0..100
  reason: string;
  evidenceIds?: string[]; // ids d’articles support
};

export type AiTheme = {
  label: string;
  weight: number;         // 0..1
  summary?: string;       // ≤ ~30 mots
  evidenceIds?: string[]; // ids d’articles pour ce thème
};

export type AiCluster = {
  label: string;
  weight: number;         // 0..1
  summary: string;
  articleIds: string[];
};

export type AiOutputs = {
  generatedAt: string;
  mainThemes: AiTheme[];
  actions: AiAction[];
  clusters?: AiCluster[]; // pour l’UI “smart”
};
