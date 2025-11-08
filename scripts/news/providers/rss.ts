import { RawArticle } from "../types";

/**
 * Parser RSS + Atom (Reuters, CNBC, Yahoo, FT...).
 * - Support <item> (RSS) et <entry> (Atom)
 * - Nettoyage CDATA
 */

function strip(s: string) {
  return (s || "").replace(/<!\[CDATA\[|\]\]>/g, "").trim();
}

function parseRss(xml: string): RawArticle[] {
  const items = Array.from(xml.matchAll(/<item>[\s\S]*?<\/item>/gi));
  const take = (tag: string, s: string) =>
    (s.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i")) || [,""])[1];

  if (items.length) {
    return items
      .map((m) => {
        const b = m[0];
        const link = strip(take("link", b));
        const title = strip(take("title", b));
        const pub = strip(take("pubDate", b));
        const desc = strip(take("description", b));
        return { url: link, title, publishedAt: new Date(pub || Date.now()).toISOString(), description: desc } as RawArticle;
      })
      .filter(a => a.url && a.title);
  }

  // Atom
  const entries = Array.from(xml.matchAll(/<entry>[\s\S]*?<\/entry>/gi));
  if (entries.length) {
    return entries
      .map((m) => {
        const b = m[0];
        const title = strip((b.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [,""])[1]);
        const link = strip((b.match(/<link[^>]*href="([^"]+)"/i) || [,""])[1]);
        const pub = strip((b.match(/<(updated|published)>([\s\S]*?)<\/(updated|published)>/i) || [,""])[2]);
        const desc = strip((b.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i) || [,""])[1]);
        return { url: link, title, publishedAt: new Date(pub || Date.now()).toISOString(), description: desc } as RawArticle;
      })
      .filter(a => a.url && a.title);
  }

  return [];
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/xml,text/xml,*/*" } });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function fetchOne(url: string, label: string): Promise<RawArticle[]> {
  const xml = await fetchText(url);
  if (!xml) return [];
  const rows = parseRss(xml).map(a => ({ ...a, source: label }));
  return rows;
}

/**
 * Multiples flux publics pour garantir du contenu même si une source tombe.
 * (Les URLs ci-dessous sont des flux RSS/Atom publics répandus.)
 */
const FEEDS: { url: string; label: string }[] = [
  // Reuters (feeds historiques stables)
  { url: "https://feeds.reuters.com/reuters/businessNews", label: "Reuters" },
  { url: "https://feeds.reuters.com/reuters/topNews",      label: "Reuters" },
  { url: "https://feeds.reuters.com/reuters/USBusinessNews", label: "Reuters" },

  // CNBC – Top News & Analysis (Markets)
  { url: "https://www.cnbc.com/id/100003114/device/rss/rss.html", label: "CNBC" },

  // Yahoo Finance – catégorie actions
  { url: "https://feeds.finance.yahoo.com/rss/2.0/category-stocks?region=US&lang=en-US", label: "Yahoo Finance" },

  // Financial Times (Atom) – home US
  { url: "https://www.ft.com/rss/home/us", label: "Financial Times" }
];

export async function fetchAllRss(): Promise<RawArticle[]> {
  const parts = await Promise.all(FEEDS.map(f => fetchOne(f.url, f.label)));
  return parts.flat();
}
