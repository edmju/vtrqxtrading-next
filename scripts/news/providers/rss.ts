import { RawArticle } from "../types";

function decodeEntities(s: string) {
  return (s || "")
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function parseRss(xml: string): RawArticle[] {
  const items = Array.from(xml.matchAll(/<item>[\s\S]*?<\/item>/gi));
  const take = (tag: string, s: string) =>
    (s.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i")) || [,""])[1];

  if (items.length) {
    return items.map(m => {
      const b = m[0];
      const link = decodeEntities(take("link", b));
      const title = decodeEntities(take("title", b));
      const pub = decodeEntities(take("pubDate", b));
      const desc = decodeEntities(take("description", b));
      return { url: link, title, publishedAt: new Date(pub || Date.now()).toISOString(), description: desc } as RawArticle;
    }).filter(a => a.url && a.title);
  }

  const entries = Array.from(xml.matchAll(/<entry>[\s\S]*?<\/entry>/gi));
  if (entries.length) {
    return entries.map(m => {
      const b = m[0];
      const title = decodeEntities((b.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [,""])[1]);
      const link = decodeEntities((b.match(/<link[^>]*href="([^"]+)"/i) || [,""])[1]);
      const pub = decodeEntities((b.match(/<(updated|published)>([\s\S]*?)<\/(updated|published)>/i) || [,""])[2]);
      const desc = decodeEntities((b.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i) || [,""])[1]);
      return { url: link, title, publishedAt: new Date(pub || Date.now()).toISOString(), description: desc } as RawArticle;
    }).filter(a => a.url && a.title);
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
  return parseRss(xml).map(a => ({ ...a, source: label }));
}

// Flux business/markets larges
const FEEDS: { url: string; label: string }[] = [
  { url: "https://feeds.reuters.com/reuters/businessNews", label: "Reuters" },
  { url: "https://feeds.reuters.com/reuters/marketsNews",  label: "Reuters" },
  { url: "https://www.cnbc.com/id/10001147/device/rss/rss.html", label: "CNBC" }, // Markets
  { url: "https://www.cnbc.com/id/100003114/device/rss/rss.html", label: "CNBC" }, // Top business
  { url: "https://feeds.finance.yahoo.com/rss/2.0/category-markets?region=US&lang=en-US", label: "Yahoo Finance" },
  { url: "https://www.ft.com/markets?format=rss", label: "Financial Times" },
  { url: "https://www.marketwatch.com/markets?mod=rss", label: "MarketWatch" },
  { url: "https://apnews.com/hub/ap-top-news?rss=1", label: "AP News" }
];

export async function fetchAllRss(): Promise<RawArticle[]> {
  const parts = await Promise.all(FEEDS.map(f => fetchOne(f.url, f.label)));
  return parts.flat();
}
