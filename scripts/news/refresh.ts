import path from "path";
import { ensureDir, writeJSON, todayTag } from "../../src/lib/news/fs";
import { fetchNewsapi } from "./providers/newsapi";
import { fetchFinnhub } from "./providers/finnhub";
import { fetchGuardian } from "./providers/guardian";
import { fetchFmp } from "./providers/fmp";
import { fetchAllRss } from "./providers/rss";
import { normalizeDedup, persistBundle } from "./normalize";
import { filterAndScoreHot } from "./filter";
import { analyzeWithAI, persistAI } from "./analyze";
import { NewsBundle, RawArticle } from "./types";

const OUT_DIR = process.env.NEWS_OUTPUT_DIR || "public/data/news";
const AI_DIR  = process.env.NEWS_AI_OUTPUT_DIR || "public/data/ai";

function logCount(label: string, arr: RawArticle[]) {
  console.log(`[news] ${label}: ${arr.length}`);
}
function logSample(label: string, arr: RawArticle[], n = 5) {
  const titles = arr.slice(0, n).map(a => `• ${a.title}`).join("\n");
  console.log(`[news] sample ${label}:\n${titles || "(none)"}`);
}

async function stageFetch() {
  const langs    = (process.env.NEWS_LANGS || "en").split(",").map(s => s.trim());
  const maxAll   = Number(process.env.NEWS_MAX_ARTICLES || 800);
  const maxHot   = Number(process.env.NEWS_MAX_HOT || 60);
  const minScore = Number(process.env.NEWS_HOT_SCORE_MIN || 4);

  const tasks: Promise<RawArticle[]>[] = [];
  if (process.env.NEWSAPI_KEY)      tasks.push(fetchNewsapi(langs));
  if (process.env.FINNHUB_API_KEY)  tasks.push(fetchFinnhub());
  if (process.env.GUARDIAN_API_KEY) tasks.push(fetchGuardian());
  if (process.env.FMP_API_KEY)      tasks.push(fetchFmp());
  tasks.push(fetchAllRss());

  const results = await Promise.all(tasks);
  const [newsapi = [], finnhub = [], guardian = [], fmp = [], rss = []] = results;

  logCount("NewsAPI", newsapi);
  logCount("Finnhub", finnhub);
  logCount("Guardian", guardian);
  logCount("FMP", fmp);
  logCount("RSS", rss);

  const all: RawArticle[] = ([] as RawArticle[]).concat(newsapi, finnhub, guardian, fmp, rss);
  const dedup = normalizeDedup(all, maxAll);
  logCount("after dedup", dedup);
  logSample("after dedup", dedup);

  const tickers = (process.env.FTMO_SYMBOLS || "")
    .split(",").map(s => s.trim()).filter(Boolean);

  const hotOnly = filterAndScoreHot(dedup, { tickers, max: maxHot, minScore });
  logCount("after hot filter", hotOnly);
  logSample("hot", hotOnly);

  const tag = todayTag();
  const bundle: NewsBundle = {
    generatedAt: new Date().toISOString(),
    total: hotOnly.length,
    articles: hotOnly
  };

  ensureDir(OUT_DIR);
  persistBundle(bu
