// scripts/sentiment/analyze.ts

import OpenAI from "openai";
import {
  type AssetClass,
  type SentimentPoint,
  type SentimentSnapshot,
  type ThemeSentiment,
  type FocusDriver,
  type MarketRegime,
} from "./types";

function mean(nums: number[]): number {
  if (!nums.length) return 50;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
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
    if (delta < 5) continue; // trop proche de neutre
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

/**
 * Enrichit la vue avec OpenAI si la clé est dispo.
 * Si l'appel échoue, on garde les valeurs déterministes.
 */
async function enrichWithAI(
  snapshot: SentimentSnapshot,
  points: SentimentPoint[]
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
      rawPoints: points.slice(0, 80).map((p) => ({
        source: p.source,
        assetClass: p.assetClass,
        score: p.score,
      })),
    };

    const sys = `
Tu es un stratégiste macro multi-actifs.
On te donne des scores de sentiment agrégés (0–100) par grande classe d'actifs (forex, actions, commodities) et un score global.

Ta mission:
1) Reformuler un régime de marché synthétique (1 phrase).
2) Identifier 1 à 3 "focus drivers" logiques (par ex. "appétit pour le risque sur actions", "aversion au risque sur commodities", etc.)
3) Donner une confiance globale 0–100.

Réponds en JSON strict:
{
  "marketRegime": { "label": string, "description": string, "confidence": number },
  "focusDrivers": [
    { "label": string, "description": string, "weight": number }
  ]
}
`;

    const res = await client.chat.completions.create({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: sys },
        { role: "user", content: JSON.stringify(payload) },
      ],
    });

    const raw = JSON.parse(res.choices[0]?.message?.content || "{}");

    const next: SentimentSnapshot = { ...snapshot };

    if (raw.marketRegime) {
      const mr = raw.marketRegime;
      next.marketRegime = {
        label: String(mr.label || snapshot.marketRegime.label),
        description:
          String(mr.description || snapshot.marketRegime.description),
        confidence:
          typeof mr.confidence === "number"
            ? Math.max(0, Math.min(100, Math.round(mr.confidence)))
            : snapshot.marketRegime.confidence,
      };
    }

    if (Array.isArray(raw.focusDrivers) && raw.focusDrivers.length) {
      next.focusDrivers = raw.focusDrivers
        .slice(0, 3)
        .map((d: any) => ({
          label: String(d.label || "Driver"),
          description: String(d.description || "").slice(0, 280),
          weight:
            typeof d.weight === "number"
              ? Math.max(0, Math.min(1, d.weight))
              : 0.5,
        }));
    }

    return next;
  } catch (err) {
    console.warn("[sentiment] OpenAI enrichment failed", err);
    return snapshot;
  }
}

/**
 * Point d'entrée principal: transforme des points bruts en snapshot
 * consommable par la page Sentiment.
 */
export async function buildSentimentSnapshot(
  points: SentimentPoint[]
): Promise<SentimentSnapshot> {
  const perClass: Record<AssetClass, number[]> = {
    forex: [],
    stocks: [],
    commodities: [],
  };

  for (const p of points) {
    if (p.score >= 0 && p.score <= 100) {
      perClass[p.assetClass]?.push(p.score);
    }
  }

  const themes: ThemeSentiment[] = (["forex", "stocks", "commodities"] as AssetClass[]).map(
    (id) => {
      const scores = perClass[id];
      const score = mean(scores);
      return {
        id,
        label: labelForAssetClass(id),
        score: Math.round(score),
        direction: directionFromScore(score),
        comment: commentForTheme(id, score),
      };
    }
  );

  const allScores = points.map((p) => p.score);
  const globalScore = Math.round(mean(allScores));

  let snapshot: SentimentSnapshot = {
    generatedAt: new Date().toISOString(),
    globalScore,
    themes,
    riskIndicators: [],
    focusDrivers: deterministicFocusDrivers(themes),
    marketRegime: deterministicMarketRegime(globalScore),
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

  // Enrichissement IA si possible
  snapshot = await enrichWithAI(snapshot, points);

  return snapshot;
}
