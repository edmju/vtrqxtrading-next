import { RawArticle } from "../types";

/**
 * NewsAPI "top-headlines" filtre fort et exige souvent country/sources.
 * On passe sur "everything" + mots-clés larges, tri récents.
 */
const API = "https://newsapi.org/v2/everything";

const QUERY =
  // mots clés courants finance/marchés
  encodeURIComponent(
    '(stocks OR markets OR equities OR economy OR earnings OR rate OR inflation OR "central bank" OR oil OR gold)'
  );

export async function fetchNewsapi(langList: string[]): Promise<RawArticle[]> {
  const key = process.env.NEWSAPI_KEY;
  if (!key) return [];
  const langs = langList.length ? langList : ["en"];

  const all: RawArticle[] = [];
  for (const lang of langs) {
    const url = `${API}?q=${QUERY}&language=${lang}&pageSize=100&sortBy=publishedAt&apiKey=${key}`;
    const res = await fetch(url);
    if (!res.ok) {
      // NewsAPI peut renvoyer 426/429/400 → on ignore
      continue;
    }
    const json = await res.json();
    for (const a of json.articles || []) {
      if (!a?.url || !a?.title) continue;
      all.push({
        url: String(a.url),
        title: String(a.title),
        source: a.source?.name || "NewsAPI",
        publishedAt: new Date(a.publishedAt || a.published_at || Date.now()).toISOString(),
        description: (a.description || "").toString(),
        lang
      });
    }
  }
  return all;
}
