import OpenAI from "openai";
import { AiOutputs, AiAction, RawArticle } from "./types";
import { runAllDetectors } from "./detectors"; // fallback “dur” si IA KO
import { writeJSON } from "../../src/lib/news/fs";

function clamp(n: number, a: number, b: number) { return Math.max(a, Math.min(b, n)); }
function hoursSince(d: string) { return (Date.now() - new Date(d).getTime()) / 36e5; }

const SOURCE_WEIGHT: Record<string, number> = {
  "Reuters": 1.0,
  "Financial Times": 0.95,
  "CNBC": 0.85,
  "MarketWatch": 0.80,
  "Yahoo Finance": 0.75,
  "AP News": 0.72
};

function defaultPool(ftmo: string[]) {
  const base = ["US500","NAS100","XAUUSD","EURUSD","USDJPY","USOIL","UKOIL","DE40","UK100"];
  return ftmo.length ? ftmo : base;
}

/** Paquet compact envoyé à l’IA (titres + méta utiles, jamais l’article complet) */
function buildAiPayload(arts: RawArticle[], limit = 80) {
  return arts.slice(0, limit).map((a, idx) => ({
    id: a.id ?? String(idx),
    title: a.title,
    source: a.source,
    url: a.url,
    ageH: Math.round(hoursSince(a.publishedAt)),
    score: a.score ?? 0,
    hits: (a.hits || []).slice(0, 6)
  }));
}

/** Fallback si OpenAI absent/KO — s’appuie sur les détecteurs “durs” déjà en place */
function fallbackDeterministic(articles: RawArticle[], ftmo: string[], topThemes: number): AiOutputs {
  const pool = defaultPool(ftmo);
  const sigs = runAllDetectors(articles);
  const themes = sigs
    .filter(s => s.strength > 0)
    .sort((a,b)=>b.strength-a.strength)
    .slice(0, topThemes)
    .map(s => ({ label: s.label, weight: Math.round(s.strength*100)/100 }));

  // Génère 2–4 idées simples à partir des signaux (même logique que précédemment)
  const out: AiAction[] = [];
  for (const s of sigs.sort((a,b)=>b.strength-a.strength)) {
    const conf = Math.round(Math.max(25, Math.min(95, 25 + s.strength*70)));
    if (s.key === "dovish_us" && s.strength >= 0.35) {
      out.push({ symbol: pool.includes("US500") ? "US500" : pool[0], direction:"BUY", conviction: 6, confidence: conf, reason:"Assouplissement monétaire (US)", evidenceIds: s.evidences.map(e=>e.id!).slice(0,3) });
    }
    if (s.key === "hawkish_us" && s.strength >= 0.35) {
      out.push({ symbol: pool.includes("US500") ? "US500" : pool[0], direction:"SELL", conviction: 7, confidence: conf, reason:"Durcissement monétaire (US)", evidenceIds: s.evidences.map(e=>e.id!).slice(0,3) });
    }
    if (s.key === "tariffs_us" && s.strength >= 0.35) {
      out.push({ symbol: pool.includes("XAUUSD") ? "XAUUSD" : pool[0], direction:"BUY", conviction: 6, confidence: conf, reason:"Tarifs/sanctions: couverture or", evidenceIds: s.evidences.map(e=>e.id!).slice(0,3) });
    }
    if (out.length >= 4) break;
  }

  return { generatedAt: new Date().toISOString(), mainThemes: themes, actions: out };
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

  // ---------- OpenAI “decision-only” ----------
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  const model = process.env.OPENAI_NEWS_MODEL || "gpt-4o-mini";

  const payload = buildAiPayload(articles, 80);
  const poolStr = pool.join(", ");

  const sys = `
Tu es un analyste de marché senior. Ta mission: choisir des THÈMES et des ACTIONS DE TRADE cohérents
à partir d'une liste de titres compactée (source + âge + hits). Règles:
- NE PAS retenir comme thème les publications de données brutes (CPI, PPI, NFP, PMI, GDP, calendrier).
- Thèmes attendus: politiques monétaires, tarifs/sanctions/export-controls, M&A/antitrust/litiges,
  guidance/earnings, chocs d'offre énergie, cyber/supply-chain, politique US/UE avec impact marchés.
- Les actions doivent être sur ces instruments: ${poolStr}. Max 4 actions.
- Chaque action: {symbol, direction BUY/SELL, conviction 0..10, confidence 0..100, reason, evidenceIds[]}
- "confidence" = synthèse interne basée sur: (1) redondance des news, (2) crédibilité source
  (Reuters/FT>CNBC>Yahoo/AP), (3) fraîcheur (<24h >> <48h >> ancien), (4) cohérence thème→trade.
- evidenceIds = ids d’articles du lot fourni (max 3) qui justifient directement l'action.
- Réponses courtes, précises, sans jargon inutile. Interdiction de halluciner des liens.
- Format UNIQUE: JSON object { "mainThemes":[{"label":string,"weight":number}], "actions":[{...}] }.
`;

  const user = JSON.stringify({
    articles: payload,
    note: "Ne réponds que le JSON demandé. 'weight' des thèmes: 0..1 importance relative.",
  });

  try {
    const r = await client.chat.completions.create({
      model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user }
      ]
    });

    // Parse & normalise
    let out: AiOutputs = { generatedAt: new Date().toISOString(), mainThemes: [], actions: [] };
    try {
      const data = JSON.parse(r.choices[0]?.message?.content || "{}");
      const themes = Array.isArray(data.mainThemes) ? data.mainThemes.slice(0, topThemes) : [];
      const actions: AiAction[] = Array.isArray(data.actions) ? data.actions.slice(0, 4).map((a: any) => ({
        symbol: String(a.symbol || "").toUpperCase(),
        direction: String(a.direction || "BUY").toUpperCase() === "SELL" ? "SELL" : "BUY",
        conviction: clamp(Number(a.conviction ?? 6), 0, 10),
        confidence: clamp(Number(a.confidence ?? 50), 0, 100),
        reason: String(a.reason || "").slice(0, 240),
        evidenceIds: Array.isArray(a.evidenceIds) ? a.evidenceIds.slice(0,3).map(String) : []
      })) : [];

      out = { generatedAt: new Date().toISOString(), mainThemes: themes, actions };

      // Sécurité: si l’IA n’a rien produit, bascule sur fallback “dur”
      if (!out.actions.length && !out.mainThemes.length) {
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
