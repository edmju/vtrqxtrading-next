import { RawArticle } from "../types";

/**
 * Parse RSS simple (sans dépendance).
 */
function parseItems(xml: string): RawArticle[] {
  const items = Array.from(xml.matchAll(/<item>[\s\S]*?<\/item>/g));
  const take = (tag: string, s: string) =>
    (s.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i")) || [,""])[1]
      .replace(/<!\[CDATA\[|\]\]>/g, "")
      .trim();

  return items.map((m) => {
    const block = m[0];
    const link = take("link", block);
    const title = take("title", block);
    const pub = take("pubDate", block);
    const desc = take("description", block);
    return {
      url: link,
      title,
      source: "RSS",
      publishedAt: new Date(pub || Date.now()).toISOString(),
      description: desc
    } as RawArticle;
  }).filter(a => a.url && a.title);
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/** Reuters business (public-safe) */
export async function fetchReutersRss(): Promise<RawArticle[]> {
  const xml = await fetchText("https://www.reutersagency.com/feed/?best-topics=business&post_type=best");
  if (!xml) return [];
  const rows = parseItems(xml).map(a => ({ ...a, source: "Reuters" }));
  return rows;
}

/** Bloomberg: flux public (podcast/markets) — donne du marché frais */
export async function fetchBloombergRss(): Promise<RawArticle[]> {
  const xml = await fetchText("https://feeds.simplecast.com/54nAGcIl");
  if (!xml) return [];
  const rows = parseItems(xml).map(a => ({ ...a, source: "Bloomberg" }));
  return rows;
}
