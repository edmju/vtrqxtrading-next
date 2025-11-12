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
  "Financial Times": 0.95,
  "CNBC": 0.85,
  "MarketWatch": 0.8,
  "Yahoo Finance": 0.75,
  "AP News": 0.7
};

// -------------------- Thèmes & règles --------------------
const DATA_WORDS = ["cpi","ppi","pce","nfp","payrolls","gdp","pmi","ism","survey","calendar"];

type ThemeRule = { label: string; weight: number; includes: string[]; excludes?: string[]; action?: (arts: RawArticle[], pool: string[]) => AiAction[] };
const rules: ThemeRule[] = [
  {
    label: "Tarifs & contrôles export",
    weight: 1,
    includes: ["tariff","tariffs","export control","sanction","sanctions","embargo","blacklist","entity list","retaliation"],
    action: (arts, pool) => mkTradeFromSignal(arts, pool, {
      keywords: ["tariff","tariffs","sanction","embargo","export control","retaliation"],
      ideas: [
        { candidates:["US500","NAS100"], dir:"SELL", reason:"Tensions commerciales: risque macro accru." },
        { candidates:["XAUUSD"],        dir:"BUY",  reason:"Couverture face aux tensions commerciales." }
      ]
    })
  },
  {
    label: "Pivot/Assouplissement monétaire",
    weight: 1,
    includes: ["rate cut","rate cuts","pivot","dovish","easing","qe"],
    action: (arts, pool) => mkTradeFromSignal(arts, pool, {
      keywords: ["rate cut","rate cuts","pivot","dovish","easing"],
      ideas: [
        { candidates:["US500","NAS100","DE40"], dir:"BUY",  reason:"Biais dovish soutenant les actifs risqués." },
        { candidates:["EURUSD","GBPUSD","AUDUSD"], dir:"BUY", reason:"Dollar susceptible de se détendre en scénario dovish." }
      ]
    })
  },
  {
    label: "Durcissement monétaire",
    weight: 1,
    includes: ["rate hike","rate hikes","hawkish","tightening","qt","balance sheet reduction"],
    action: (arts, pool) => mkTradeFromSignal(arts, pool, {
      keywords: ["rate hike","rate hikes","hawkish","tightening","qt"],
      ideas: [
        { candidates:["US500","NAS100"], dir:"SELL", reason:"Ton hawkish: pression sur valorisations." },
        { candidates:["USDJPY","EURUSD"], dir:"BUY",  reason:"USD soutenu par durcissement monétaire." }
      ]
    })
  },
  {
    label: "Énergie & offre",
    weight: 1,
    includes: ["opec","opec+","production cut","output cut","refinery outage","supply disruption","pipeline"],
    action: (arts, pool) => mkTradeFromSignal(arts, pool, {
      keywords: ["opec","production cut","output cut","refinery outage","supply disruption","pipeline"],
      ideas: [
        { candidates:["USOIL","UKOIL"], dir:"BUY", reason:"Chocs d’offre sur le brut (OPEC/refinery/outages)." }
      ]
    })
  },
  {
    label: "M&A / Antitrust / Litiges",
    weight: 1,
    includes: ["merger","acquisition","takeover","buyout","antitrust","lawsuit","class action","fine","settlement","ec investigation","doj","ftc","cfius"],
  },
  {
    label: "Guidance & profits",
    weight: 1,
    includes: ["guidance raised","earnings beat","revenue beat","upgrade","guidance cut","profit warning","earnings miss","downgrade"],
  },
  {
    label: "Cybersécurité & ruptures",
    weight: 1,
    includes: ["data breach","hack","ransomware","shutdown","plant shutdown","supply chain disruption"]
  }
];

// ----------- calculs -----------
function defaultPool(ftmo: string[]) {
  const base = ["US500","NAS100","XAUUSD","EURUSD","USDJPY","USOIL","UKOIL","DE40","UK100"];
  return ftmo.length ? ftmo : base;
}

function signalStrength(articles: RawArticle[], keywords: string[]) {
  const matched = articles.filter(a => {
    const t = norm(`${a.title} ${a.description || ""}`);
    return keywords.some(k => t.includes(norm(k)));
  });
  if (!matched.length) return { s: 0, evidences: [] as RawArticle[] };

  let srcW = 0, freshW = 0;
  for (const a of matched) {
    srcW   += (SOURCE_WEIGHT[a.source] ?? 0.6);
    const h = hoursSince(a.publishedAt);
    freshW += h <= 24 ? 1 : h <= 48 ? 0.5 : 0.25;
  }
  const hitRatio = matched.length / Math.max(8, articles.length);
  const srcAvg   = srcW / matched.length;           // 0..1.1
  const freshAvg = freshW / matched.length;         // 0..1
  const s = 0.5 * hitRatio + 0.3 * (srcAvg - 0.5) + 0.2 * freshAvg;
  return { s: clamp(s, 0, 1), evidences: matched.slice(0, 5) };
}

function confPctFromStrength(s: number) {
  return Math.round(clamp(25 + s * 70, 25, 95));
}

function pickSymbol(candidates: string[], pool: string[]) {
  for (const c of candidates) {
    const m = pool.find(p => p.toUpperCase() === c.toUpperCase());
    if (m) return m;
  }
  return pool[0];
}

function mkTradeFromSignal(
  articles: RawArticle[],
  pool: string[],
  spec: { keywords: string[]; ideas: { candidates: string[]; dir: "BUY" | "SELL"; reason: string }[] }
): AiAction[] {
  const { s, evidences } = signalStrength(articles, spec.keywords);
  const min = Number(process.env.NEWS_ACTION_MIN_STRENGTH || 0.30); // seuil logique
  if (s < min) return [];
  const confidence = confPctFromStrength(s);
  const convictionBase = 5 + Math.round((s - 0.5) * 6);
  return spec.ideas.map(it => ({
    symbol: pickSymbol(it.candidates, pool),
    direction: it.dir,
    conviction: clamp(convictionBase, 1, 10),
    confidence,
    reason: `${it.reason} (evidence: ${evidences.map(e => e.source).join("/")}, s=${(s*100|0)}).`
  }));
}

function computeThemes(articles: RawArticle[], topN: number) {
  const cnt: Record<string, number> = {};
  for (const r of rules) {
    const { s } = signalStrength(articles, r.includes);
    if (s > 0) cnt[r.label] = (cnt[r.label] || 0) + s;
  }
  return Object.entries(cnt)
    .map(([label, w]) => ({ label, weight: Math.round(w * 100) / 100 }))
    .sort((a,b) => b.weight - a.weight)
    .slice(0, topN)
    .filter(th => !DATA_WORDS.some(dw => norm(th.label).includes(dw)));
}

// -------------------- OpenAI + Fallback --------------------
export async function analyzeWithAI(
  articles: RawArticle[],
  opts: { topThemes: number; ftmoSymbols: string[]; watchlist: string[] }
): Promise<AiOutputs> {
  const pool = defaultPool(opts.ftmoSymbols);

  // Thèmes par règles (cohérents avec actions)
  const themes = computeThemes(articles, Math.max(1, Number(opts.topThemes || 3)));

  // Actions 100% déterministes à partir des mêmes règles (cohérence)
  let actions: AiAction[] = [];
  for (const r of rules) {
    if (!r.action) continue;
    actions = actions.concat(r.action(articles, pool));
  }

  // Si OpenAI dispo, on peut raffiner la rédaction (facultatif, pas de changement de logique)
  if (process.env.OPENAI_API_KEY && actions.length) {
    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
      const model = process.env.OPENAI_NEWS_MODEL || "gpt-4o-mini";
      const prompt = `Rewrite briefly these trade rationales in French, concise, no fluff:\n${actions.map(a => `- ${a.symbol} ${a.direction}: ${a.reason}`).join("\n")}`;
      const r = await client.chat.completions.create({
        model, temperature: 0, messages: [{ role: "user", content: prompt }]
      });
      const text = r.choices[0]?.message?.content || "";
      const lines = text.split("\n").filter(Boolean);
      actions = actions.map((a, i) => ({ ...a, reason: lines[i]?.replace(/^-+\s?/, "") || a.reason }));
    } catch {/* on garde les raisons initiales */}
  }

  // borne & tri par confiance
  actions = actions
    .sort((a,b) => b.confidence - a.confidence)
    .slice(0, Number(process.env.NEWS_ACTIONS_MAX || 4));

  return {
    generatedAt: new Date().toISOString(),
    mainThemes: themes,
    actions
  };
}

export function persistAI(out: any, outFile: string) {
  writeJSON(outFile, out);
}
