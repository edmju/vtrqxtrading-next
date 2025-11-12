import OpenAI from "openai";
import { AiOutputs, RawArticle, AiAction } from "./types";
import { writeJSON } from "../../src/lib/news/fs";

// -------------------- Utils --------------------
function norm(s: string) {
  return (s || "")
    .toLowerCase()
    .replace(/[’‘´`]/g, "'")
    .normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{Letter}\p{Number}\s%]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hoursSince(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  return diff / 36e5;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

const SOURCE_WEIGHT: Record<string, number> = {
  "Reuters": 1.0,
  "Financial Times": 0.9,
  "CNBC": 0.85,
  "Yahoo Finance": 0.7
};

// -------------------- Heuristics --------------------
const DATA_WORDS = ["cpi","ppi","pce","nfp","payrolls","gdp","pmi","ism","survey","calendar"];

type ThemeRule = { label: string; weight: number; includes: string[]; excludes?: string[] };
const THEME_RULES: ThemeRule[] = [
  { label: "Tarifs & contrôles export", weight: 1, includes: ["tariff","tariffs","export control","sanction","sanctions","embargo","blacklist","entity list"] },
  { label: "Pivot/Assouplissement monétaire", weight: 1, includes: ["rate cut","rate cuts","pivot","dovish","easing"] },
  { label: "Durcissement monétaire", weight: 1, includes: ["rate hike","rate hikes","hawkish","tightening","qt"] },
  { label: "Guidance & profits", weight: 1, includes: ["guidance raised","guidance cut","profit warning","earnings beat","earnings miss","revenue beat"] },
  { label: "M&A / Antitrust / Litiges", weight: 1, includes: ["merger","acquisition","takeover","buyout","antitrust","lawsuit","class action","fine","settlement","ec investigation","doj","ftc","sec probe"] },
  { label: "Énergie & offre", weight: 1, includes: ["opec","opec+","production cut","output cut","supply disruption","inventory draw","brent","wti","refinery outage","gas pipeline"] },
  { label: "Cybersécurité & ruptures", weight: 1, includes: ["data breach","hack","ransomware","shutdown","plant shutdown","supply chain disruption"] }
];

function makeHeuristicThemes(articles: RawArticle[], topN: number): { label: string; weight: number }[] {
  const cnt: Record<string, number> = {};
  for (const a of articles) {
    const t = norm(`${a.title} ${a.description || ""}`);
    for (const r of THEME_RULES) {
      if (r.includes.some(k => t.includes(norm(k))) && !(r.excludes || []).some(e => t.includes(norm(e)))) {
        cnt[r.label] = (cnt[r.label] || 0) + r.weight;
      }
    }
  }
  const themes = Object.entries(cnt)
    .map(([label, w]) => ({ label, weight: Math.round(w * 100) / 100 }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, topN)
    .filter(th => !DATA_WORDS.some(dw => norm(th.label).includes(dw)));
  return themes;
}

function defaultPool(ftmo: string[]) {
  const base = ["US500","NAS100","XAUUSD","EURUSD","USDJPY","USOIL","UKOIL","DE40","UK100"];
  return ftmo.length ? ftmo : base;
}

function pickSymbol(candidates: string[], pool: string[]) {
  for (const c of candidates) {
    const hit = pool.find(s => s.toUpperCase() === c.toUpperCase());
    if (hit) return hit;
  }
  return pool[0];
}

// Agrège les signaux à partir des titres/desc et renvoie un score 0..1
function signalStrength(articles: RawArticle[], keywords: string[]) {
  if (!articles.length) return 0;
  let hits = 0;
  let srcWeight = 0;
  let rec = 0;
  for (const a of articles) {
    const t = norm(`${a.title} ${a.description || ""}`);
    if (keywords.some(k => t.includes(norm(k)))) {
      hits++;
      srcWeight += SOURCE_WEIGHT[a.source] ?? 0.6;
      const h = hoursSince(a.publishedAt);
      rec += h <= 24 ? 1 : h <= 48 ? 0.5 : 0.25;
    }
  }
  const hitRatio = hits / Math.max(6, articles.length);     // bornage
  const srcAvg   = hits ? (srcWeight / hits) : 0.6;
  const recAvg   = hits ? (rec / hits) : 0.3;
  // pondération: 50% volume, 30% source, 20% fraicheur
  const s = 0.5 * hitRatio + 0.3 * (srcAvg - 0.5) + 0.2 * (recAvg / 1.0);
  return clamp(s, 0, 1);
}

function confPctFromStrength(s: number) {
  // transforme un 0..1 en % lisible, évite les extrêmes
  return Math.round(clamp(20 + s * 75, 20, 95));
}

function mkAction(
  pool: string[],
  candidates: string[],
  direction: "BUY"|"SELL",
  reason: string,
  strength: number,
  baseConviction = 6
): AiAction {
  const symbol = pickSymbol(candidates, pool);
  const confidence = confPctFromStrength(strength);
  const conviction = clamp(Math.round(baseConviction + (strength - 0.5) * 6), 1, 10);
  return { symbol, direction, conviction, confidence, reason };
}

function heuristicActions(articles: RawArticle[], ftmo: string[], watch: string[], want = 4): AiAction[] {
  const pool = defaultPool(ftmo);

  const sTariffs = signalStrength(articles, ["tariff","tariffs","sanction","embargo","export control","export controls"]);
  const sDovish  = signalStrength(articles, ["rate cut","rate cuts","pivot","dovish","easing"]);
  const sHawkish = signalStrength(articles, ["rate hike","rate hikes","hawkish","tightening","qt"]);
  const sEnergy  = signalStrength(articles, ["opec","opec+","production cut","output cut","refinery outage","supply disruption"]);
  const sGuidUp  = signalStrength(articles, ["guidance raised","earnings beat","revenue beat","upgrade"]);
  const sGuidDn  = signalStrength(articles, ["guidance cut","profit warning","earnings miss","downgrade"]);

  const out: AiAction[] = [];

  if (sTariffs > 0) {
    out.push(mkAction(pool, ["US500","NAS100"], "SELL", "Tensions commerciales (tarifs/sanctions) : risque macro accru.", sTariffs, 7));
    out.push(mkAction(pool, ["XAUUSD"], "BUY", "Recherche de couverture face aux tensions commerciales.", sTariffs, 6));
  }

  if (sDovish > 0 && sDovish >= sHawkish) {
    out.push(mkAction(pool, ["US500","NAS100","DE40"], "BUY", "Biais dovish/assouplissement monétaire.", sDovish, 7));
    out.push(mkAction(pool, ["EURUSD","GBPUSD","AUDUSD"], "BUY", "Dollar susceptible de se détendre en scénario dovish.", sDovish, 5));
  }

  if (sHawkish > 0 && sHawkish > sDovish) {
    out.push(mkAction(pool, ["US500","NAS100"], "SELL", "Durcissement monétaire/ton hawkish.", sHawkish, 7));
    out.push(mkAction(pool, ["USDJPY","EURUSD"], "BUY", "USD soutenu en contexte hawkish.", sHawkish, 5));
  }

  if (sEnergy > 0) {
    out.push(mkAction(pool, ["USOIL","UKOIL"], "BUY", "Chocs d’offre (OPEC/refinery/outages).", sEnergy, 6));
  }

  if (sGuidUp > 0 && sGuidUp > sGuidDn) {
    out.push(mkAction(pool, ["NAS100","US500"], "BUY", "Tonalité micro positive (beats/upgrade).", sGuidUp, 6));
  }
  if (sGuidDn > 0 && sGuidDn > sGuidUp) {
    out.push(mkAction(pool, ["NAS100","US500"], "SELL", "Tonalité micro négative (misses/downgrade).", sGuidDn, 6));
  }

  // filet de sécurité: toujours 2 idées min
  if (out.length === 0) {
    out.push(mkAction(pool, ["US500","NAS100"], "BUY", "Flux neutre → biais haussier modéré.", 0.35, 5));
    out.push(mkAction(pool, ["XAUUSD"], "SELL", "Appétit pour le risque légèrement positif.", 0.30, 4));
  }

  // dédoublonner par symbole et garder les plus confiantes
  const bestBySym = new Map<string, AiAction>();
  for (const a of out) {
    const prev = bestBySym.get(a.symbol);
    if (!prev || a.confidence > prev.confidence) bestBySym.set(a.symbol, a);
  }
  return Array.from(bestBySym.values()).slice(0, want);
}

// -------------------- OpenAI + Fallback --------------------
export async function analyzeWithAI(
  articles: RawArticle[],
  opts: { topThemes: number; ftmoSymbols: string[]; watchlist: string[] }
): Promise<AiOutputs> {
  const topThemes = Math.max(1, Number(opts.topThemes || 3));
  const pool = defaultPool(opts.ftmoSymbols);

  const makeHeuristic = (): AiOutputs => ({
    generatedAt: new Date().toISOString(),
    mainThemes: makeHeuristicThemes(articles, topThemes),
    actions: heuristicActions(articles, pool, opts.watchlist)
  });

  if (!process.env.OPENAI_API_KEY) {
    return makeHeuristic();
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  const model = process.env.OPENAI_NEWS_MODEL || "gpt-4o-mini";
  const titles = articles.slice(0, 80).map(a => `- ${a.title}`).join("\n");

  const sys =
`You are a market analyst. From the list of headlines, extract ONLY structural market themes
(policy shifts, regulation, M&A, sanctions, tariffs, litigation, guidance, supply shocks, leadership change, antitrust, export controls).
EXCLUDE macro data releases (CPI, PPI, NFP, PMI, GDP prints), calendars or surveys from the themes.

Then suggest up to 4 trading actions on these instruments: ${pool.join(", ")}.
Each action must include a direction (BUY/SELL), a short reason, and a conviction on a 0..10 scale.
Respond as a JSON object: { "mainThemes":[{"label":string,"weight":number}], "actions":[{"symbol":string,"direction":"BUY"|"SELL","conviction":number,"reason":string}] }`;

  const user = `Headlines:\n${titles}\nWatchlist priority: ${opts.watchlist.join(", ")}`;

  try {
    const r = await client.chat.completions.create({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user }
      ]
    });

    let out: AiOutputs = makeHeuristic(); // valeur par défaut
    try {
      const parsed = JSON.parse(r.choices[0]?.message?.content || "{}");
      out = {
        generatedAt: new Date().toISOString(),
        mainThemes: (parsed.mainThemes || []).slice(0, topThemes),
        actions: (parsed.actions || []).slice(0, 4).map((a: any) => ({
          symbol: String(a.symbol || "").toUpperCase(),
          direction: (String(a.direction || "BUY").toUpperCase() === "SELL" ? "SELL" : "BUY") as "BUY" | "SELL",
          conviction: clamp(Number(a.conviction ?? 6), 0, 10),
          // confidence synthétisée depuis les signaux agrégés
          confidence: confPctFromStrength(signalStrength(articles, [a.symbol || ""])),
          reason: String(a.reason || "").slice(0, 240)
        }))
      };
      // si IA renvoie rien → heuristique
      if (!out.actions.length) out = makeHeuristic();
    } catch {
      out = makeHeuristic();
    }
    return out;
  } catch {
    return makeHeuristic();
  }
}

export function persistAI(out: any, outFile: string) {
  writeJSON(outFile, out);
}
