// scripts/sentiment/refresh.ts
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { fetchAllSentimentPoints } from "./sources";
import { buildSentimentSnapshot } from "./analyze";
import type { SentimentHistoryPoint, SentimentSnapshot } from "./types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(process.cwd(), "public", "data", "sentiment");
const LATEST_FILE = path.join(DATA_DIR, "latest.json");
const HISTORY_FILE = path.join(DATA_DIR, "history.json");

// 1 semaine en hourly
const HISTORY_MAX_POINTS = 7 * 24;

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}
async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try { return JSON.parse(await fs.readFile(filePath, "utf8")) as T; } catch { return fallback; }
}
async function writeJson(filePath: string, data: unknown) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

(async () => {
  try {
    await ensureDir(DATA_DIR);

    // 1) Charge l'historique existant
    const history: SentimentHistoryPoint[] = await readJson(HISTORY_FILE, []);

    // 2) Récupère les points bruts (sources de marché)
    const rawPoints = await fetchAllSentimentPoints();
    if (!rawPoints?.length) {
      console.warn("[sentiment] aucune donnée collectée.");
      return;
    }

    // 3) Construit le snapshot enrichi (IA + indicateurs)
    const snapshot: SentimentSnapshot = await buildSentimentSnapshot(rawPoints, history);

    // 4) Construit le point historique (APPEND, pas d’écrasement)
    const getTheme = (id: string) => snapshot.themes.find(t => t.id === id)?.score ?? snapshot.globalScore;
    const newPoint: SentimentHistoryPoint = {
      timestamp: snapshot.generatedAt || new Date().toISOString(),
      globalScore: snapshot.globalScore,
      forexScore: getTheme("forex"),
      stocksScore: getTheme("stocks"),
      commoditiesScore: getTheme("commodities"),
      totalArticles: snapshot.totalArticles ?? 0,
    };
    const nextHistory = [...history, newPoint].slice(-HISTORY_MAX_POINTS);

    // 5) Persistance + injection pour le front
    snapshot.history = nextHistory;
    await writeJson(HISTORY_FILE, nextHistory);
    await writeJson(LATEST_FILE, snapshot);

    console.log("[sentiment] history size:", nextHistory.length);
  } catch (err) {
    console.error("[sentiment] refresh error:", err);
    process.exitCode = 1;
  }
})();
