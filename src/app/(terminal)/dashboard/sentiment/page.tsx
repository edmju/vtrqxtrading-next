// src/app/(terminal)/dashboard/sentiment/page.tsx
import fs from "node:fs/promises";
import path from "node:path";
import SentimentClient from "./SentimentClient";

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

  sourceConsensus?: number;
  tensionScore?: number;
  totalArticles?: number;
  bullishArticles?: number;
  bearishArticles?: number;
  globalConfidence?: number;

  history?: SentimentHistoryPoint[];
  suggestions?: SentimentSuggestion[];
};

async function loadSnapshot(): Promise<SentimentSnapshot | null> {
  try {
    const dir = path.join(process.cwd(), "public", "data", "sentiment");
    const latest = JSON.parse(
      await fs.readFile(path.join(dir, "latest.json"), "utf8")
    ) as SentimentSnapshot;

    // IMPORTANT : injecte toute l'historique dans le snapshot
    try {
      const history = JSON.parse(
        await fs.readFile(path.join(dir, "history.json"), "utf8")
      );
      if (Array.isArray(history)) latest.history = history;
    } catch { /* pas d'historique */ }

    return latest;
  } catch {
    return null;
  }
}

export default async function SentimentPage() {
  const snapshot = await loadSnapshot();
  if (!snapshot) {
    return (
      <main className="py-8 lg:py-10 w-full">
        <div className="rounded-3xl border border-neutral-800/60 bg-neutral-950/90 backdrop-blur-xl p-6 text-sm text-neutral-400">
          Aucune donnée disponible. Le prochain run remplira automatiquement cette vue.
        </div>
      </main>
    );
  }
  return <SentimentClient snapshot={snapshot} />;
}
