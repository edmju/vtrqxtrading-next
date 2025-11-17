// src/app/(terminal)/dashboard/sentiment/page.tsx

import fs from "node:fs/promises";
import path from "node:path";
import SentimentClient from "./SentimentClient";

/* ----------------------------- Types partagés ---------------------------- */

export type AssetClass = "forex" | "stocks" | "commodities" | "global";

export type SentimentHistoryPoint = {
  timestamp: string;
  globalScore: number;
  forexScore?: number;
  stocksScore?: number;
  commoditiesScore?: number;
  totalArticles?: number;
};

export type SentimentTheme = {
  id: string;
  label: string;
  score: number;
  direction: "bullish" | "bearish" | "neutral";
  comment?: string;
};

export type MarketRegime = {
  label: string;
  description: string;
  confidence: number;
};

export type RiskIndicator = {
  id: string;
  label: string;
  score: number;
  value?: string;
  direction?: "up" | "down" | "neutral";
  comment?: string;
};

export type FocusDriver = {
  label: string;
  weight?: number;
  description?: string;
};

export type SentimentSource = {
  name: string;
  assetClass: AssetClass;
  weight?: number;
};

export type SentimentSuggestion = {
  id: string;
  label: string;
  assetClass: AssetClass;
  bias: "long" | "short" | "neutral";
  confidence: number;
  rationale: string;
};

export type SentimentSnapshot = {
  generatedAt: string;
  globalScore: number;
  marketRegime: MarketRegime;
  themes: SentimentTheme[];
  riskIndicators: RiskIndicator[];
  focusDrivers: FocusDriver[];
  sources: SentimentSource[];

  // métriques dérivées
  sourceConsensus?: number;
  tensionScore?: number;
  totalArticles?: number;
  bullishArticles?: number;
  bearishArticles?: number;
  globalConfidence?: number;

  // ce qu’on veut absolument pour le graph
  history?: SentimentHistoryPoint[];

  // idées de positionnement
  suggestions?: SentimentSuggestion[];
};

/* ------------------------- Lecture des fichiers ------------------------- */

async function loadSentimentSnapshot(): Promise<SentimentSnapshot | null> {
  try {
    const sentimentDir = path.join(process.cwd(), "public", "data", "sentiment");

    // 1) snapshot principal
    const latestRaw = await fs.readFile(
      path.join(sentimentDir, "latest.json"),
      "utf8"
    );
    const snapshot = JSON.parse(latestRaw) as SentimentSnapshot;

    // 2) historique complet (pour alimenter le graphique)
    try {
      const historyRaw = await fs.readFile(
        path.join(sentimentDir, "history.json"),
        "utf8"
      );
      const history = JSON.parse(historyRaw);
      if (Array.isArray(history)) {
        snapshot.history = history as SentimentHistoryPoint[];
      }
    } catch {
      // pas d'historique -> on laisse snapshot.history tel quel
    }

    return snapshot;
  } catch {
    return null;
  }
}

/* ------------------------------ Page server ------------------------------ */

export default async function SentimentPage() {
  const snapshot = await loadSentimentSnapshot();

  if (!snapshot) {
    return (
      <main className="py-8 lg:py-10 w-full">
        <div className="rounded-3xl border border-neutral-800/60 bg-neutral-950/90 backdrop-blur-xl p-6 text-sm text-neutral-400">
          Aucune donnée de sentiment disponible pour l’instant. Le prochain
          rafraîchissement remplira automatiquement cette vue.
        </div>
      </main>
    );
  }

  return <SentimentClient snapshot={snapshot} />;
}
