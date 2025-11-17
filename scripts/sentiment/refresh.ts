// scripts/sentiment/refresh.ts

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { collectSentimentPoints } from "./sources";
import { buildSentimentSnapshot } from "./analyze";
import type { SentimentHistoryPoint, SentimentSnapshot } from "./types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// dossiers de sortie
const DATA_DIR = path.join(process.cwd(), "public", "data", "sentiment");
const LATEST_FILE = path.join(DATA_DIR, "latest.json");
const HISTORY_FILE = path.join(DATA_DIR, "history.json");

// nombre max de points historiques conservés
const HISTORY_MAX_POINTS = 7 * 24; // 1 semaine en hourly

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* Main                                                                       */
/* -------------------------------------------------------------------------- */

(async () => {
  try {
    console.log("[sentiment] output dir:", DATA_DIR);
    await ensureDir(DATA_DIR);

    // 1) Charger l’historique existant (pour tension flux + graphique)
    const history: SentimentHistoryPoint[] = await readJson(HISTORY_FILE, []);

    // 2) Récupérer tous les points bruts (Alpha Vantage etc.)
    const rawPoints = await collectSentimentPoints();
    if (!rawPoints || rawPoints.length === 0) {
      console.warn("[sentiment] aucune donnée collectée, abandon.");
      return;
    }

    console.log("[sentiment] collected points:", rawPoints.length);

    // 3) Construire le snapshot enrichi (IA + indicateurs)
    const snapshot: SentimentSnapshot = await buildSentimentSnapshot(rawPoints, history);

    // 4) Construire le nouveau point d’historique pour les graphes
    const generatedAt =
      snapshot.generatedAt || new Date().toISOString();

    const getThemeScore = (id: string) =>
      snapshot.themes.find((t) => t.id === id)?.score ?? snapshot.globalScore;

    const newHistoryPoint: SentimentHistoryPoint = {
      timestamp: generatedAt,
      globalScore: snapshot.globalScore,
      forexScore: getThemeScore("forex"),
      stocksScore: getThemeScore("stocks"),
      commoditiesScore: getThemeScore("commodities"),
      totalArticles: snapshot.totalArticles ?? 0,
    };

    const nextHistory = [...history, newHistoryPoint].slice(-HISTORY_MAX_POINTS);

    // 5) Attacher l’historique dans le snapshot (pour la page Sentiment)
    snapshot.history = nextHistory;

    // 6) Écrire latest.json + history.json
    await writeJson(HISTORY_FILE, nextHistory);
    await writeJson(LATEST_FILE, snapshot);

    console.log("[sentiment] history points:", nextHistory.length);
    console.log("[sentiment] snapshot written to:", LATEST_FILE);
  } catch (err) {
    console.error("[sentiment] refresh error:", err);
    process.exitCode = 1;
  }
})();
