// Filtrage domaine/chemin pour éviter lifestyle et ne conserver que business/markets.

const FINANCE_HOST_ALLOW = [
  "reuters.com","www.reuters.com",
  "cnbc.com","www.cnbc.com",
  "finance.yahoo.com","news.yahoo.com",
  "www.ft.com","ft.com",
  "www.marketwatch.com","marketwatch.com",
  "apnews.com","www.apnews.com",
  "www.investing.com","investing.com"
];

const PATH_INCLUDE = [
  "business","markets","market","economy","finance","money","companies","investing"
];

const PATH_EXCLUDE = [
  "make-it","lifestyle","entertainment","sports","travel","health-and-wellness",
  "success","work","tech-products","shopping","pop-culture","style","video"
];

export function isFinanceUrl(u: string): boolean {
  try {
    const url = new URL(u);
    const hostOk = FINANCE_HOST_ALLOW.includes(url.host);
    if (!hostOk) return false;
    const p = url.pathname.toLowerCase();
    if (PATH_EXCLUDE.some(k => p.includes(k))) return false;
    if (PATH_INCLUDE.some(k => p.includes(k))) return true;
    return url.host.includes("reuters.com") || url.host.includes("ft.com") || url.host.includes("marketwatch.com");
  } catch {
    return false;
  }
}
