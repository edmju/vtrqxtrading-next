import { RawArticle } from "../types";

const API = "https://financialmodelingprep.com/api/v3/stock_news?limit=100";

export async function fetchFmp(): Promise<RawArticle[]> {
  const key = process.env.FMP_API_KEY;
  if (!key) return [];
  const res = await fetch(`${API}&apikey=${key}`);
  if (!res.ok) return [];
  const json = await res.json();
  return (json || []).map((a: any) => ({
    url: a.url,
    title: a.title,
    source: a.site || "FMP",
    publishedAt: new Date(a.publishedDate).toISOString(),
    description: a.text || "",
    tickers: a.symbol ? [a.symbol] : [],
    lang: "en",
  }));
}
