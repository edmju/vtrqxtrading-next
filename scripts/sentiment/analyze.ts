// scripts/sentiment/analyze.ts

import OpenAI from "openai";
import {
  SentimentPoint,
  SentimentSnapshot,
  SentimentTheme,
  RiskIndicator,
  AIFocusDriver,
  AIMarketRegime
} from "./types";

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function buildThemes(points: SentimentPoint[]): SentimentTheme[] {
  const defs: { id: SentimentTheme["id"]; label: string }[] = [
    { id: "forex", label: "Forex" },
    { id: "stocks", label: "Actions" },
    { id: "commodities", label: "Commodities" }
  ];

  return defs.map(({ id, label }) => {
    const ps = points.filter((p) => p.assetClass === id);
    const avg =
      ps.length === 0
        ? 50
        : ps.reduce((s, p) => s + p.score, 0) / ps.length;

    let direction: SentimentTheme["direction"] = "neutral";
    if (avg >= 55) direction = "risk-on";
    else if (avg <= 45) direction = "risk-off";

    const comment =
      avg >= 55
        ? `${label} penche vers le risk-on (${Math.round(avg)}/100).`
        : avg <= 45
        ? `${label} penche vers le risk-off (${Math.round(avg)}/100).`
        : `${label} reste globalement neutre (${Math.round(avg)}/100).`;

    return {
      id,
      label,
      score: Math.round(avg),
      direction,
      comment
    };
  });
}

function buildRiskIndicators(points: SentimentPoint[]): RiskIndicator[] {
  const out: RiskIndicator[] = [];

  const cnn = points.find((p) => p.id === "stocks_cnn_fng");
  if (cnn) {
    out.push({
      id: "risk_cnn_fng",
      label: "CNN Fear & Greed (actions US)",
      value: `${cnn.score}/100`,
      score: cnn.score,
      direction:
        cnn.score > 55 ? "up" : cnn.score < 45 ? "down" : "neutral",
      comment:
        "Indice agrégé basé sur plusieurs indicateurs de marché (volatilité, breadth, options…)."
    });
  }

  const oil = points.find((p) => p.id === "commod_oilprice");
  if (oil) {
    out.push({
      id: "risk_oil",
      label: "Sentiment pétrole",
      value: `${oil.score}/100`,
      score: oil.score,
      direction:
        oil.score > 55 ? "up" : oil.score < 45 ? "down" : "neutral",
      comment:
        "Lecture synthétique du biais sur le complexe énergie (pétrole)."
    });
  }

  return out;
}

function deterministicRegime(
  globalScore: number,
  themes: SentimentTheme[]
): { focusDrivers: AIFocusDriver[]; marketRegime: AIMarketRegime } {
  const drivers: AIFocusDriver[] = [];

  for (const t of themes) {
    const delta = t.score - 50;
    const abs = Math.abs(delta);
    if (abs < 8) continue;

    const dir = delta > 0 ? "risk-on" : "risk-off";
    const label =
      dir === "risk-on"
        ? `${t.label} en risk-on`
        : `${t.label} en risk-off`;

    drivers.push({
      label,
      weight: clamp(abs / 30, 0.2, 1),
      description: t.comment || ""
    });
  }

  let label = "Neutre";
  let desc =
    "Régime neutre : les signaux de sentiment restent globalement équilibrés entre risk-on et risk-off.";
  let conf = 50;

  if (globalScore >= 60) {
    label = "Bullish / Risk-on";
    desc =
      "Régime plutôt risk-on : la majorité des signaux agrégés pointent vers un appétit pour le risque.";
    conf = clamp(40 + (globalScore - 60) * 2, 60, 95);
  } else if (globalScore <= 40) {
    label = "Bearish / Risk-off";
    desc =
      "Régime plutôt risk-off : les signaux agrégés reflètent une aversion au risque accrue.";
    conf = clamp(40 + (40 - globalScore) * 2, 60, 95);
  }

  return {
    focusDrivers: drivers.slice(0, 3),
    marketRegime: {
      label,
      description: desc,
      confidence: conf
    }
  };
}

export async function analyzeSentimentWithAI(
  points: SentimentPoint[]
): Promise<SentimentSnapshot> {
  const themes = buildThemes(points);
  const riskIndicators = buildRiskIndicators(points);

  const allScores = points.length
    ? points.map((p) => p.score)
    : [50];

  const globalScore =
    allScores.reduce((s, v) => s + v, 0) / allScores.length;

  const base = deterministicRegime(globalScore, themes);

  let snapshot: SentimentSnapshot = {
    generatedAt: new Date().toISOString(),
    globalScore: Math.round(globalScore),
    themes,
    riskIndicators,
    focusDrivers: base.focusDrivers,
    marketRegime: base.marketRegime,
    sources: Array.from(new Set(points.map((p) => p.label))).sort()
  };

  if (!process.env.OPENAI_API_KEY) {
    return snapshot;
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.SENTIMENT_MODEL || "gpt-4.1-mini";

    const payload = {
      globalScore: snapshot.globalScore,
      themes: snapshot.themes,
      riskIndicators: snapshot.riskIndicators
    };

    const sys =
      "Tu es un stratégiste macro buy-side. " +
      "On te donne un score global de sentiment (0..100, 50 neutre) et trois thèmes (forex, actions, commodities). " +
      "Tu dois proposer des focus drivers clairs et un régime de marché. " +
      "Réponds STRICTEMENT en JSON: { \"focusDrivers\": [...], \"marketRegime\": { ... } }";

    const user = JSON.stringify(payload);

    const r = await client.chat.completions.create({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user }
      ]
    });

    const raw = JSON.parse(r.choices[0]?.message?.content || "{}");

    if (Array.isArray(raw.focusDrivers)) {
      snapshot.focusDrivers = raw.focusDrivers.map((d: any) => ({
        label: String(d.label || ""),
        weight: clamp(Number(d.weight ?? 0.5), 0, 1),
        description: String(d.description || "")
      }));
    }

    if (raw.marketRegime) {
      snapshot.marketRegime = {
        label: String(raw.marketRegime.label || base.marketRegime.label),
        description:
          String(raw.marketRegime.description || base.marketRegime.description),
        confidence: clamp(
          Number(
            raw.marketRegime.confidence ?? base.marketRegime.confidence
          ),
          0,
          100
        )
      };
    }
  } catch (err) {
    console.error("[sentiment] Erreur OpenAI, fallback déterministe utilisé :", err);
  }

  return snapshot;
}
