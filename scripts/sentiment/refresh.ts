// scripts/sentiment/refresh.ts

import path from "path";
import { promises as fs } from "fs";
import {
  type SentimentHistoryPoint,
  type SentimentSnapshot,
} from "./types";
import { fetchAllSentimentPoints } from "./sources";
import { buildSentimentSnapshot } from "./analyze";

const OUTPUT_LATEST =
  process.env.SENTIMENT_OUTPUT_FILE || "public/data/sentiment/latest.json";
const OUTPUT_HISTORY = "public/data/sentiment/history.json";
const HISTORY_LIMIT = 72; // ~72h si run horaire

async function readHistory(): Promise<SentimentHistoryPoint[]> {
  try {
    const full = path.join(process.cwd(), OUTPUT_HISTORY);
    const raw = await fs.readFile(full, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as SentimentHistoryPoint[];
    }
    return [];
  } catch {
    return [];
  }
}

async function writeJson(outputRelPath: string, data: unknown) {
  const full = path.join(process.cwd(), outputRelPath);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, JSON.stringify(data, null, 2), "utf8");
}

async function main() {
  console.log("[sentiment] output file:", OUTPUT_LATEST);

  const points = await fetchAllSentimentPoints();
  console.log("[sentiment] collected points:", points.length);

  const history = await readHistory();

  const snapshot: SentimentSnapshot = await buildSentimentSnapshot(
    points,
    history
  );

  await writeJson(OUTPUT_LATEST, snapshot);

  const forex = snapshot.themes.find((t) => t.id === "forex");
  const stocks = snapshot.themes.find((t) => t.id === "stocks");
  const commodities = snapshot.themes.find((t) => t.id === "commodities");

  const historyPoint: SentimentHistoryPoint = {
    generatedAt: snapshot.generatedAt,
    globalScore: snapshot.globalScore,
    forexScore: forex ? forex.score : 50,
    stocksScore: stocks ? stocks.score : 50,
    commoditiesScore: commodities ? commodities.score : 50,
    totalArticles: snapshot.totalArticles,
    bullishArticles: snapshot.bullishArticles,
    bearishArticles: snapshot.bearishArticles,
  };

  const nextHistory = [...history, historyPoint].slice(-HISTORY_LIMIT);
  await writeJson(OUTPUT_HISTORY, nextHistory);

  console.log("[sentiment] history length:", nextHistory.length);
}

main().catch((err) => {
  console.error("[sentiment] refresh failed:", err);
  process.exit(1);
});
