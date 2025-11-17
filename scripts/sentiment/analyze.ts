// scripts/sentiment/analyze.ts

import OpenAI from "openai";
import {
  AssetClass,
  FocusDriver,
  MarketRegime,
  RiskIndicator,
  SentimentHistoryPoint,
  SentimentPoint,
  SentimentSnapshot,
  SentimentSuggestion,
  ThemeSentiment,
} from "./types";

const DEFAULT_MODEL = process.env.SENTIMENT_MODEL || "gpt-4.1-mini";

/* ------------------------------- utils ---------------------------------- */

function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length <= 1) return 0;
  const m = mean(values);
  const v = mean(values.map((x) => (x - m) * (x - m)));
  return Math.sqrt(v);
}

function clampScore(v: number, min = 0, max = 100): number {
  if (!Number.isFinite(v)) return 50;
  return Math.max(min, Math.min(max, v));
}

function consensusFromStd(std: number): number {
  if (!Number.isFinite(std) || std <= 0) return 100;
  return clampScore(Math.round(100 - std * 2.5), 10, 100);
}

function directionFromScore(score: number): "bullish" | "bearish" | "neutral" {
  if (score >= 55) return "bullish";
  if (score <= 45) return "bearish";
  return "neutral";
}

function baseLabelForAsset(asset: AssetClass): string {
  if (asset === "forex") return "Forex";
  if (asset === "stocks") return "Actions";
  return "Commodities";
}

/* --------------------------- construction snapshot ---------------------- */

export async function buildSentimentSnapshot(
  points: SentimentPoint[],
  history: SentimentHistoryPoint[] = []
): Promise<SentimentSnapshot> {
  const now = new Date().toISOString();

  const perClass: Record<AssetClass, number[]> = {
    forex: [],
    stocks: [],
    commodities: [],
  };

  let totalArticles = 0;
  let bullishArticles = 0;
  let bearishArticles = 0;

  for (const p of points) {
    if (!p) continue;
    perClass[p.assetClass].push(p.score);

    const m = p.meta || {};
    const cnt = typeof m.articleCount === "number" ? m.articleCount : 0;
    const bull = typeof m.bullishCount === "number" ? m.bullishCount : 0;
    const bear = typeof m.bearishCount === "number" ? m.bearishCount : 0;

    totalArticles += Math.max(0, cnt);
    bullishArticles += Math.max(0, bull);
    bearishArticles += Math.max(0, bear);
  }

  const themes: ThemeSentiment[] = (["forex", "stocks", "commodities"] as AssetClass[]).map(
    (asset) => {
      const arr = perClass[asset];
      const score = clampScore(Math.round(arr.length ? mean(arr) : 50));
      return {
        id: asset,
        label: baseLabelForAsset(asset),
        score,
        direction: directionFromScore(score),
        comment: "",
      };
    }
  );

  const globalScore = clampScore(Math.round(mean(themes.map((t) => t.score)) || 50));
  const allScores = points.map((p) => p.score);
  const sourceConsensus = consensusFromStd(stdDev(allScores));

  // Tension du flux vs historique (chauffe du newsflow)
  let tensionScore = 50;
  let tensionRatio = 1;
  if (totalArticles > 0) {
    const past = history
      .map((h) => (typeof h.totalArticles === "number" ? h.totalArticles : 0))
      .filter((n) => n > 0);
    const avg = past.length ? mean(past) : 0;
    tensionRatio = avg > 0 ? totalArticles / avg : 1;
    tensionScore = clampScore(Math.round(50 + 25 * (tensionRatio - 1)));
  }

  // Balance bull/bear
  const totalTagged = bullishArticles + bearishArticles;
  const bullShare = totalTagged > 0 ? bullishArticles / totalTagged : 0.5;
  const bearShare = totalTagged > 0 ? bearishArticles / totalTagged : 0.5;
  const bullBearScore = clampScore(Math.round(50 + (bullShare - bearShare) * 50));
  const bullBearComment =
    totalTagged === 0
      ? "Peu d’articles explicitement haussiers/baissiers : lecture neutre."
      : bullShare > bearShare
      ? "Légère dominance des articles haussiers."
      : bearShare > bullShare
      ? "Légère dominance des articles baissiers."
      : "Répartition équilibrée entre articles haussiers et baissiers.";

  // Régime
  let regimeLabel = "Régime neutre";
  let regimeDesc =
    "Lecture équilibrée : pas de biais extrême entre actifs risqués et défensifs.";
  let regimeConfidence = 60;

  if (globalScore >= 65) {
    regimeLabel = "Régime risk-on";
    regimeDesc =
      "Biais agrégé plutôt haussier : actifs risqués favorisés par rapport aux valeurs défensives.";
    regimeConfidence = 70;
  } else if (globalScore <= 35) {
    regimeLabel = "Régime risk-off";
    regimeDesc =
      "Biais agrégé plutôt baissier : préférence accrue pour les actifs refuges.";
    regimeConfidence = 70;
  }

  const riskIndicators: RiskIndicator[] = [
    {
      id: "tension_flux",
      label: "Température du flux d’actualités",
      score: tensionScore,
      value: totalArticles ? `${totalArticles} articles` : "—",
      direction: tensionScore >= 60 ? "up" : tensionScore <= 40 ? "down" : "neutral",
      comment:
        tensionRatio >= 1.3
          ? "Flux nettement plus chargé que d’habitude."
          : tensionRatio <= 0.7
          ? "Flux plus calme que la moyenne récente."
          : "Flux de volume moyen.",
    },
    {
      id: "bull_bear_balance",
      label: "Balance bull/bear globale",
      score: bullBearScore,
      value:
        totalTagged > 0
          ? `${Math.round(bullShare * 100)}% bull / ${Math.round(bearShare * 100)}% bear`
          : "échantillon limité",
      direction: bullBearScore >= 55 ? "up" : bullBearScore <= 45 ? "down" : "neutral",
      comment: bullBearComment,
    },
    {
      id: "source_consensus",
      label: "Consensus des sources",
      score: sourceConsensus,
      value: `${sourceConsensus}/100`,
      direction:
        sourceConsensus >= 60 ? "up" : sourceConsensus <= 40 ? "down" : "neutral",
      comment:
        sourceConsensus >= 70
          ? "Forte convergence des sources."
          : sourceConsensus >= 55
          ? "Consensus raisonnable, avec nuances."
          : sourceConsensus >= 40
          ? "Lecture mitigée entre sources."
          : "Sources divergentes : prudence.",
    },
  ];

  const marketRegime: MarketRegime = {
    label: regimeLabel,
    description: regimeDesc,
    confidence: regimeConfidence,
  };

  const baseSnapshot: SentimentSnapshot = {
    generatedAt: now,
    globalScore,
    marketRegime,
    themes,
    riskIndicators,
    focusDrivers: [], // sera rempli par l’IA
    sources: points.map((p) => ({ name: p.source, assetClass: p.assetClass, weight: 1 })),
    sourceConsensus,
    tensionScore,
    totalArticles,
    bullishArticles,
    bearishArticles,
  };

  const enriched = await enrichWithAI(baseSnapshot, history);
  return enriched;
}

/* ----------------------------- enrichissement IA ------------------------ */

type AiPayload = {
  globalScore: number;
  themes: { id: string; label: string; score: number }[];
  riskIndicators: { id: string; label: string; score: number; value?: string }[];
  metrics: {
    sourceConsensus?: number;
    tensionScore?: number;
    globalConfidence?: number;
    totalArticles?: number;
    bullishArticles?: number;
    bearishArticles?: number;
  };
  history: {
    timestamp: string;
    globalScore: number;
    forexScore?: number;
    stocksScore?: number;
    commoditiesScore?: number;
  }[];
};

type AiResponseShape = {
  marketRegime?: { label?: string; description?: string; confidence?: number };
  focusDrivers?: { label: string; weight?: number; description?: string }[];
  themes?: { id: string; direction?: "bullish" | "bearish" | "neutral"; comment?: string }[];
  suggestions?: {
    id?: string;
    label: string;
    assetClass?: string;
    bias?: "long" | "short" | "neutral";
    confidence?: number;
    rationale: string;
  }[];
  globalConfidence?: number;
};

function sanitizeDriverText(txt: string): string {
  // Evite des % “durs” qui peuvent créer des incohérences d’affichage
  // Ex: "95% des acteurs..." -> "Large majorité d’acteurs..."
  return (txt || "")
    .replace(/\b\d{1,3}\s?%/g, "une large majorité")
    .replace(/\b\d+\/\d+\b/g, "plusieurs");
}

async function enrichWithAI(
  snapshot: SentimentSnapshot,
  history: SentimentHistoryPoint[]
): Promise<SentimentSnapshot> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return snapshot;

  const client = new OpenAI({ apiKey });

  const payload: AiPayload = {
    globalScore: snapshot.globalScore,
    themes: snapshot.themes.map((t) => ({ id: t.id, label: t.label, score: t.score })),
    riskIndicators: snapshot.riskIndicators.map((r) => ({
      id: r.id,
      label: r.label,
      score: r.score,
      value: r.value,
    })),
    metrics: {
      sourceConsensus: snapshot.sourceConsensus,
      tensionScore: snapshot.tensionScore,
      globalConfidence: snapshot.globalConfidence,
      totalArticles: snapshot.totalArticles,
      bullishArticles: snapshot.bullishArticles,
      bearishArticles: snapshot.bearishArticles,
    },
    history: (history || []).slice(-24).map((h) => ({
      timestamp: h.timestamp,
      globalScore: h.globalScore,
      forexScore: h.forexScore,
      stocksScore: h.stocksScore,
      commoditiesScore: h.commoditiesScore,
    })),
  };

  try {
    const completion = await client.chat.completions.create({
      model: DEFAULT_MODEL,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Tu es un stratégiste macro multi-actifs. Tu reçois un résumé numérique issu de nos flux propriétaires. " +
            "Tu produis une analyse concise, actionnable et cohérente SANS citer de fournisseurs externes. " +
            "IMPORTANT: dans les focus drivers, n’utilise PAS de pourcentages/chiffres ‘durs’. Préfère des termes qualitatifs (fort, modéré, faible).",
        },
        {
          role: "user",
          content:
            "À partir du snapshot suivant : " +
            "1) Reformule le régime (label + description + confiance). " +
            "2) Propose 2–4 focus drivers (label, weight ∈ {1,2,3}, description qualitative). " +
            "3) Pour chaque thème (forex, stocks, commodities), donne direction + une phrase de commentaire. " +
            "4) Donne jusqu’à 3 idées de positionnement basées UNIQUEMENT sur ce sentiment (pas de niveaux ni de timing). " +
            "5) Si le signal global est très exploitable ou fragile, ajuste globalConfidence (0–100). " +
            "Réponds STRICTEMENT en JSON : " +
            "{ marketRegime, focusDrivers, themes, suggestions, globalConfidence }",
        },
        { role: "user", content: JSON.stringify(payload) },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return snapshot;

    const parsed = JSON.parse(raw) as AiResponseShape;
    const next = { ...snapshot };

    if (parsed.marketRegime) {
      next.marketRegime = {
        label: parsed.marketRegime.label || snapshot.marketRegime.label,
        description: parsed.marketRegime.description || snapshot.marketRegime.description,
        confidence:
          typeof parsed.marketRegime.confidence === "number"
            ? clampScore(Math.round(parsed.marketRegime.confidence))
            : snapshot.marketRegime.confidence,
      };
    }

    if (Array.isArray(parsed.focusDrivers)) {
      const drivers: FocusDriver[] = parsed.focusDrivers
        .filter((d) => d && d.label)
        .map((d) => ({
          label: d.label,
          // poids 1..3 – par défaut 1
          weight:
            typeof d.weight === "number" && d.weight >= 1 && d.weight <= 3 ? d.weight : 1,
          description: sanitizeDriverText(d.description || ""),
        }));
      if (drivers.length) next.focusDrivers = drivers;
    }

    if (Array.isArray(parsed.themes) && parsed.themes.length > 0) {
      const m = new Map<string, ThemeSentiment>();
      next.themes.forEach((t) => m.set(t.id, t));

      for (const t of parsed.themes) {
        const base = t?.id ? m.get(t.id) : undefined;
        if (!base) continue;
        const copy: ThemeSentiment = { ...base };
        if (t.direction === "bullish" || t.direction === "bearish" || t.direction === "neutral")
          copy.direction = t.direction;
        if (t.comment) copy.comment = t.comment;
        m.set(t.id, copy);
      }
      next.themes = Array.from(m.values());
    }

    if (Array.isArray(parsed.suggestions)) {
      const list: SentimentSuggestion[] = parsed.suggestions
        .filter((s) => s && s.label && s.rationale)
        .slice(0, 3)
        .map((s, i) => {
          const bias: SentimentSuggestion["bias"] =
            s.bias === "long" || s.bias === "short" || s.bias === "neutral" ? s.bias : "neutral";
          let asset: SentimentSuggestion["assetClass"] = "global";
          const raw = (s.assetClass || "").toLowerCase();
          if (raw.includes("forex") || raw.includes("fx")) asset = "forex";
          else if (raw.includes("stock") || raw.includes("equity") || raw.includes("indice"))
            asset = "stocks";
          else if (raw.includes("commod")) asset = "commodities";
          const conf =
            typeof s.confidence === "number" ? clampScore(Math.round(s.confidence)) : 60;

          return {
            id: s.id || `sentiment-${i + 1}`,
            label: s.label,
            assetClass: asset,
            bias,
            confidence: conf,
            rationale: s.rationale,
          };
        });

      if (list.length) next.suggestions = list;
    }

    if (typeof parsed.globalConfidence === "number") {
      next.globalConfidence = clampScore(Math.round(parsed.globalConfidence));
    }

    return next;
  } catch (e) {
    console.error("[sentiment] AI enrichment error", e);
    return snapshot;
  }
}
