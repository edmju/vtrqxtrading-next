// scripts/news/siteFilters.ts

// Filtrage par domaine et chemin – conservation stricte Business/Markets.

const HOST_ALLOW = [
  // Core agences / généralistes marchés
  "reuters.com",
  "www.reuters.com",
  "cnbc.com",
  "www.cnbc.com",
  "finance.yahoo.com",
  "news.yahoo.com",
  "www.ft.com",
  "ft.com",
  "www.marketwatch.com",
  "marketwatch.com",
  "apnews.com",
  "www.apnews.com",

  // US investing / equity
  "www.nasdaq.com",
  "nasdaq.com",
  "www.investing.com",
  "investing.com",
  "www.investors.com",
  "investors.com",
  "www.barrons.com",
  "barrons.com",
  "www.zacks.com",
  "zacks.com",

  // FX / commodities
  "www.fxstreet.com",
  "fxstreet.com",
  "www.forexlive.com",
  "forexlive.com",
  "oilprice.com",
  "www.oilprice.com",

  // Europe
  "www.lesechos.fr",
  "lesechos.fr",
  "www.zonebourse.com",
  "zonebourse.com",
  "www.boursorama.com",
  "boursorama.com",
  "www.handelsblatt.com",
  "handelsblatt.com",
  "www.theguardian.com",
  "theguardian.com",
  "www.telegraph.co.uk",
  "telegraph.co.uk",

  // Asia / EM
  "www.scmp.com",
  "scmp.com",
  "www.nikkei.com",
  "nikkei.com",
  "economictimes.indiatimes.com",

  // Crypto
  "www.coindesk.com",
  "coindesk.com",
  "cointelegraph.com",
  "www.cointelegraph.com",
];

const PATH_INCLUDE = [
  "business",
  "markets",
  "market",
  "economy",
  "economic",
  "finance",
  "money",
  "companies",
  "investing",
  "stocks",
  "stock-market",
  "equities",
  "bonds",
  "fixed-income",
  "commodities",
  "oil",
  "energy",
  "fx",
  "forex",
  "crypto",
];

const PATH_EXCLUDE = [
  "make-it",
  "lifestyle",
  "entertainment",
  "sports",
  "travel",
  "health-and-wellness",
  "success",
  "shopping",
  "style",
  "video",
  "photos",
  "culture",
  "opinion",
  "podcast",
  "newsletter",
  "blog",
  "recipes",
  "food",
];

export function isFinanceUrl(u: string): boolean {
  try {
    const url = new URL(u);
    if (!HOST_ALLOW.includes(url.host)) return false;

    const p = url.pathname.toLowerCase();

    if (PATH_EXCLUDE.some((k) => p.includes(k))) return false;
    if (PATH_INCLUDE.some((k) => p.includes(k))) return true;

    // Domains business-first: on accepte même sans mot-clé chemin.
    return /reuters\.com|ft\.com|marketwatch\.com|nasdaq\.com|investing\.com|lesechos\.fr|zonebourse\.com/.test(
      url.host
    );
  } catch {
    return false;
  }
}
