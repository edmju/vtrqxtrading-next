import { RawArticle } from "../types";

const API = "https://finnhub.io/api/v1/news?category=general";

export async function fetchFinnhub(): Promise<RawArticle[]> {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) return [];
  const res = await fetch(`${API}&token=${key}`);
  if (!res.ok) return [];
  const json = await res.json();
  return (json || []).map((a: any) => ({
    url: a.url,
    title: a.headline,
    source: a.source || "Finnhub",
    publishedAt: new Date((a.datetime || 0) * 1000).toISOString(),
    description: a.summary || "",
    lang: "en",
  }));
}
