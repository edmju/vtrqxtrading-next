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
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(filePath: string, data: unknown) {
  const json = JSON.stringify(data, null, 2);
  await fs.writeFile(filePath, json + "\n", "utf8");
}

(async () => {
  try {
    console.log("[sentiment] output dir:", DATA_DIR);
    await ensureDir(DATA_DIR);

    // 1) lire l'historique existant
    const history: SentimentHistoryPoint[] = await readJson(HISTORY_FILE, []);
    console.log("[sentiment] history loaded:", history.length, "points");

    // 2) récupérer les points bruts (Alpha Vantage, etc.)
    const rawPoints = await fetchAllSentimentPoints();
    if (!rawPoints || rawPoints.length === 0) {
      console.warn("[sentiment] aucune donnée collectée, abandon.");
      return;
    }
    console.log("[sentiment] collected points:", rawPoints.length);

    // 3) construire le snapshot enrichi
    const snapshot: SentimentSnapshot = await buildSentimentSnapshot(
      rawPoints,
      history
    );

    // 4) construire le nouveau point historique
    const generatedAt = snapshot.generatedAt || new Date().toISOString();

    const getThemeScore = (id: string) =>
      snapshot.themes.find((t) => t.id === id)?.score ?? snapshot.globalScore;

    const newPoint: SentimentHistoryPoint = {
      timestamp: generatedAt,
      globalScore: snapshot.globalScore,
      forexScore: getThemeScore("forex"),
      stocksScore: getThemeScore("stocks"),
      commoditiesScore: getThemeScore("commodities"),
      totalArticles: snapshot.totalArticles ?? 0,
    };

    // 5) APPEND : on ajoute au tableau existant, puis on coupe les plus anciens
    const nextHistory = [...history, newPoint].slice(-HISTORY_MAX_POINTS);
    console.log(
      "[sentiment] history updated:",
      history.length,
      "->",
      nextHistory.length
    );

    // 6) on met tout l'historique dans le snapshot pour la page
    snapshot.history = nextHistory;

    // 7) écrire history.json + latest.json
    await writeJson(HISTORY_FILE, nextHistory);
    await writeJson(LATEST_FILE, snapshot);

    console.log("[sentiment] history file:", HISTORY_FILE);
    console.log("[sentiment] latest file:", LATEST_FILE);
  } catch (err) {
    console.error("[sentiment] refresh error:", err);
    process.exitCode = 1;
  }
})();
