import { RawArticle } from "../types";

const API = "https://newsapi.org/v2/top-headlines";

export async function fetchNewsapi(langList: string[]): Promise<RawArticle[]> {
  const key = process.env.NEWSAPI_KEY;
  if (!key) return [];
  const langs = langList.length ? langList : ["en"];
  const all: RawArticle[] = [];
  for (const lang of langs) {
    const url = `${API}?language=${lang}&pageSize=100&apiKey=${key}`;
    const res = await fetch(url);
    if (!res.ok) continue;
    const json = await res.json();
    for (const a of json.articles || []) {
      if (!a.url || !a.title) continue;
      all.push({
        url: a.url,
        title: a.title,
        source: a.source?.name || "NewsAPI",
        publishedAt: new Date(a.publishedAt || a.published_at || Date.now()).toISOString(),
        description: a.description || "",
        lang,
      });
    }
  }
  return all;
}
