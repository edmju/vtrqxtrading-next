// src/app/(terminal)/dashboard/sentiment/page.tsx
import React from "react";
import path from "path";
import { promises as fs } from "fs";
import SentimentClient from "./SentimentClient";

export const dynamic = "force-dynamic";

export type SentimentThemeId = "forex" | "stocks" | "commodities";

export type SentimentTheme = {
  id: SentimentThemeId;
  label: string;
  score: number; // 0..100
  direction?: "bullish" | "bearish" | "neutral";
  comment?: string;
};

export type RiskIndicator = {
  id: string;
  label: string;
  score: number; // 0..100
  comment?: string;
  value?: string;
  direction?: "up" | "down" | "neutral";
};

export type FocusDriver = {
  label: string;
  weight: number; // intensité relative
  description?: string;
  comment?: string;
};

export type MarketRegime = {
  label: string;
  description: string;
  confidence: number; // 0..100
};

export type SentimentSource = {
  name: string;
  assetClass: SentimentThemeId | "global";
  weight: number;
};

export type SentimentHistoryPoint = {
  timestamp: string;
  globalScore: number;
  forexScore?: number;
  stocksScore?: number;
  commoditiesScore?: number;
  totalArticles?: number;
};

export type SentimentSuggestion = {
  id: string;
  label: string;
  assetClass: SentimentThemeId | "global";
  bias: "long" | "short" | "neutral";
  confidence: number; // 0..100
  rationale: string;
};

export type SentimentSnapshot = {
  generatedAt: string;
  globalScore: number; // 0..100
  marketRegime: MarketRegime;
  themes: SentimentTheme[];
  riskIndicators: RiskIndicator[];
  focusDrivers: FocusDriver[];
  sources: SentimentSource[];

  // champs optionnels injectés par le script de refresh
  history?: SentimentHistoryPoint[]; // timeline de sentiment
  globalConfidence?: number; // confiance IA globale
  sourceConsensus?: number; // consensus des sources 0–100
  tensionScore?: number; // tension du flux d’actualités 0–100
  suggestions?: SentimentSuggestion[]; // idées de trades basées sur le sentiment
};

async function readJson<T>(rel: string, fallback: T): Promise<T> {
  try {
    const full = path.join(process.cwd(), "public", rel);
    const raw = await fs.readFile(full, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function getData() {
  const sentiment = await readJson<SentimentSnapshot>(
    "data/sentiment/latest.json",
    {
      generatedAt: "",
      globalScore: 50,
      marketRegime: {
        label: "Neutre",
        description:
          "Régime neutre : pas de driver clair, sentiment équilibré entre actifs risqués et défensifs.",
        confidence: 50,
      },
      themes: [
        { id: "forex", label: "Forex", score: 50, direction: "neutral" },
        { id: "stocks", label: "Actions", score: 50, direction: "neutral" },
        {
          id: "commodities",
          label: "Commodities",
          score: 50,
          direction: "neutral",
        },
      ],
      riskIndicators: [],
      focusDrivers: [],
      sources: [],
      history: [],
      globalConfidence: 50,
      sourceConsensus: 50,
      tensionScore: 50,
      suggestions: [],
    }
  );

  return { sentiment };
}

export default async function SentimentPage() {
  const { sentiment } = await getData();
  return <SentimentClient snapshot={sentiment} />;
}
