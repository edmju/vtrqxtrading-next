import path from "path";
import { ensureDir, writeJSON, todayTag } from "../../src/lib/news/fs";
import { fetchNewsapi } from "./providers/newsapi";
import { fetchFinnhub } from "./providers/finnhub";
import { fetchGuardian } from "./providers/guardian";
import { fetchFmp } from "./providers/fmp";
import { fetchReutersRss, fetchBloombergRss } from "./providers/rss";
import { normalizeDedup, persistBundle } from "./normalize";
import { analyzeWithAI, persistAI } from "./analyze";
import { NewsBundle, RawArticle } from "./types";

const OUT_DIR = process.env.NEWS_OUTPUT_DIR || "public/data/news";
const AI_DIR  = process.env.NEWS_AI_OUTPUT_DIR || "public/data/ai";
const ENABLE_RSS = (process.env.NEWS_ENABLE_RSS || "true").toLowerCase() !== "false";

function tally(label: string, n: number) {
  console.log(`[news] ${label}: ${n}`);
}

async function stageFetch() {
  const langs = (process.env.NEWS_LANGS || "en").split(",").map(s => s.trim());
  const max = Number(process.env.NEWS_MAX_ARTICLES || 400);

  const tasks: Promise<RawArticle[]>[] = [];

  // Providers avec clés (seulement si présents)
  if (process.env.NEWSAPI_KEY) tasks.push(fetchNewsapi(langs));
  if (process.env.FINNHUB_API_KEY) tasks.push(fetchFinnhub());
  if (process.env.GUARDIAN_API_KEY) tasks.push(fetchGuardian());
  if (process.env.FMP_API_KEY) tasks.push(fetchFmp());

  // Fallback RSS sans clé (toujours activé sauf si NEWS_ENABLE_RSS=false)
  if (ENABLE_RSS) {
    tasks.push(fetchReutersRss());
    tasks.push(fetchBloombergRss());
  }

  const results = await Promise.all(tasks);
  const [newsapi, finnhub, guardian, fmp, reuters, bloomberg] = [
    results[0] || [], results[1] || [], results[2] || [], results[3] || [], results[4] || [], results[5] || []
  ];

  // Logs debug utiles dans les Actions
  tally("NewsAPI", newsapi.length);
  tally("Finnhub", finnhub.length);
  tally("Guardian", guardian.length);
  tally("FMP", fmp.length);
  tally("Reuters (RSS)", reuters.length);
  tally("Bloomberg (RSS)", bloomberg.length);

  const all: RawArticle[] = ([] as RawArticle[]).concat(
    newsapi, finnhub, guardian, fmp, reuters, bloomberg
  );

  const dedup = normalizeDedup(all, max);

  const tag = todayTag();
  const bundle: NewsBundle = {
    generatedAt: new Date().toISOString(),
    total: dedup.length,
    articles: dedup
  };

  ensureDir(OUT_DIR);
  persistBundle(bundle, path.join(OUT_DIR, `news-${tag}.json`));
  writeJSON(path.join(OUT_DIR, "latest.json"), bundle);
  console.log(`[news] Fetched & saved ${dedup.length} articles total.`);
}

async function stageAnalyze() {
  const fs = await import("fs");
  const latestPath = path.join(OUT_DIR, "latest.json");
  if (!fs.existsSync(latestPath)) {
    console.error("[news] No latest news file. Run --stage=fetch first.");
    process.exit(1);
  }

  const bundle = JSON.parse(fs.readFileSync(latestPath, "utf8"));
  const ftmo = (process.env.FTMO_SYMBOLS || "").split(",").map(s => s.trim()).filter(Boolean);
  const watch = (process.env.WATCHLIST_TICKERS || "").split(",").map(s => s.trim()).filter(Boolean);

  // Si pas d'articles ou pas de clé OpenAI → on écrit un AI "vide" propre.
  if (!bundle.articles?.length || !process.env.OPENAI_API_KEY) {
    const empty = {
      generatedAt: new Date().toISOString(),
      mainThemes: [],
      actions: []
    };
    const tag = todayTag();
    ensureDir(AI_DIR);
    persistAI(empty, path.join(AI_DIR, `ai-${tag}.json`));
    writeJSON(path.join(AI_DIR, "latest.json"), empty);
    console.log("[news] AI analysis skipped (no articles or no OPENAI_API_KEY).");
    return;
  }

  const out = await analyzeWithAI(bundle.articles, {
    topThemes: Number(process.env.NEWS_TOP_THEMES || 3),
    ftmoSymbols: ftmo,
    watchlist: watch
  });

  const tag = todayTag();
  ensureDir(AI_DIR);
  persistAI(out, path.join(AI_DIR, `ai-${tag}.json`));
  writeJSON(path.join(AI_DIR, "latest.json"), out);
  console.log("[news] AI analysis saved.");
}

async function main() {
  const stage = process.argv.find(a => a.startsWith("--stage="))?.split("=")[1] || "all";
  if (stage === "fetch") return stageFetch();
  if (stage === "analyze") return stageAnalyze();
  await stageFetch();
  await stageAnalyze();
}
main().catch(e => { console.error(e); process.exit(1); });
