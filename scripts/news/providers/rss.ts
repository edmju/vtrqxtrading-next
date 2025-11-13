// scripts/news/providers/rss.ts

import { RawArticle } from "../types";

function decodeEntities(s: string) {
  return (s || "")
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function parseRss(xml: string): RawArticle[] {
  const items = Array.from(xml.matchAll(/<item>[\s\S]*?<\/item>/gi));
  const take = (tag: string, s: string) =>
    (s.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i")) || [, ""])[1];

  if (items.length) {
    return items
      .map((m) => {
        const b = m[0];
        const link = decodeEntities(take("link", b));
        const title = decodeEntities(take("title", b));
        const pub = decodeEntities(take("pubDate", b));
        const desc = decodeEntities(take("description", b));
        return {
          url: link,
          title,
          publishedAt: new Date(pub || Date.now()).toISOString(),
          description: desc,
        } as RawArticle;
      })
      .filter((a) => a.url && a.title);
  }

  const entries = Array.from(xml.matchAll(/<entry>[\s\S]*?<\/entry>/gi));
  if (entries.length) {
    return entries
      .map((m) => {
        const b = m[0];
        const title = decodeEntities(
          (b.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [, ""])[1]
        );
        const link = decodeEntities(
          (b.match(/<link[^>]*href="([^"]+)"/i) || [, ""])[1]
        );
        const pub = decodeEntities(
          (
            b.match(
              /<(updated|published)>([\s\S]*?)<\/(updated|published)>/i
            ) || [, , ""]
          )[2]
        );
        const desc = decodeEntities(
          (b.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i) || [, ""])[1]
        );
        return {
          url: link,
          title,
          publishedAt: new Date(pub || Date.now()).toISOString(),
          description: desc,
        } as RawArticle;
      })
      .filter((a) => a.url && a.title);
  }

  return [];
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/xml,text/xml,*/*",
      },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function fetchOne(url: string, label: string): Promise<RawArticle[]> {
  const xml = await fetchText(url);
  if (!xml) return [];
  return parseRss(xml).map((a) => ({ ...a, source: label }));
}

/**
 * Feeds « business / markets » uniquement.
 * Objectif: couvrir un max de sources financières internationales.
 * Beaucoup de feeds → certains renverront 0 (404 / pas d’update), ce n’est pas grave.
 */
const FEEDS: { url: string; label: string }[] = [
  // Core agences / généralistes marchés
  { url: "https://feeds.reuters.com/reuters/businessNews", label: "Reuters" },
  { url: "https://feeds.reuters.com/reuters/marketsNews", label: "Reuters" },
  {
    url: "https://www.cnbc.com/id/10001147/device/rss/rss.html",
    label: "CNBC",
  }, // Markets
  {
    url: "https://www.cnbc.com/id/100003114/device/rss/rss.html",
    label: "CNBC",
  }, // Business
  {
    url: "https://feeds.finance.yahoo.com/rss/2.0/category-markets?region=US&lang=en-US",
    label: "Yahoo Finance",
  },
  { url: "https://www.ft.com/markets?format=rss", label: "Financial Times" },
  { url: "https://www.marketwatch.com/markets?mod=rss", label: "MarketWatch" },
  { url: "https://apnews.com/hub/business?rss=1", label: "AP News" },

  // US large cap / investing
  {
    url: "https://www.nasdaq.com/feed/rsssection?category=Markets",
    label: "Nasdaq",
  },
  {
    url: "https://www.nasdaq.com/feed/rsssection?category=Economy",
    label: "Nasdaq",
  },
  {
    url: "https://www.investing.com/rss/news.rss",
    label: "Investing.com",
  },
  {
    url: "https://www.investing.com/rss/news_25.rss",
    label: "Investing.com",
  }, // fx/commodities (si dispo)
  {
    url: "https://www.investors.com/rss/news.xml",
    label: "Investor's Business Daily",
  },
  {
    url: "https://www.barrons.com/feed?mod=hp_banner",
    label: "Barron's",
  },
  {
    url: "https://www.zacks.com/stock/news/headline_rss.php",
    label: "Zacks",
  },

  // FX / commodities specialised
  { url: "https://www.fxstreet.com/rss", label: "FXStreet" },
  {
    url: "https://www.forexlive.com/feed/news",
    label: "ForexLive",
  },
  {
    url: "https://www.oilprice.com/rss/main",
    label: "OilPrice",
  },

  // Europe (FR / DE / UK)
  {
    url: "https://feeds.feedburner.com/lesechos/finance-marches",
    label: "Les Echos",
  },
  {
    url: "https://www.zonebourse.com/rss/flux_actualite_marches.xml",
    label: "Zonebourse",
  },
  {
    url: "https://www.boursorama.com/bourse/rss/actualites/",
    label: "Boursorama",
  },
  {
    url: "https://www.handelsblatt.com/contentexport/feed/schlagzeilen",
    label: "Handelsblatt",
  },
  {
    url: "https://www.theguardian.com/uk/business/rss",
    label: "The Guardian",
  },
  {
    url: "https://www.telegraph.co.uk/business/rss.xml",
    label: "Telegraph Business",
  },

  // Asia / EM
  {
    url: "https://www.scmp.com/rss/91/feed",
    label: "SCMP Markets",
  },
  {
    url: "https://www.nikkei.com/rss/en/business.xml",
    label: "Nikkei",
  },
  {
    url: "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms",
    label: "Economic Times India",
  },

  // Crypto (pour signaux de risque)
  {
    url: "https://www.coindesk.com/arc/outboundfeeds/rss/",
    label: "Coindesk",
  },
  {
    url: "https://cointelegraph.com/rss",
    label: "Cointelegraph",
  },
];

export async function fetchAllRss(): Promise<RawArticle[]> {
  const parts = await Promise.all(FEEDS.map((f) => fetchOne(f.url, f.label)));
  return parts.flat();
}
