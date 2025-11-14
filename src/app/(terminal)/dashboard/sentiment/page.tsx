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
  score: number; // 0..100  ( >50 = plutôt risk-on, <50 = plutôt risk-off )
  direction?: "risk-on" | "risk-off" | "neutral";
  comment?: string;
};

export type RiskIndicator = {
  id: string;
  label: string;
  value: string;
  score: number; // 0..100 (0 = très risk-off, 100 = très risk-on)
  direction: "up" | "down" | "neutral";
  comment?: string;
};

export type FocusDriver = {
  label: string;
  weight: number; // 0..1
  comment?: string;
};

export type MarketRegime = {
  label: string;
  description: string;
  confidence: number; // 0..100
};

export type SentimentSnapshot = {
  generatedAt: string;
  globalScore: number; // 0..100
  marketRegime: MarketRegime;
  themes: SentimentTheme[];
  riskIndicators: RiskIndicator[];
  focusDrivers: FocusDriver[];
  sources: string[]; // noms des fournisseurs utilisés pour la moyenne
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
        description: "Régime neutre : pas de driver clair, sentiment équilibré.",
        confidence: 50,
      },
      themes: [
        {
          id: "forex",
          label: "Forex",
          score: 50,
          direction: "neutral",
        },
        {
          id: "stocks",
          label: "Actions",
          score: 50,
          direction: "neutral",
        },
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
    }
  );

  return { sentiment };
}

export default async function SentimentPage() {
  const { sentiment } = await getData();
  return <SentimentClient snapshot={sentiment} />;
}
