// scripts/sentiment/analyze.ts

import OpenAI from "openai";
import {
  type AssetClass,
  type SentimentPoint,
  type SentimentSnapshot,
  type ThemeSentiment,
  type FocusDriver,
  type MarketRegime,
  type RiskIndicator,
  type SentimentHistoryPoint,
  type SentimentTradeIdea,
} from "./types";

function mean(nums: number[]): number {
  if (!nums.length) return 50;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function stdDev(nums: number[]): number {
  if (nums.length <= 1) return 0;
  const m = mean(nums);
  const variance =
    nums.reduce((acc, v) => acc + (v - m) * (v - m), 0) / nums.length;
  return Math.sqrt(variance);
}

function directionFromScore(score: number): "bullish" | "bearish" | "neutral" {
  if (score >= 60) return "bullish";
  if (score <= 40) return "bearish";
  return "neutral";
}

function labelForAssetClass(id: AssetClass): string {
  switch (id) {
    case "forex":
      return "Forex";
    case "stocks":
      return "Actions";
    case "commodities":
      return "Commodities";
    default:
      return id;
  }
}

function commentForTheme(id: AssetClass, score: number): string {
  const label = labelForAssetClass(id);
  const rounded = Math.round(score);

  if (score >= 60)
    return `${label} montre un biais plutôt haussier (${rounded}/100).`;
  if (score <= 40)
    return `${label} montre un biais plutôt baissier (${rounded}/100).`;
  return `${label} reste globalement neutre (${rounded}/100).`;
}

function deterministicMarketRegime(globalScore: number): MarketRegime {
  const s = Math.round(globalScore);
  if (s >= 60) {
    return {
      label: "Risk-on modéré",
      description:
        "Le sentiment agrégé penche vers un scénario risk-on, avec un biais haussier sur les actifs risqués.",
      confidence: Math.min(100, 30 + (s - 60) * 2),
    };
  }
  if (s <= 40) {
    return {
      label: "Risk-off modéré",
      description:
        "Le sentiment agrégé penche vers un scénario risk-off, avec une recherche de sécurité accrue.",
      confidence: Math.min(100, 30 + (40 - s) * 2),
    };
  }
  return {
    label: "Neutre",
    description:
      "Régime neutre : les signaux de sentiment restent globalement équilibrés entre risk-on et risk-off.",
    confidence: 50,
  };
}

function deterministicFocusDrivers(
  themes: ThemeSentiment[]
): FocusDriver[] {
  const spreadSorted = [...themes].sort(
    (a, b) => Math.abs(b.score - 50) - Math.abs(a.score - 50)
  );

  const drivers: FocusDriver[] = [];
  for (const t of spreadSorted) {
    const delta = Math.abs(t.score - 50);
    if (delta < 5) continue;
    const weight = Math.min(1, delta / 30);
    drivers.push({
      label: t.label,
      weight,
      description: t.comment,
    });
    if (drivers.length >= 3) break;
  }
  return drivers;
}

function baseTradeIdeasFromThemes(
  themes: ThemeSentiment[]
): SentimentTradeIdea[] {
  const ideas: SentimentTradeIdea[] = [];

  const fx = themes.find((t) => t.id === "forex");
  const st = themes.find((t) => t.id === "stocks");
  const cm = themes.find((t) => t.id === "commodities");

  if (st && st.score >= 60) {
    ideas.push({
      id: "stocks_long",
      label: "Biais haussier sur actions",
      asset: "US500",
      direction: "long",
      horizon: "1–3 jours",
      confidence: Math.round(st.score),
      reasoning:
        "Le sentiment agrégé sur les actions montre un biais haussier, ce qui plaide pour un biais acheteur sur les grands indices.",
    });
  } else if (st && st.score <= 40) {
    ideas.push({
      id: "stocks_short",
      label: "Biais défensif sur actions",
      asset: "US500",
      direction: "short",
      horizon: "1–3 jours",
      confidence: 100 - Math.round(st.score),
      reasoning:
        "Le sentiment agrégé sur les actions est plutôt négatif, ce qui milite pour une approche défensive sur les indices.",
    });
  }

  if (cm && cm.score >= 60) {
    ideas.push({
      id: "commod_long",
      label: "Appétit pour les matières premières",
      asset: "XAUUSD",
      direction: "long",
      horizon: "swing",
      confidence: Math.round(cm.score),
      reasoning:
        "Les matières premières ressortent en territoire haussier, ce qui renforce l’attrait pour les actifs réels comme l’or.",
    });
  }

  if (fx && fx.score <= 40) {
    ideas.push({
      id: "fx_defensive",
      label: "Préférence pour les devises refuges",
      asset: "USDJPY",
      direction: "long",
      horizon: "1–3 jours",
      confidence: 100 - Math.round(fx.score),
      reasoning:
        "Le sentiment sur le Forex est plutôt risk-off, ce qui favorise un biais pro-USD/JPY face aux devises cycliques.",
    });
  }

  return ideas.slice(0, 3);
}

/**
 * Enrichit avec OpenAI si la clé est dispo.
 */
async function enrichWithAI(
  snapshot: SentimentSnapshot,
  points: SentimentPoint[],
  history: SentimentHistoryPoint[]
): Promise<SentimentSnapshot> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return snapshot;

  try {
    const client = new OpenAI({ apiKey });
    const model = process.env.SENTIMENT_MODEL || "gpt-4.1-mini";

    const payload = {
      globalScore: snapshot.globalScore,
      themes: snapshot.themes.map((t) => ({
        id: t.id,
        label: t.label,
        score: t.score,
        direction: t.direction,
      })),
      metrics: {
        totalArticles: snapshot.totalArticles,
        bullishArticles: snapshot.bullishArticles,
        bearishArticles: snapshot.bearishArticles,
        globalConfidence: snapshot.globalConfidence,
      },
      rawPoints: points.slice(0, 80).map((p) => ({
        source: p.source,
        assetClass: p.assetClass,
        score: p.score,
      })),
      recentHistory: history.slice(-24),
    };

    const sys = `
Tu es un stratégiste macro multi-actifs.
On te donne:
- un score global de sentiment (0–100),
- des scores par grande classe d'actifs (forex, actions, commodities),
- des statistiques d'articles (bull/bear, volume),
- une petite série historique récente.

Ta mission:
1) Reformuler un régime de marché synthétique (label + description détaillée) cohérent avec ces signaux.
2) Proposer 1 à 3 "focus drivers" clairs avec une explication courte.
3) Affiner les commentaires pour chaque grande classe d'actifs (forex, actions, commodities) + direction bullish/bearish/neutral.
4) Proposer 1 à 3 idées de trades simples basées sur le sentiment (pas de levier, pas de conseil personnalisé, seulement des idées : actif, sens, horizon, confiance, justification).
5) Donner une "globalConfidence" 0–100 sur la lisibilité du signal de sentiment.

Réponds en JSON strict:
{
  "marketRegime": { "label": string, "description": string, "confidence": number },
  "focusDrivers": [
    { "label": string, "description": string, "weight": number }
  ],
  "themes": [
    { "id": "forex" | "stocks" | "commodities", "comment": string, "direction": "bullish" | "bearish" | "neutral" }
  ],
  "tradeIdeas": [
    {
      "id": string,
      "label": string,
      "asset": string,
      "direction": "long" | "short",
      "horizon": string,
      "confidence": number,
      "reasoning": string
    }
  ],
  "globalConfidence": number
}
`;

    const res = await client.chat.completions.create({
      model,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: sys },
        { role: "user", content: JSON.stringify(payload) },
      ],
    });

    const raw = JSON.parse(res.choices[0]?.message?.content || "{}");

    const next: SentimentSnapshot = { ...snapshot };

    if (raw.globalConfidence != null && typeof raw.globalConfidence === "number") {
      next.globalConfidence = Math.max(
        0,
        Math.min(100, Math.round(raw.globalConfidence))
      );
    }

    if (raw.marketRegime) {
      const mr = raw.marketRegime;
      next.marketRegime = {
        label: String(mr.label || snapshot.marketRegime.label),
        description: String(
          mr.description || snapshot.marketRegime.description
        ).slice(0, 800),
        confidence:
          typeof mr.confidence === "number"
            ? Math.max(0, Math.min(100, Math.round(mr.confidence)))
            : snapshot.marketRegime.confidence,
      };
    }

    if (Array.isArray(raw.focusDrivers) && raw.focusDrivers.length) {
      next.focusDrivers = raw.focusDrivers.slice(0, 3).map((d: any) => ({
        label: String(d.label || "Driver").slice(0, 140),
        description: String(d.description || "").slice(0, 320),
        weight:
          typeof d.weight === "number"
            ? Math.max(0, Math.min(1, d.weight))
            : 0.5,
      }));
    }

    if (Array.isArray(raw.themes) && raw.themes.length) {
      const byId = new Map<
        string,
        { comment?: string; direction?: string }
      >();
      for (const t of raw.themes) {
        if (!t) continue;
        const id = String(t.id || "").toLowerCase();
        if (!id) continue;
        const comment =
          typeof t.comment === "string" ? String(t.comment) : undefined;
        const direction =
          typeof t.direction === "string"
            ? String(t.direction).toLowerCase()
            : undefined;
        byId.set(id, { comment, direction });
      }

      next.themes = next.themes.map((t) => {
        const upd = byId.get(t.id);
        if (!upd) return t;

        let dir = t.direction;
        if (
          upd.direction === "bullish" ||
          upd.direction === "bearish" ||
          upd.direction === "neutral"
        ) {
          dir = upd.direction;
        }

        return {
          ...t,
          comment: upd.comment
            ? upd.comment.slice(0, 280)
            : t.comment,
          direction: dir,
        };
      });
    }

    if (Array.isArray(raw.tradeIdeas) && raw.tradeIdeas.length) {
      next.tradeIdeas = raw.tradeIdeas.slice(0, 3).map((ti: any, idx: number) => ({
        id: String(ti.id || `idea_${idx + 1}`).slice(0, 80),
        label: String(ti.label || "Idée de trade").slice(0, 120),
        asset: String(ti.asset || "US500").slice(0, 40),
        direction:
          ti.direction === "short" ? "short" : "long",
        horizon: String(ti.horizon || "1–3 jours").slice(0, 80),
        confidence:
          typeof ti.confidence === "number"
            ? Math.max(0, Math.min(100, Math.round(ti.confidence)))
            : 60,
        reasoning: String(ti.reasoning || "").slice(0, 400),
      }));
    }

    return next;
  } catch (err) {
    console.warn("[sentiment] OpenAI enrichment failed", err);
    return snapshot;
  }
}

/**
 * Point d'entrée principal: transforme des points bruts en snapshot,
 * en utilisant aussi l'historique pour la "tension" du flux.
 */
export async function buildSentimentSnapshot(
  points: SentimentPoint[],
  history: SentimentHistoryPoint[]
): Promise<SentimentSnapshot> {
  const perClass: Record<AssetClass, number[]> = {
    forex: [],
    stocks: [],
    commodities: [],
  };

  let totalArticles = 0;
  let bullishArticles = 0;
  let bearishArticles = 0;

  for (const p of points) {
    if (p.score >= 0 && p.score <= 100) {
      perClass[p.assetClass]?.push(p.score);
    }

    const meta = (p.meta || {}) as any;
    if (typeof meta.articleCount === "number") {
      totalArticles += meta.articleCount;
      if (typeof meta.bullishCount === "number") {
        bullishArticles += meta.bullishCount;
      }
      if (typeof meta.bearishCount === "number") {
        bearishArticles += meta.bearishCount;
      }
    }
  }

  const themes: ThemeSentiment[] = (
    ["forex", "stocks", "commodities"] as AssetClass[]
  ).map((id) => {
    const scores = perClass[id];
    const score = mean(scores);
    return {
      id,
      label: labelForAssetClass(id),
      score: Math.round(score),
      direction: directionFromScore(score),
      comment: commentForTheme(id, score),
    };
  });

  const allScores = points.map((p) => p.score);
  const globalScore = Math.round(mean(allScores));

  const riskIndicators: RiskIndicator[] = [];

  // Consensus des sources (dispersion)
  if (allScores.length > 0) {
    const dispersion = stdDev(allScores); // typiquement max ~30
    const consensusScore = Math.round(
      Math.max(0, Math.min(100, 100 - (dispersion / 30) * 100))
    );

    riskIndicators.push({
      id: "source_consensus",
      label: "Consensus des sources",
      score: consensusScore,
      value: `${dispersion.toFixed(1)} pts d'écart-type`,
      direction:
        consensusScore >= 55
          ? "up"
          : consensusScore <= 45
          ? "down"
          : "neutral",
      comment:
        consensusScore >= 70
          ? "Les différentes sources de sentiment sont fortement alignées."
          : consensusScore <= 40
          ? "Les sources de sentiment envoient des signaux divergents, ce qui rend la lecture plus fragile."
          : "Les sources sont modérément alignées, sans consensus extrême.",
    });
  }

  // Tension du flux d'actualités vs historique
  let heatScore = 50;
  if (totalArticles > 0) {
    const validHistory = (history || []).filter(
      (h) => typeof h.totalArticles === "number" && h.totalArticles > 0
    );
    if (validHistory.length === 0) {
      heatScore = 60;
    } else {
      const baseline = mean(validHistory.map((h) => h.totalArticles));
      const ratio = baseline > 0 ? totalArticles / baseline : 1;
      if (ratio >= 1) {
        heatScore = Math.min(100, 50 + (ratio - 1) * 40); // ratio 2 => 90
      } else {
        heatScore = Math.max(0, 50 - (1 - ratio) * 40); // ratio 0.5 => 30
      }
    }

    riskIndicators.push({
      id: "news_heat",
      label: "Température du flux d’actualités",
      score: Math.round(heatScore),
      value: `${totalArticles} articles`,
      direction:
        heatScore >= 55 ? "up" : heatScore <= 45 ? "down" : "neutral",
      comment:
        validHistory.length === 0
          ? `Volume agrégé d’environ ${totalArticles} articles Alpha Vantage sur la fenêtre récente.`
          : `Le volume d’articles est ${
              heatScore >= 55 ? "supérieur" : heatScore <= 45 ? "inférieur" : "proche"
            } à la moyenne récente, signe d’un ${
              heatScore >= 55 ? "contexte plus actif" : heatScore <= 45 ? "contexte plus calme" : "flux normalisé"
            }.`,
    });
  }

  // Balance bull/bear
  if (totalArticles > 0) {
    const bullShare = Math.round((bullishArticles / totalArticles) * 100);
    const bearShare = Math.round((bearishArticles / totalArticles) * 100);
    const clarityScore = Math.max(
      0,
      Math.min(
        100,
        50 + (Math.abs(bullShare - bearShare) / 100) * 40
      )
    );

    riskIndicators.push({
      id: "bull_bear_balance",
      label: "Balance bull/bear globale",
      score: bullShare,
      value: `${bullShare}% bull`,
      direction:
        bullShare >= 55 ? "up" : bullShare <= 45 ? "down" : "neutral",
      comment:
        bullShare || bearShare
          ? `Environ ${bullShare}% des articles sont classés haussiers contre ${bearShare}% baissiers, donnant un signal ${
              clarityScore >= 60 ? "assez lisible" : "plutôt neutre"
            } du flux.`
          : `Répartition bull/bear peu marquée sur la fenêtre actuelle.`,
    });
  }

  const baseRegime = deterministicMarketRegime(globalScore);
  const drivers = deterministicFocusDrivers(themes);
  const baseIdeas = baseTradeIdeasFromThemes(themes);

  // Confiance globale brute
  const consensusIndicator = riskIndicators.find(
    (r) => r.id === "source_consensus"
  );
  const heatIndicator = riskIndicators.find((r) => r.id === "news_heat");
  const bbIndicator = riskIndicators.find(
    (r) => r.id === "bull_bear_balance"
  );

  const confComponents: number[] = [];
  if (consensusIndicator) confComponents.push(consensusIndicator.score);
  if (heatIndicator) confComponents.push(heatIndicator.score);
  if (bbIndicator) confComponents.push(bbIndicator.score);
  confComponents.push(baseRegime.confidence);

  const globalConfidence = Math.round(mean(confComponents));

  let snapshot: SentimentSnapshot = {
    generatedAt: new Date().toISOString(),
    globalScore,
    themes,
    riskIndicators,
    focusDrivers: drivers,
    marketRegime: { ...baseRegime, confidence: baseRegime.confidence },
    tradeIdeas: baseIdeas,
    totalArticles,
    bullishArticles,
    bearishArticles,
    globalConfidence,
    sources: points.length
      ? Array.from(
          new Map(
            points.map((p) => [
              `${p.source}-${p.assetClass}`,
              {
                name: p.source,
                assetClass: p.assetClass,
                weight: 1,
              },
            ])
          ).values()
        )
      : [],
  };

  snapshot = await enrichWithAI(snapshot, points, history);

  return snapshot;
}
