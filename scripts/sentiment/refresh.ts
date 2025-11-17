// scripts/sentiment/refresh.ts
import path from "path";
import { promises as fs } from "fs";
import { fetchAllSentimentPoints } from "./sources";
import {
  SentimentHistoryPoint,
  SentimentSnapshot,
  ThemeSentiment,
} from "./types";

const OUTPUT_FILE =
  process.env.SENTIMENT_OUTPUT_FILE || "public/data/sentiment/latest.json";

const HISTORY_FILE =
  process.env.SENTIMENT_HISTORY_FILE || "public/data/sentiment/history.json";

const HISTORY_MAX_POINTS = 96; // ~4 jours si job horaire

async function readHistory(): Promise<SentimentHistoryPoint[]> {
  const fullPath = path.join(process.cwd(), HISTORY_FILE);
  try {
    const content = await fs.readFile(fullPath, "utf8");
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) return [];
    return parsed as SentimentHistoryPoint[];
  } catch {
    return [];
  }
}

async function writeJson(fullPath: string, data: unknown) {
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, JSON.stringify(data, null, 2), "utf8");
}

async function main() {
  console.log("[sentiment] output file:", OUTPUT_FILE);

  const history = await readHistory();
  const points = await fetchAllSentimentPoints();

  if (!points.length) {
    console.warn(
      "[sentiment] no points collected, keeping previous snapshot if any"
    );
  } else {
    console.log("[sentiment] points collected:", points.length);
  }

  const { buildSentimentSnapshot } = await import("./analyze");
  const snapshot = (await buildSentimentSnapshot(
    points,
    history
  )) as SentimentSnapshot;

  const timestamp = snapshot.generatedAt || new Date().toISOString();

  const themeById = new Map<string, ThemeSentiment>();
  snapshot.themes.forEach((t) => themeById.set(t.id, t));

  const newEntry: SentimentHistoryPoint = {
    timestamp,
    globalScore: snapshot.globalScore,
    forexScore: themeById.get("forex")?.score,
    stocksScore: themeById.get("stocks")?.score,
    commoditiesScore: themeById.get("commodities")?.score,
    totalArticles: snapshot.totalArticles,
  };

  const nextHistory = [...history, newEntry].slice(-HISTORY_MAX_POINTS);
  snapshot.history = nextHistory;

  const latestFullPath = path.join(process.cwd(), OUTPUT_FILE);
  const historyFullPath = path.join(process.cwd(), HISTORY_FILE);

  await writeJson(latestFullPath, snapshot);
  await writeJson(historyFullPath, nextHistory);

  console.log("[sentiment] snapshot written");
}

main().catch((err) => {
  console.error("[sentiment] refresh failed", err);
  process.exit(1);
});
