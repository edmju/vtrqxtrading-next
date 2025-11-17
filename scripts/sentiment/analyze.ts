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

function mean(values: number[]): number {
  if (!values.length) return 0;
  const sum = values.reduce((acc, v) => acc + v, 0);
  return sum / values.length;
}

function stdDev(values: number[]): number {
  if (values.length <= 1) return 0;
  const m = mean(values);
  const variance = mean(values.map((v) => (v - m) * (v - m)));
  return Math.sqrt(variance);
}

function clampScore(value: number, min = 0, max = 100): number {
  if (!Number.isFinite(value)) return 50;
  return Math.max(min, Math.min(max, value));
}

function consensusFromStd(std: number): number {
  if (!Number.isFinite(std) || std <= 0) return 100;
  const raw = 100 - std * 2.5;
  return clampScore(Math.round(raw), 10, 100);
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

export async function buildSentimentSnapshot(
  points: SentimentPoint[],
  history: SentimentHistoryPoint[] = []
): Promise<SentimentSnapshot> {
  const now = new Date().toISOString();

  const perClassScores: Record<AssetClass, number[]> = {
    forex: [],
    stocks: [],
    commodities: [],
  };

  let totalArticles = 0;
  let bullishArticles = 0;
  let bearishArticles = 0;

  for (const p of points) {
    if (!p) continue;
    perClassScores[p.assetClass].push(p.score);

    const m = p.meta || {};
    const count =
      typeof m.articleCount === "number" && m.articleCount > 0
        ? m.articleCount
        : 0;
    const bull =
      typeof m.bullishCount === "number" && m.bullishCount > 0
        ? m.bullishCount
        : 0;
    const bear =
      typeof m.bearishCount === "number" && m.bearishCount > 0
        ? m.bearishCount
        : 0;

    totalArticles += count;
    bullishArticles += bull;
    bearishArticles += bear;
  }

  const themes: ThemeSentiment[] = (["forex", "stocks", "commodities"] as AssetClass[]).map(
    (asset) => {
      const scores = perClassScores[asset];
      const avg = scores.length ? mean(scores) : 50;
      const score = clampScore(Math.round(avg));
      return {
        id: asset,
        label: baseLabelForAsset(asset),
        score,
        direction: directionFromScore(score),
        comment: "",
      };
    }
  );

  const globalScore = clampScore(
    Math.round(mean(themes.map((t) => t.score)) || 50)
  );

  const allScores = points.map((p) => p.score);
  const sourceConsensus = consensusFromStd(stdDev(allScores));

  // Tension news vs historique
  let tensionScore: number | undefined = undefined;
  let tensionRatio: number | undefined = undefined;
  if (totalArticles > 0) {
    const pastArticles = history
      .map((h) => (typeof h.totalArticles === "number" ? h.totalArticles : 0))
      .filter((n) => n > 0);
    const pastAvg = pastArticles.length ? mean(pastArticles) : 0;

    if (pastAvg <= 0) {
      tensionScore = 50;
      tensionRatio = 1;
    } else {
      tensionRatio = totalArticles / pastAvg;
      const raw = 50 + 25 * (tensionRatio - 1); // +/- 25 pts pour +/-100% de variation
      tensionScore = clampScore(Math.round(raw));
    }
  }

  // Balance bull/bear globale
  const totalSentimentArticles = bullishArticles + bearishArticles;
  const bullShare =
    totalSentimentArticles > 0 ? bullishArticles / totalSentimentArticles : 0;
  const bearShare =
    totalSentimentArticles > 0 ? bearishArticles / totalSentimentArticles : 0;

  const bullBearScore = clampScore(
    Math.round(50 + (bullShare - bearShare) * 50)
  );

  const bullBearComment =
    totalSentimentArticles === 0
      ? "Peu d’articles explicitement haussiers/baissiers : lecture neutre pour l’instant."
      : bullShare > bearShare
      ? "Légère dominance des articles haussiers dans le flux."
      : bearShare > bullShare
      ? "Légère dominance des articles baissiers dans le flux."
      : "Répartition équilibrée entre articles haussiers et baissiers.";

  // Régime de marché de base
  let regimeLabel = "Régime neutre";
  let regimeDesc =
    "Le marché ne présente pas de biais extrême : les actifs risqués et défensifs restent relativement équilibrés.";
  let regimeConfidence = 60;

  if (globalScore >= 65) {
    regimeLabel = "Régime risk-on";
    regimeDesc =
      "Le biais agrégé est plutôt haussier : les actifs risqués sont favorisés par rapport aux valeurs défensives.";
    regimeConfidence = 70;
  } else if (globalScore <= 35) {
    regimeLabel = "Régime risk-off";
    regimeDesc =
      "Le biais agrégé est plutôt baissier : les investisseurs privilégient les actifs refuges et réduisent le risque.";
    regimeConfidence = 70;
  }

  const marketRegime: MarketRegime = {
    label: regimeLabel,
    description: regimeDesc,
    confidence: regimeConfidence,
  };

  const riskIndicators: RiskIndicator[] = [];

  // Indicateur de tension du flux
  if (totalArticles > 0) {
    const tScore = tensionScore ?? 50;
    let comment = "Flux d’actualités de volume moyen, sans tension particulière.";
    if (tensionRatio && tensionRatio >= 1.3) {
      comment =
        "Flux d’actualités nettement plus chargé que d’habitude : environnement plus nerveux à court terme.";
    } else if (tensionRatio && tensionRatio <= 0.7) {
      comment =
        "Flux d’actualités plus calme que la moyenne récente : contexte court terme relativement apaisé.";
    }

    riskIndicators.push({
      id: "tension_flux",
      label: "Tension du flux d’actualités",
      score: tScore,
      value: totalArticles ? `${totalArticles} articles` : "—",
      direction:
        tScore >= 60 ? "up" : tScore <= 40 ? "down" : ("neutral" as const),
      comment,
    });
  }

  // Indicateur bull/bear
  riskIndicators.push({
    id: "bull_bear_balance",
    label: "Balance bull / bear globale",
    score: bullBearScore,
    value:
      totalSentimentArticles > 0
        ? `${Math.round(bullShare * 100)}% bull / ${Math.round(
            bearShare * 100
          )}% bear`
        : "échantillon limité",
    direction:
      bullBearScore >= 55
        ? ("up" as const)
        : bullBearScore <= 45
        ? ("down" as const)
        : ("neutral" as const),
    comment: bullBearComment,
  });

  // Indicateur de consensus des sources
  riskIndicators.push({
    id: "source_consensus",
    label: "Consensus entre les sources",
    score: sourceConsensus,
    value: `${sourceConsensus}/100`,
    direction:
      sourceConsensus >= 60
        ? ("up" as const)
        : sourceConsensus <= 40
        ? ("down" as const)
        : ("neutral" as const),
    comment:
      sourceConsensus >= 70
        ? "Les différentes sources convergent vers une même lecture du marché."
        : sourceConsensus >= 55
        ? "Consensus raisonnable entre les sources, avec quelques nuances."
        : sourceConsensus >= 40
        ? "Lecture plus mitigée : les sources ne racontent pas exactement la même histoire."
        : "Sources divergentes : le signal de sentiment doit être utilisé avec prudence.",
  });

  // Focus drivers de base (seront raffinés par l’IA)
  const focusDrivers: FocusDriver[] = themes.map((t) => ({
    label: `Biais ${t.label}`,
    weight: 1,
    description: "",
  }));

  const baseSnapshot: SentimentSnapshot = {
    generatedAt: now,
    globalScore,
    marketRegime,
    themes,
    riskIndicators,
    focusDrivers,
    sources: points.map((p) => ({
      name: p.source,
      assetClass: p.assetClass,
      weight: 1,
    })),
    sourceConsensus,
    tensionScore,
    totalArticles,
    bullishArticles,
    bearishArticles,
  };

  const enriched = await enrichWithAI(baseSnapshot, history);

  return enriched;
}

type AiPayload = {
  globalScore: number;
  themes: {
    id: string;
    label: string;
    score: number;
  }[];
  riskIndicators: {
    id: string;
    label: string;
    score: number;
    value?: string;
  }[];
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
  marketRegime?: {
    label?: string;
    description?: string;
    confidence?: number;
  };
  focusDrivers?: {
    label: string;
    weight?: number;
    description?: string;
  }[];
  themes?: {
    id: string;
    direction?: "bullish" | "bearish" | "neutral";
    comment?: string;
  }[];
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

async function enrichWithAI(
  snapshot: SentimentSnapshot,
  history: SentimentHistoryPoint[]
): Promise<SentimentSnapshot> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return snapshot;
  }

  const client = new OpenAI({ apiKey });

  const payload: AiPayload = {
    globalScore: snapshot.globalScore,
    themes: snapshot.themes.map((t) => ({
      id: t.id,
      label: t.label,
      score: t.score,
    })),
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
            "Tu es un stratégiste macro multi-actifs. Tu reçois un résumé numérique du sentiment de marché issu de nos propres flux de données. " +
            "Tu dois produire une analyse concise et actionnable en JSON (sans texte hors-JSON).",
        },
        {
          role: "user",
          content:
            "Voici le snapshot brut (scores, indicateurs, historique). " +
            "1) Reformule le régime de marché (label + description + confiance). " +
            "2) Propose 2 à 4 focus drivers (label, weight ~1 à 3, description). " +
            "3) Pour chaque thème (forex, stocks, commodities), donne une direction (bullish/bearish/neutral) + un commentaire très court (1 phrase). " +
            "4) Propose jusqu’à 3 idées de positionnement basées UNIQUEMENT sur ce sentiment (pas de niveaux de prix, pas de timing précis). " +
            "5) Si tu juges le signal global très exploitable ou au contraire fragile, ajuste éventuellement une globalConfidence (0–100).\n\n" +
            "Réponds STRICTEMENT avec un JSON de la forme :\n" +
            "{\n" +
            '  "marketRegime": { "label": string, "description": string, "confidence": number },\n' +
            '  "focusDrivers": [ { "label": string, "weight": number, "description": string }, ... ],\n' +
            '  "themes": [ { "id": string, "direction": "bullish" | "bearish" | "neutral", "comment": string }, ... ],\n' +
            '  "suggestions": [ { "id": string, "label": string, "assetClass": string, "bias": "long" | "short" | "neutral", "confidence": number, "rationale": string }, ... ],\n' +
            '  "globalConfidence": number\n' +
            "}",
        },
        {
          role: "user",
          content: JSON.stringify(payload),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return snapshot;

    const parsed = JSON.parse(raw) as AiResponseShape;

    const updated = { ...snapshot };

    if (parsed.marketRegime) {
      updated.marketRegime = {
        label: parsed.marketRegime.label || snapshot.marketRegime.label,
        description:
          parsed.marketRegime.description ||
          snapshot.marketRegime.description,
        confidence:
          typeof parsed.marketRegime.confidence === "number"
            ? clampScore(parsed.marketRegime.confidence)
            : snapshot.marketRegime.confidence,
      };
    }

    if (Array.isArray(parsed.focusDrivers) && parsed.focusDrivers.length > 0) {
      const drivers: FocusDriver[] = parsed.focusDrivers
        .filter((d) => d && d.label)
        .map((d) => ({
          label: d.label,
          weight:
            typeof d.weight === "number" && d.weight > 0 ? d.weight : 1,
          description: d.description || "",
        }));
      if (drivers.length) {
        updated.focusDrivers = drivers;
      }
    }

    if (Array.isArray(parsed.themes) && parsed.themes.length > 0) {
      const themeById = new Map<string, ThemeSentiment>();
      updated.themes.forEach((t) => themeById.set(t.id, t));

      for (const t of parsed.themes) {
        if (!t || !t.id) continue;
        const base = themeById.get(t.id);
        if (!base) continue;

        const next: ThemeSentiment = { ...base };
        if (t.direction === "bullish" || t.direction === "bearish" || t.direction === "neutral") {
          next.direction = t.direction;
        }
        if (t.comment) {
          next.comment = t.comment;
        }
        themeById.set(t.id, next);
      }

      updated.themes = Array.from(themeById.values());
    }

    if (Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0) {
      const suggestions: SentimentSuggestion[] = parsed.suggestions
        .filter((s) => s && s.label && s.rationale)
        .slice(0, 3)
        .map((s, index) => {
          const bias: SentimentSuggestion["bias"] =
            s.bias === "long" || s.bias === "short" || s.bias === "neutral"
              ? s.bias
              : "neutral";

          let assetClass: SentimentSuggestion["assetClass"] = "global";
          const rawAsset = (s.assetClass || "").toLowerCase();
          if (rawAsset.includes("forex") || rawAsset.includes("fx")) {
            assetClass = "forex";
          } else if (
            rawAsset.includes("stock") ||
            rawAsset.includes("equity") ||
            rawAsset.includes("indice")
          ) {
            assetClass = "stocks";
          } else if (
            rawAsset.includes("commod") ||
            rawAsset.includes("energy") ||
            rawAsset.includes("raw")
          ) {
            assetClass = "commodities";
          }

          const confidence =
            typeof s.confidence === "number"
              ? clampScore(Math.round(s.confidence))
              : 60;

          return {
            id: s.id || `sentiment-${index + 1}`,
            label: s.label,
            assetClass,
            bias,
            confidence,
            rationale: s.rationale,
          };
        });

      if (suggestions.length) {
        updated.suggestions = suggestions;
      }
    }

    if (typeof parsed.globalConfidence === "number") {
      updated.globalConfidence = clampScore(
        Math.round(parsed.globalConfidence)
      );
    }

    return updated;
  } catch (err) {
    console.error("[sentiment] AI enrichment error", err);
    return snapshot;
  }
}
