// Filtrage par domaine et chemin – conservation stricte Business/Markets.

const HOST_ALLOW = [
  "reuters.com","www.reuters.com",
  "cnbc.com","www.cnbc.com",
  "finance.yahoo.com","news.yahoo.com",
  "www.ft.com","ft.com",
  "www.marketwatch.com","marketwatch.com",
  "apnews.com","www.apnews.com"
];

const PATH_INCLUDE = ["business","markets","market","economy","finance","money","companies","investing"];
const PATH_EXCLUDE = ["make-it","lifestyle","entertainment","sports","travel","health-and-wellness","success","shopping","style","video","photos","culture"];

export function isFinanceUrl(u: string): boolean {
  try {
    const url = new URL(u);
    if (!HOST_ALLOW.includes(url.host)) return false;
    const p = url.pathname.toLowerCase();
    if (PATH_EXCLUDE.some(k => p.includes(k))) return false;
    if (PATH_INCLUDE.some(k => p.includes(k))) return true;
    // Domains business-first: on accepte même sans mot-clé chemin.
    return /reuters\.com|ft\.com|marketwatch\.com/.test(url.host);
  } catch {
    return false;
  }
}
