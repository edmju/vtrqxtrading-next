// scripts/news/analyze.ts

import OpenAI from "openai";
import {
  AiOutputs,
  AiAction,
  RawArticle,
  AiCluster,
  AiTheme,
} from "./types";
import { runAllDetectors } from "./detectors";
import { writeJSON } from "../../src/lib/news/fs";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function hoursSince(d: string) {
  return (Date.now() - new Date(d).getTime()) / 36e5;
}

function defaultPool(ftmo: string[]) {
  const base = [
    "US500",
    "NAS100",
    "XAUUSD",
    "EURUSD",
    "USDJPY",
    "USOIL",
    "UKOIL",
    "DE40",
    "UK100",
  ];
  return ftmo.length ? ftmo : base;
}

function buildAiPayload(arts: RawArticle[], limit = 150) {
  return arts.slice(0, limit).map((a, idx) => ({
    id: a.id ?? String(idx),
    title: a.title,
    source: a.source,
    url: a.url,
    ageH: Math.round(hoursSince(a.publishedAt)),
    score: a.score ?? 0,
    hits: (a.hits || []).slice(0, 12),
  }));
}

/* -------------------------------------------------------------------------- */
/*  Catégories « dures » pour thèmes / buckets                                */
/* -------------------------------------------------------------------------- */

type CategoryDef = {
  key: string;
  label: string;
  patterns: string[];
};

type CategoryBucket = {
  key: string;
  label: string;
  articles: RawArticle[];
  weight: number; // 0..1
};

const CATEGORY_DEFS: CategoryDef[] = [
  {
    key: "policy",
    label: "Banques centrales / Taux",
    patterns: [
      "fed",
      "federal reserve",
      "fomc",
      "ecb",
      "bank of england",
      "boe",
      "bank of japan",
      "boj",
      "riksbank",
      "snb",
      "central bank",
      "rate cut",
      "rate hike",
      "cut rates",
      "raises rates",
      "interest rate",
      "yields",
      "treasury",
      "bond yield",
      "inflation",
      "cpi",
      "pce",
      "core inflation",
      "jobs report",
      "payrolls",
      "nfp",
    ],
  },
  {
    key: "tariffs",
    label: "Tarifs / Géopolitique commerciale",
    patterns: [
      "tariff",
      "tariffs",
      "sanction",
      "sanctions",
      "export control",
      "trade war",
      "retaliation",
      "embargo",
      "blacklist",
      "duties",
      "customs",
      "import tax",
      "section 301",
      "section 232",
    ],
  },
  {
    key: "energy",
    label: "Énergie & Commodities",
    patterns: [
      "opec",
      "opec+",
      "oil",
      "brent",
      "wti",
      "crude",
      "barrel",
      "natural gas",
      "lng",
      "refinery",
      "pipeline",
      "supply disruption",
      "production cut",
      "output cut",
      "supply cut",
      "inventory draw",
      "stockpiles",
      "miner",
      "copper",
      "gold mine",
      "iron ore",
    ],
  },
  {
    key: "corp",
    label: "Earnings / Guidance / M&A / Antitrust",
    patterns: [
      "earnings",
      "results",
      "profits",
      "losses",
      "guidance",
      "forecast",
      "outlook",
      "profit warning",
      "merger",
      "acquisition",
      "deal",
      "m&a",
      "takeover",
      "bid",
      "offer",
      "buyout",
      "antitrust",
      "regulator",
      "investigation",
      "probe",
      "lawsuit",
      "class action",
      "ipo",
      "spac",
    ],
  },
  {
    key: "tech",
    label: "Tech / IA / Cybersécurité",
    patterns: [
      "chip",
      "semiconductor",
      "gpu",
      "ai",
      "artificial intelligence",
      "machine learning",
      "cloud",
      "datacenter",
      "data center",
      "cyber",
      "ransomware",
      "hack",
      "data breach",
      "breach",
    ],
  },
  {
    key: "macro",
    label: "Macro & Budget / Politique",
    patterns: [
      "recession",
      "slowdown",
      "gdp",
      "growth",
      "stimulus",
      "spending bill",
      "budget",
      "deficit",
      "shutdown",
      "debt ceiling",
      "election",
      "vote",
      "congress",
      "parliament",
      "white house",
      "policy",
      "fiscal",
    ],
  },
];

function normText(s: string) {
  return (s || "")
    .toLowerCase()
    .replace(/[’‘´`]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function inferCategoryKey(a: RawArticle): string | null {
  const text = normText(`${a.title} ${a.description || ""}`);
  for (const def of CATEGORY_DEFS) {
    if (def.patterns.some((p) => text.includes(p))) return def.key;
  }
  return null;
}

function buildCategoryBuckets(articles: RawArticle[]): CategoryBucket[] {
  const map = new Map<
    string,
    { key: string; label: string; articles: RawArticle[] }
  >();

  for (const a of articles) {
    const key = inferCategoryKey(a);
    if (!key) continue;
    const def = CATEGORY_DEFS.find((d) => d.key === key);
    if (!def) continue;
    let bucket = map.get(key);
    if (!bucket) {
      bucket = { key: def.key, label: def.label, articles: [] };
      map.set(key, bucket);
    }
    bucket.articles.push(a);
  }

  const buckets: CategoryBucket[] = [];
  for (const bucket of map.values()) {
    const n = bucket.articles.length;
    if (!n) continue;

    const avgScore =
      bucket.articles.reduce((s, a) => s + (a.score ?? 4), 0) / n;

    const avgFresh =
      bucket.articles.reduce((s, a) => {
        const h = hoursSince(a.publishedAt);
        return s + (h <= 24 ? 1 : h <= 72 ? 0.7 : 0.4);
      }, 0) / n;

    const raw =
      0.5 * Math.min(1, n / 10) +
      0.3 * Math.min(1, avgScore / 12) +
      0.2 * avgFresh;

    const weight = clamp(raw, 0.15, 0.99);
    buckets.push({ ...bucket, weight });
  }

  return buckets.sort((a, b) => b.weight - a.weight);
}

/**
 * Résumé fallback lisible quand l’IA ne répond pas.
 * On explique le narratif, pas seulement le nombre d’articles.
 */
function bucketSummary(b: CategoryBucket): string {
  const n = b.articles.length;
  const ages = b.articles.map((a) => Math.round(hoursSince(a.publishedAt)));
  const minAge = Math.min(...ages, 72);
  const srcs = Array.from(new Set(b.articles.map((a) => a.source))).slice(0, 4);
  const window =
    minAge <= 24 ? "sur les dernières 24h" : "sur les derniers jours";
  const srcTxt = srcs.join(", ");

  let core: string;
  switch (b.key) {
    case "policy":
      core = `Flux concentré sur les annonces et commentaires de banques centrales, inflation et emploi.`;
      break;
    case "tariffs":
      core =
        "Narratif chargé sur sanctions, droits de douane et tensions commerciales entre grandes puissances.";
      break;
    case "energy":
      core =
        "Nouvelles répétées sur production, stocks et disruptions d’offre sur pétrole, gaz et commodities.";
      break;
    case "corp":
      core =
        "Série de news sur résultats, guidance, deals M&A et risques antitrust pour plusieurs grands émetteurs.";
      break;
    case "tech":
      core =
        "Flux dense sur IA, semi-conducteurs, cloud et cybersécurité, avec annonces et risques spécifiques au secteur.";
      break;
    case "macro":
      core =
        "Narratif macro/fiscal : croissance, budgets publics, élections et décisions de politique économique.";
      break;
    default:
      core =
        "Flux divers mais orienté marchés, mélange de news macro, corporate et politiques.";
      break;
  }

  const meta = `${n} article(s) ${window}${
    srcTxt ? ` (sources: ${srcTxt})` : ""
  }.`;
  return `${core} ${meta}`;
}

/**
 * Petitte heuristique pour un horizon de temps indicatif
 * en fonction de la fraicheur des articles du bucket.
 */
function inferTimeframeForBucket(b: CategoryBucket): string {
  const ages = b.articles.map((a) => hoursSince(a.publishedAt));
  const minAge = Math.min(...ages, 72);

  if (minAge <= 12) return "intraday-1j";
  if (minAge <= 48) return "1-3j";
  if (minAge <= 168) return "1-2sem";
  if (minAge <= 336) return "2-4sem";
  return "1-3mois";
}

function guessDirectionFromText(text: string): "BUY" | "SELL" {
  const t = normText(text);
  if (
    t.includes("rate cut") ||
    t.includes("dovish") ||
    t.includes("easing") ||
    t.includes("stimulus") ||
    t.includes("beats expectations") ||
    t.includes("rally") ||
    t.includes("surge") ||
    t.includes("record high")
  ) {
    return "BUY";
  }
  if (
    t.includes("rate hike") ||
    t.includes("hawkish") ||
    t.includes("tightening") ||
    t.includes("slump") ||
    t.includes("plunge") ||
    t.includes("selloff") ||
    t.includes("misses estimates") ||
    t.includes("profit warning")
  ) {
    return "SELL";
  }
  return "BUY";
}

function symbolForCategory(key: string, pool: string[]): string | null {
  const pick = (sym: string) => (pool.includes(sym) ? sym : pool[0] || null);
  switch (key) {
    case "energy":
      return pick("USOIL");
    case "tariffs":
      return pick("XAUUSD");
    case "tech":
      return pick("NAS100");
    case "policy":
    case "macro":
    case "corp":
    default:
      return pick("US500");
  }
}

/* -------------------------------------------------------------------------- */
/*  Fallback déterministe : radar + éventuelles actions                       */
/* -------------------------------------------------------------------------- */

function fallbackDeterministic(
  articles: RawArticle[],
  ftmoPool: string[],
  topThemes: number
): AiOutputs {
  const pool = defaultPool(ftmoPool);
  const sigs = runAllDetectors(articles);
  const buckets = buildCategoryBuckets(articles);

  const bucketThemes: AiTheme[] = buckets.map((b) => ({
    label: b.label,
    weight: Math.round(b.weight * 100) / 100,
    summary: bucketSummary(b),
    evidenceIds: b.articles
      .slice(0, 24)
      .map((a) => a.id ?? "")
      .filter(Boolean),
  }));

  const signalThemes: AiTheme[] = sigs
    .filter((s) => s.strength > 0)
    .sort((a, b) => b.strength - a.strength)
    .map((s) => ({
      label: s.label,
      weight: Math.round(s.strength * 100) / 100,
      summary: s.label,
      evidenceIds: s.evidences
        .map((e) => e.id ?? "")
        .filter(Boolean)
        .slice(0, 24),
    }));

  const themes: AiTheme[] = [];
  const seen = new Set<string>();

  for (const t of bucketThemes) {
    if (!seen.has(t.label) && themes.length < topThemes) {
      themes.push(t);
      seen.add(t.label);
    }
  }
  for (const t of signalThemes) {
    if (!seen.has(t.label) && themes.length < topThemes) {
      themes.push(t);
      seen.add(t.label);
    }
  }

  if (!themes.length && articles.length) {
    const b =
      buckets[0] ||
      ({
        key: "misc",
        label: "Flux divers marchés",
        articles: articles.slice(0, 40),
        weight: 0.3,
      } as CategoryBucket);
    themes.push({
      label: b.label,
      weight: b.weight,
      summary: bucketSummary(b),
      evidenceIds: b.articles
        .slice(0, 24)
        .map((a) => a.id ?? "")
        .filter(Boolean),
    });
  }

  const clusters: AiCluster[] = themes.map((th) => {
    const bucket = buckets.find((b) => b.label === th.label);
    let ids: string[];

    if (bucket) {
      ids = bucket.articles
        .slice(0, 40)
        .map((a) => a.id ?? "")
        .filter(Boolean);
    } else {
      const keys = th.label
        .toLowerCase()
        .split(/[()\s/,&-]+/)
        .filter(Boolean)
        .slice(0, 4);
      ids = articles
        .filter((a) =>
          keys.some((k) =>
            (a.title + " " + (a.description || "")).toLowerCase().includes(k)
          )
        )
        .slice(0, 40)
        .map((a) => a.id ?? "")
        .filter(Boolean);
    }

    return {
      label: th.label,
      weight: th.weight,
      summary: th.summary || th.label,
      articleIds: ids,
    };
  });

  const actions: AiAction[] = [];
  const big = buckets.filter((b) => b.articles.length >= 12);

  if (big.length) {
    const best = big[0];
    const sym = symbolForCategory(best.key, pool);
    if (sym) {
      const text = best.articles
        .slice(0, 20)
        .map((a) => `${a.title} ${a.description || ""}`)
        .join(" ");
      const dir = guessDirectionFromText(text);
      const conf = Math.round(best.weight * 100);
      const timeframe = inferTimeframeForBucket(best);

      actions.push({
        symbol: sym,
        direction: dir,
        conviction: 4,
        confidence: conf,
        timeframe,
        reason: `Signal basé sur le thème « ${best.label} » (${best.articles.length} article(s)).`,
        evidenceIds: best.articles
          .slice(0, 20)
          .map((a) => a.id ?? "")
          .filter(Boolean),
      });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    mainThemes: themes,
    actions,
    clusters,
  };
}

/* -------------------------------------------------------------------------- */
/*  Analyse OpenAI : résumés de thèmes + trades                               */
/* -------------------------------------------------------------------------- */

export async function analyzeWithAI(
  articles: RawArticle[],
  opts: { topThemes: number; ftmoSymbols: string[]; watchlist: string[] }
): Promise<AiOutputs> {
  const topThemes = Math.max(3, Number(opts.topThemes || 5));
  const pool = defaultPool(opts.ftmoSymbols);

  const baseline = fallbackDeterministic(articles, pool, topThemes);

  if (!process.env.OPENAI_API_KEY) {
    return baseline;
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  const model = process.env.OPENAI_NEWS_MODEL || "gpt-4o-mini";

  const payload = buildAiPayload(articles, 150);
  const poolStr = pool.join(", ");

  const sys = `
Tu es un analyste buy-side macro / multi-actifs.
On t'envoie:
- un pool d'instruments FTMO (${poolStr}),
- une liste de thèmes de marché déjà identifiés (avec leur poids + résumé technique),
- un échantillon de titres d'articles (avec id, source, score, ancienneté).

Ta mission:
1) Réécrire un RÉSUMÉ NARRATIF court (max ~220 caractères, en français) pour chaque thème, en expliquant ce qui se passe concrètement pour le marché.
2) Proposer 2 à 4 idées de trade très structurées.

Règles themes:
- Ne change PAS les labels.
- Le résumé doit être actionnable, lisible par un trader (« La Fed prépare... », « Les tarifs US/Chine se durcissent... »), pas une phrase robotique sur le nombre d'articles.

Règles trades:
- Utilise uniquement les instruments du pool.
- Chaque trade doit s'appuyer sur un ou plusieurs thèmes où il y a BEAUCOUP de news (cluster de >= 12 articles pertinents).
- Pas de trade basé sur un seul titre isolé.
- Structure d'une action:
  {
    "symbol": string (par ex. "US500", "XAUUSD", "USOIL"...),
    "direction": "BUY" ou "SELL",
    "conviction": entier 0..10 (5 = neutre, 7 = fort),
    "confidence": entier 0..100,
    "reason": texte court (<= 220 caractères, en français, expliquant pourquoi le trade a du sens),
    "timeframe": "intraday-1j" | "1-3j" | "1-2sem" | "2-4sem" | "1-3mois",
    "evidenceIds": tableau de 10 à 20 ids d'articles parmi ceux fournis
  }
- "confidence" doit refléter le nombre d'articles alignés, la cohérence du narratif et la qualité des sources.
- Choisis le "timeframe" en fonction du type de news (données très court terme ou tendance de fond).
- Si tu n'as PAS au moins 12 articles alignés pour un scénario donné, NE PROPOSE PAS de trade pour ce scénario.

Réponds STRICTEMENT au format JSON:
{
  "themes": [
    { "label": "...", "summary": "..." }
  ],
  "actions": [ ... ]
}`;

  const themesForModel = baseline.mainThemes.map((t) => {
    const ids = (t.evidenceIds || []).slice(0, 12);
    const sampleTitles = ids
      .map((id) => articles.find((a) => a.id === id))
      .filter(Boolean)
      .slice(0, 6)
      .map((a) => (a as RawArticle).title);
    return {
      label: t.label,
      weight: t.weight,
      baseSummary: t.summary,
      sampleTitles,
    };
  });

  const user = JSON.stringify({
    themes: themesForModel,
    clusters: (baseline.clusters || []).map((c) => ({
      label: c.label,
      weight: c.weight,
      size: c.articleIds.length,
    })),
    articles: payload,
  });

  let actions: AiAction[] = baseline.actions ?? [];
  let mainThemes: AiTheme[] = baseline.mainThemes;

  try {
    const r = await client.chat.completions.create({
      model,
      temperature: 0.15,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
    });

    const raw = JSON.parse(r.choices[0]?.message?.content || "{}");

    // maj résumés de thèmes
    if (Array.isArray(raw.themes)) {
      const byLabel = new Map<string, string>();
      for (const t of raw.themes) {
        if (!t) continue;
        const label = String(t.label || "");
        const summary = String(t.summary || "");
        if (label && summary) byLabel.set(label, summary.slice(0, 260));
      }
      mainThemes = baseline.mainThemes.map((t) => ({
        ...t,
        summary: byLabel.get(t.label) || t.summary,
      }));
    }

    // parsing actions
    if (Array.isArray(raw.actions)) {
      const parsed: AiAction[] = raw.actions.map((a: any) => ({
        symbol: String(a.symbol || "").toUpperCase(),
        direction:
          String(a.direction || "BUY").toUpperCase() === "SELL"
            ? "SELL"
            : "BUY",
        conviction: clamp(Number(a.conviction ?? 6), 0, 10),
        confidence: clamp(Number(a.confidence ?? 50), 0, 100),
        reason: String(a.reason || "").slice(0, 220),
        timeframe: typeof a.timeframe === "string" ? a.timeframe : undefined,
        evidenceIds: Array.isArray(a.evidenceIds)
          ? a.evidenceIds.slice(0, 24).map(String)
          : [],
      }));

      const robust = parsed.filter((a) => {
        const uniq = new Set(a.evidenceIds || []);
        return uniq.size >= 10;
      });

      if (robust.length) {
        actions = robust.slice(0, 4);
      }
    }
  } catch {
    // en cas d’erreur OpenAI -> on garde baseline
  }

  return {
    generatedAt: new Date().toISOString(),
    mainThemes,
    actions,
    clusters: baseline.clusters,
  };
}

/* -------------------------------------------------------------------------- */
/*  Persistance                                                               */
/* -------------------------------------------------------------------------- */

export function persistAI(out: AiOutputs, outFile: string) {
  writeJSON(outFile, out);
}
