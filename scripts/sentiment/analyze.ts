// scripts/sentiment/analyze.ts

import OpenAI from "openai";
import {
  SentimentPoint,
  SentimentCategory,
  SentimentSnapshot,
  AIFocusDriver,
  AIMarketRegime,
  AssetClass,
} from "./types";

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function groupByCategory(points: SentimentPoint[]): SentimentCategory[] {
  const keys: { key: AssetClass; label: string }[] = [
    { key: "forex", label: "Forex" },
    { key: "stocks", label: "Actions" },
    { key: "commodities", label: "Commodities" },
  ];

  return keys.map(({ key, label }) => {
    const srcs = points.filter((p) => p.assetClass === key);
    const avg =
      srcs.length === 0
        ? 50
        : srcs.reduce((s, p) => s + p.score, 0) / srcs.length;

    return {
      key,
      label,
      score: Math.round(avg),
      sources: srcs,
    };
  });
}

function buildDeterministicRegime(
  snapshot: SentimentSnapshot
): { focusDrivers: AIFocusDriver[]; marketRegime: AIMarketRegime } {
  const drivers: AIFocusDriver[] = [];

  for (const cat of snapshot.categories) {
    const delta = cat.score - 50;
    const abs = Math.abs(delta);

    if (abs < 8) continue; // trop neutre

    const dir = delta > 0 ? "positif" : "négatif";
    const label =
      delta > 0
        ? `${cat.label} en risk-on`
        : `${cat.label} en risk-off`;

    const weight = clamp(abs / 30, 0.2, 1);

    drivers.push({
      label,
      weight,
      description: `${cat.label} montre un biais ${dir} (score ${cat.score} / 100) sur la moyenne des indicateurs suivis.`,
    });
  }

  let regimeLabel = "Neutre";
  let regimeDesc =
    "Régime neutre : les signaux de sentiment restent globalement équilibrés entre risk-on et risk-off.";
  let conf = 50;

  if (snapshot.globalScore >= 60) {
    regimeLabel = "Bullish / Risk-on";
    regimeDesc =
      "Régime plutôt risk-on : la majorité des indicateurs de sentiment est orientée au-dessus de la neutralité, avec appétit pour le risque.";
    conf = clamp(40 + (snapshot.globalScore - 60) * 2, 60, 95);
  } else if (snapshot.globalScore <= 40) {
    regimeLabel = "Bearish / Risk-off";
    regimeDesc =
      "Régime plutôt risk-off : les indicateurs de sentiment reflètent une aversion au risque et une demande accrue pour les actifs défensifs.";
    conf = clamp(40 + (40 - snapshot.globalScore) * 2, 60, 95);
  }

  return {
    focusDrivers: drivers.slice(0, 3),
    marketRegime: {
      label: regimeLabel,
      description: regimeDesc,
      confidence: conf,
    },
  };
}

export async function analyzeSentimentWithAI(
  points: SentimentPoint[]
): Promise<SentimentSnapshot> {
  const categories = groupByCategory(points);
  const allScores = points.map((p) => p.score);
  const globalScore =
    allScores.length === 0
      ? 50
      : allScores.reduce((s, v) => s + v, 0) / allScores.length;

  let snapshot: SentimentSnapshot = {
    generatedAt: new Date().toISOString(),
    globalScore: Math.round(globalScore),
    categories,
    sources: points,
  };

  // fallback déterministe (au cas où pas d'API OpenAI)
  const base = buildDeterministicRegime(snapshot);
  snapshot.focusDrivers = base.focusDrivers;
  snapshot.marketRegime = base.marketRegime;

  if (!process.env.OPENAI_API_KEY) {
    return snapshot;
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.SENTIMENT_MODEL || "gpt-4.1-mini";

    const payload = {
      globalScore: snapshot.globalScore,
      categories: snapshot.categories.map((c) => ({
        key: c.key,
        label: c.label,
        score: c.score,
        sources: c.sources.map((s) => ({
          id: s.id,
          label: s.label,
          provider: s.provider,
          score: s.score,
        })),
      })),
    };

    const sys =
      "Tu es un stratégiste macro buy-side. " +
      "On te donne des scores de sentiment 0..100 (50 = neutre) pour Forex, Actions, Commodities. " +
      "Tu dois détecter les focus drivers logiques et décrire le régime de marché. " +
      "Réponds STRICTEMENT en JSON avec les clés focusDrivers[] et marketRegime.";

    const user = JSON.stringify(payload);

    const completion = await client.chat.completions.create({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
    });

    const raw = JSON.parse(
      completion.choices[0]?.message?.content || "{}"
    );

    if (Array.isArray(raw.focusDrivers)) {
      snapshot.focusDrivers = raw.focusDrivers.map((d: any) => ({
        label: String(d.label || ""),
        weight: clamp(Number(d.weight ?? 0.5), 0, 1),
        description: String(d.description || ""),
      }));
    }

    if (raw.marketRegime) {
      snapshot.marketRegime = {
        label: String(raw.marketRegime.label || base.marketRegime.label),
        description:
          String(raw.marketRegime.description || base.marketRegime.description),
        confidence: clamp(
          Number(raw.marketRegime.confidence ?? base.marketRegime.confidence),
          0,
          100
        ),
      };
    }
  } catch (err) {
    console.error("[sentiment] Erreur OpenAI, utilisation du fallback :", err);
  }

  return snapshot;
}
