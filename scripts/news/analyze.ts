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
    "UK100"
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
    hits: (a.hits || []).slice(0, 8)
  }));
}

function fallbackDeterministic(
  articles: RawArticle[],
  ftmoPool: string[],
  topThemes: number
): AiOutputs {
  const pool = defaultPool(ftmoPool);
  const sigs = runAllDetectors(articles);

  const themes: AiTheme[] = sigs
    .filter(s => s.strength > 0)
    .sort((a, b) => b.strength - a.strength)
    .slice(0, topThemes)
    .map(s => ({
      label: s.label,
      weight: Math.round(s.strength * 100) / 100,
      summary: s.label,
      evidenceIds: s.evidences
        .map(e => e.id ?? "")
        .filter(Boolean)
        .slice(0, 5)
    }));

  // clusters simples par mot-clé du label de thème
  const clusters: AiCluster[] = themes.map(th => {
    const key = th.label
      .toLowerCase()
      .split(/[()\s/,&-]+/)
      .filter(Boolean)
      .slice(0, 3);
    const ids = articles
      .filter(a =>
        key.some(k =>
          (a.title + " " + (a.description || "")).toLowerCase().includes(k)
        )
      )
      .slice(0, 20)
      .map(a => a.id ?? "")
      .filter(Boolean);
    return {
      label: th.label,
      weight: th.weight,
      summary: th.summary || th.label,
      articleIds: ids
    };
  });

  const out: AiAction[] = [];
  for (const s of sigs.sort((a, b) => b.strength - a.strength)) {
    const conf = Math.round(
      Math.max(25, Math.min(95, 25 + s.strength * 70))
    );
    if (s.key === "dovish_us" && s.strength >= 0.35) {
      out.push({
        symbol: pool.includes("US500") ? "US500" : pool[0],
        direction: "BUY",
        conviction: 6,
        confidence: conf,
        reason: "Assouplissement monétaire (US)",
        evidenceIds: s.evidences.map(e => e.id!).slice(0, 3)
      });
      out.push({
        symbol: pool.includes("EURUSD") ? "EURUSD" : pool[0],
        direction: "BUY",
        conviction: 5,
        confidence: conf,
        reason: "USD susceptible de se détendre",
        evidenceIds: s.evidences.map(e => e.id!).slice(0, 3)
      });
    }
    if (s.key === "hawkish_us" && s.strength >= 0.35) {
      out.push({
        symbol: pool.includes("US500") ? "US500" : pool[0],
        direction: "SELL",
        conviction: 7,
        confidence: conf,
        reason: "Durcissement monétaire (US)",
        evidenceIds: s.evidences.map(e => e.id!).slice(0, 3)
      });
    }
    if (s.key === "tariffs_us" && s.strength >= 0.35) {
      out.push({
        symbol: pool.includes("XAUUSD") ? "XAUUSD" : pool[0],
        direction: "BUY",
        conviction: 6,
        confidence: conf,
        reason: "Tarifs/sanctions → couverture or",
        evidenceIds: s.evidences.map(e => e.id!).slice(0, 3)
      });
    }
    if (out.length >= 4) break;
  }

  return {
    generatedAt: new Date().toISOString(),
    mainThemes: themes,
    actions: out,
    clusters
  };
}

export async function analyzeWithAI(
  articles: RawArticle[],
  opts: { topThemes: number; ftmoSymbols: string[]; watchlist: string[] }
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
    note: "Respecte strictement la structure JSON demandée. 'weight' 0..1."
  });

  try {
    const r = await client.chat.completions.create({
      model,
      temperature: 0.15,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user }
      ]
    });

    let out: AiOutputs = {
      generatedAt: new Date().toISOString(),
      mainThemes: [],
      actions: [],
      clusters: []
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
              : []
          }))
        : [];

      out = {
        generatedAt: new Date().toISOString(),
        mainThemes: themes,
        actions,
        clusters
      };

      // Si l'IA est trop timide sur les actions / thèmes, on complète avec la logique dure.
      if (
        (!out.actions || !out.actions.length) ||
        (!out.mainThemes || !out.mainThemes.length)
      ) {
        const fb = fallbackDeterministic(articles, pool, topThemes);
        if ((!out.mainThemes || !out.mainThemes.length) && fb.mainThemes.length) {
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
