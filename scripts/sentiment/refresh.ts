// scripts/sentiment/refresh.ts
// Rafraîchit le snapshot de sentiment ET ajoute la nouvelle mesure
// à la fin de public/data/sentiment/history.json (APPEND, pas de remplacement).

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

    // 1) Charger l'historique existant (peut être très long, y compris ton gros fichier)
    const existingHistory: SentimentHistoryPoint[] = await readJson(
      HISTORY_FILE,
      []
    );
    console.log(
      "[sentiment] history loaded:",
      existingHistory.length,
      "points"
    );

    // 2) Récupérer les points bruts des sources de marché (Alpha Vantage, etc.)
    const rawPoints = await fetchAllSentimentPoints();
    if (!rawPoints || rawPoints.length === 0) {
      console.warn("[sentiment] aucune donnée collectée, abandon.");
      return;
    }
    console.log("[sentiment] collected points:", rawPoints.length);

    // 3) Construire le snapshot enrichi (agrégations + texte IA)
    const snapshot: SentimentSnapshot = await buildSentimentSnapshot(
      rawPoints,
      existingHistory
    );

    // 4) Construire le nouveau point historique à partir du snapshot
    const generatedAt =
      snapshot.generatedAt || new Date().toISOString();

    const getThemeScore = (id: string) =>
      snapshot.themes.find((t) => t.id === id)?.score ??
      snapshot.globalScore;

    const newHistoryPoint: SentimentHistoryPoint = {
      timestamp: generatedAt,
      globalScore: snapshot.globalScore,
      forexScore: getThemeScore("forex"),
      stocksScore: getThemeScore("stocks"),
      commoditiesScore: getThemeScore("commodities"),
      totalArticles: snapshot.totalArticles ?? 0,
    };

    // 5) APPEND : on ajoute la nouvelle valeur au tableau EXISTANT
    const updatedHistory: SentimentHistoryPoint[] = [
      ...existingHistory,
      newHistoryPoint,
    ];

    console.log(
      "[sentiment] history updated:",
      existingHistory.length,
      "->",
      updatedHistory.length
    );

    // 6) On injecte l'historique complet dans le snapshot pour le front
    snapshot.history = updatedHistory;

    // 7) On écrit les fichiers
    await writeJson(HISTORY_FILE, updatedHistory);
    await writeJson(LATEST_FILE, snapshot);

    console.log("[sentiment] history file:", HISTORY_FILE);
    console.log("[sentiment] latest file:", LATEST_FILE);
  } catch (err) {
    console.error("[sentiment] refresh error:", err);
    process.exitCode = 1;
  }
})();
