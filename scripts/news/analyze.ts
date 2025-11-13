// scripts/news/analyze.ts
import OpenAI from "openai";
import { AiOutputs, AiAction, RawArticle, AiCluster, AiTheme } from "./types";
import { runAllDetectors } from "./detectors";
import { writeJSON } from "../../src/lib/news/fs";

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

function buildAiPayload(arts: RawArticle[], limit = 90) {
  return arts.slice(0, limit).map((a, idx) => ({
    id: a.id ?? String(idx),
    title: a.title,
    source: a.source,
    url: a.url,
    ageH: Math.round(hoursSince(a.publishedAt)),
    score: a.score ?? 0,
    hits: (a.hits || []).slice(0, 8),
  }));
}

/* ---------- CATEGORIES DÉTERMINISTES POUR THÈMES / ACTIONS ---------- */

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
      "central bank",
      "rate cut",
      "rate hike",
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
    ],
  },
  {
    key: "energy",
    label: "Énergie & commodities",
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
      "inventory draw",
    ],
  },
  {
    key: "corp",
    label: "Earnings / Guidance / M&A / Antitrust",
    patterns: [
      "earnings",
      "results",
      "profits",
      "guidance",
      "forecast",
      "outlook",
      "merger",
      "acquisition",
      "deal",
      "m&a",
      "takeover",
      "bid",
      "offer",
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
      "cloud",
      "datacenter",
      "cyber",
      "ransomware",
      "hack",
      "data breach",
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
      "congress",
      "parliament",
      "white house",
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
  const map = new Map<string, { key: string; label: string; articles: RawArticle[] }>();

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
        return (
          s +
          (h <= 24
            ? 1
            : h <= 72
            ? 0.7
            : 0.4)
        );
      }, 0) / n;

    const raw =
      0.4 * Math.min(1, n / 5) +
      0.35 * Math.min(1, avgScore / 12) +
      0.25 * avgFresh;

    const weight = clamp(raw, 0.15, 0.95);
    buckets.push({ ...bucket, weight });
  }

  return buckets.sort((a, b) => b.weight - a.weight);
}

function bucketSummary(b: CategoryBucket): string {
  const n = b.articles.length;
  const ages = b.articles.map((a) => Math.round(hoursSince(a.publishedAt)));
  const minAge = Math.min(...ages, 72);
  const srcs = Array.from(new Set(b.articles.map((a) => a.source))).slice(
    0,
    3,
  );
  const window =
    minAge <= 24 ? "sur les dernières 24h" : "sur les derniers jours";
  const srcTxt = srcs.join(", ");
  return `${n} article(s) ${window}${srcTxt ? ` (${srcTxt})` : ""} sur ${b.label.toLowerCase()}.`;
}

function guessDirectionFromText(text: string): "BUY" | "SELL" {
  const t = normText(text);
  if (
    t.includes("rate cut") ||
    t.includes("dovish") ||
    t.includes("easing") ||
    t.includes("beats") ||
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
    t.includes("warning")
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

/* ---------- FALLBACK DÉTERMINISTE (toujours renvoyer qqch) ---------- */

function fallbackDeterministic(
  articles: RawArticle[],
  ftmoPool: string[],
  topThemes: number,
): AiOutputs {
  const pool = defaultPool(ftmoPool);
  const sigs = runAllDetectors(articles);
  const buckets = buildCategoryBuckets(articles);

  // Thèmes venant des signaux "durs"
  const signalThemes: AiTheme[] = sigs
    .filter((s) => s.strength > 0)
    .sort((a, b) => b.strength - a.strength)
    .slice(0, topThemes)
    .map((s) => ({
      label: s.label,
      weight: Math.round(s.strength * 100) / 100,
      summary: s.label,
      evidenceIds: s.evidences
        .map((e) => e.id ?? "")
        .filter(Boolean)
        .slice(0, 5),
    }));

  // Thèmes venant des catégories "soft"
  const bucketThemes: AiTheme[] = buckets.map((b) => ({
    label: b.label,
    weight: Math.round(b.weight * 100) / 100,
    summary: bucketSummary(b),
    evidenceIds: b.articles
      .slice(0, 6)
      .map((a) => a.id ?? "")
      .filter(Boolean),
  }));

  // Fusion : on garde les thèmes de signaux en priorité, puis on complète avec les buckets
  const themes: AiTheme[] = [];
  const seen = new Set<string>();

  for (const t of signalThemes) {
    if (!seen.has(t.label) && themes.length < topThemes) {
      themes.push(t);
      seen.add(t.label);
    }
  }
  for (const t of bucketThemes) {
    if (!seen.has(t.label) && themes.length < topThemes) {
      themes.push(t);
      seen.add(t.label);
    }
  }

  // S'il reste toujours 0 thème mais qu'on a quand même des articles, crée un thème "fourre-tout"
  if (!themes.length && articles.length) {
    const bucket: CategoryBucket = buckets[0] || {
      key: "misc",
      label: "Flux divers marchés",
      articles: articles.slice(0, 20),
      weight: 0.3,
    };
    themes.push({
      label: bucket.label,
      weight: bucket.weight,
      summary: bucketSummary(bucket),
      evidenceIds: bucket.articles
        .slice(0, 6)
        .map((a) => a.id ?? "")
        .filter(Boolean),
    });
  }

  // Clusters pour l’UI : si un thème correspond à un bucket → cluster direct, sinon recherche textuelle
  const clusters: AiCluster[] = themes.map((th) => {
    const bucket = buckets.find((b) => b.label === th.label);
    let ids: string[];

    if (bucket) {
      ids = bucket.articles
        .slice(0, 20)
        .map((a) => a.id ?? "")
        .filter(Boolean);
    } else {
      const keys = th.label
        .toLowerCase()
        .split(/[()\s/,&-]+/)
        .filter(Boolean)
        .slice(0, 3);
      ids = articles
        .filter((a) =>
          keys.some((k) =>
            (a.title + " " + (a.description || "")).toLowerCase().includes(k),
          ),
        )
        .slice(0, 20)
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

  // Actions basées sur les signaux "durs"
  const actions: AiAction[] = [];
  for (const s of sigs.sort((a, b) => b.strength - a.strength)) {
    if (s.strength <= 0) continue;

    const conf = Math.round(Math.max(25, Math.min(95, 25 + s.strength * 70)));

    if (s.key === "dovish_us" && s.strength >= 0.35) {
      actions.push({
        symbol: pool.includes("US500") ? "US500" : pool[0],
        direction: "BUY",
        conviction: 6,
        confidence: conf,
        reason: "Assouplissement monétaire (US)",
        evidenceIds: s.evidences
          .map((e) => e.id!)
          .filter(Boolean)
          .slice(0, 3),
      });
      actions.push({
        symbol: pool.includes("EURUSD") ? "EURUSD" : pool[0],
        direction: "BUY",
        conviction: 5,
        confidence: conf,
        reason: "USD susceptible de se détendre",
        evidenceIds: s.evidences
          .map((e) => e.id!)
          .filter(Boolean)
          .slice(0, 3),
      });
    }

    if (s.key === "hawkish_us" && s.strength >= 0.35) {
      actions.push({
        symbol: pool.includes("US500") ? "US500" : pool[0],
        direction: "SELL",
        conviction: 7,
        confidence: conf,
        reason: "Durcissement monétaire (US)",
        evidenceIds: s.evidences
          .map((e) => e.id!)
          .filter(Boolean)
          .slice(0, 3),
      });
    }

    if (s.key === "tariffs_us" && s.strength >= 0.35) {
      actions.push({
        symbol: pool.includes("XAUUSD") ? "XAUUSD" : pool[0],
        direction: "BUY",
        conviction: 6,
        confidence: conf,
        reason: "Tarifs/sanctions → couverture or",
        evidenceIds: s.evidences
          .map((e) => e.id!)
          .filter(Boolean)
          .slice(0, 3),
      });
    }

    if (actions.length >= 4) break;
  }

  // Dernier recours : si aucune action n’a été construite mais qu’on a au moins un bucket,
  // on fabrique un trade « soft » basé sur le thème le plus lourd.
  if (!actions.length && buckets.length) {
    const best = buckets[0];
    const sym = symbolForCategory(best.key, pool);
    if (sym) {
      const text = best.articles
        .slice(0, 10)
        .map((a) => `${a.title} ${a.description || ""}`)
        .join(" ");
      const dir = guessDirectionFromText(text);
      const conf = Math.round(best.weight * 100);
      actions.push({
        symbol: sym,
        direction: dir,
        conviction: 4,
        confidence: conf,
        reason: `Signal basé sur le thème « ${best.label} » (${best.articles.length} article(s)).`,
        evidenceIds: best.articles
          .slice(0, 4)
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

/* ---------- ANALYSE AVEC OPENAI + FALLBACK ---------- */

export async function analyzeWithAI(
  articles: RawArticle[],
  opts: { topThemes: number; ftmoSymbols: string[]; watchlist: string[] },
): Promise<AiOutputs> {
  const topThemes = Math.max(1, Number(opts.topThemes || 3));
  const pool = defaultPool(opts.ftmoSymbols);

  if (!process.env.OPENAI_API_KEY) {
    return fallbackDeterministic(articles, pool, topThemes);
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  const model = process.env.OPENAI_NEWS_MODEL || "gpt-4o-mini";

  const payload = buildAiPayload(articles, 90);
  const poolStr = pool.join(", ");

  const sys = `
Tu es un analyste buy-side. Objectif: transformer un lot de titres en
(1) thèmes clés, (2) clusters d'articles par thème, (3) idées de trade.
Contraintes:
- EXCLURE les publications de données brutes comme thème (CPI, PPI, NFP, PMI, GDP, calendriers).
- Thèmes typiques attendus: politique monétaire (dovish/hawkish/pivot), tarifs/sanctions/export-controls,
  M&A/antitrust/litiges, guidance/earnings, chocs d'offre énergie, cyber/supply-chain, politique US/UE avec impact marché.
- Clusters: pour chaque thème retenu, sélectionne jusqu'à 12 ids d'articles pertinents (parmi ceux fournis).
- Actions: uniquement sur ${poolStr}. Max 4.
- Chaque action: {symbol, direction BUY/SELL, conviction 0..10, confidence 0..100, reason, evidenceIds[] (ids d'articles)}.
- "confidence" = fonction de (redondance des titres) x (crédibilité source: Reuters/FT > CNBC > Yahoo/AP) x (fraîcheur).
- Essaie TOUJOURS de proposer au moins 1 action quand il existe un thème ayant un impact plausible
  sur macro, taux, FX, indices ou commodities. Tu peux utiliser une conviction faible (3-4/10) si le signal est modéré.
- Tu ne laisses "actions" vide que si aucune news n'a d'impact de marché exploitable.
- Réponds SEULEMENT au format JSON: {
  "mainThemes":[{"label":string,"weight":number,"summary":string,"evidenceIds":[string]}],
  "clusters":[{"label":string,"weight":number,"summary":string,"articleIds":[string]}],
  "actions":[{...}]
}.`;

  const user = JSON.stringify({
    articles: payload,
    note: "Respecte strictement la structure JSON demandée. 'weight' 0..1.",
  });

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

    let out: AiOutputs = {
      generatedAt: new Date().toISOString(),
      mainThemes: [],
      actions: [],
      clusters: [],
    };

    try {
      const data = JSON.parse(r.choices[0]?.message?.content || "{}");
      const themes: AiTheme[] = Array.isArray(data.mainThemes)
        ? data.mainThemes.slice(0, topThemes)
        : [];
      const clusters: AiCluster[] = Array.isArray(data.clusters)
        ? data.clusters.slice(0, 6)
        : [];
      const actions: AiAction[] = Array.isArray(data.actions)
        ? data.actions.slice(0, 4).map((a: any) => ({
            symbol: String(a.symbol || "").toUpperCase(),
            direction:
              String(a.direction || "BUY").toUpperCase() === "SELL"
                ? "SELL"
                : "BUY",
            conviction: clamp(Number(a.conviction ?? 6), 0, 10),
            confidence: clamp(Number(a.confidence ?? 50), 0, 100),
            reason: String(a.reason || "").slice(0, 240),
            evidenceIds: Array.isArray(a.evidenceIds)
              ? a.evidenceIds.slice(0, 12).map(String)
              : [],
          }))
        : [];

      out = {
        generatedAt: new Date().toISOString(),
        mainThemes: themes,
        actions,
        clusters,
      };

      // Si l'IA est trop timide sur les actions / thèmes, on complète avec la logique dure.
      if (
        (!out.actions || !out.actions.length) ||
        (!out.mainThemes || !out.mainThemes.length)
      ) {
        const fb = fallbackDeterministic(articles, pool, topThemes);
        if (
          (!out.mainThemes || !out.mainThemes.length) &&
          fb.mainThemes.length
        ) {
          out.mainThemes = fb.mainThemes;
        }
        if (!out.actions.length && fb.actions.length) {
          out.actions = fb.actions;
        }
        if ((!out.clusters || !out.clusters.length) && fb.clusters) {
          out.clusters = fb.clusters;
        }
      }

      if (
        (!out.actions || !out.actions.length) &&
        (!out.mainThemes || !out.mainThemes.length)
      ) {
        return fallbackDeterministic(articles, pool, topThemes);
      }

      return out;
    } catch {
      return fallbackDeterministic(articles, pool, topThemes);
    }
  } catch {
    return fallbackDeterministic(articles, pool, topThemes);
  }
}

export function persistAI(out: any, outFile: string) {
  writeJSON(outFile, out);
}
