export type RawArticle = {
  id?: string;
  url: string;
  title: string;
  source: string;
  publishedAt: string;
  description?: string;
  tickers?: string[];
  lang?: string;
};

export type NewsBundle = {
  generatedAt: string;
  total: number;
  articles: RawArticle[];
};

export type AiOutputs = {
  generatedAt: string;
  mainThemes: { label: string; weight: number }[];
  actions: {
    symbol: string;
    direction: "BUY" | "SELL";
    conviction: number;
    reason: string;
  }[];
};
