// scripts/sentiment/refresh.ts

import path from "path";
import { promises as fs } from "fs";
import { fetchAllSentimentSources } from "./sources";
import { analyzeSentimentWithAI } from "./analyze";
import { SentimentSnapshot } from "./types";

const OUT_FILE =
  process.env.SENTIMENT_OUTPUT_FILE || "public/data/sentiment/latest.json";

async function ensureDirFor(file: string) {
  await fs.mkdir(path.dirname(file), { recursive: true });
}

async function main() {
  console.log("[sentiment] fetch des sources externes…");
  const points = await fetchAllSentimentSources();
  console.log(
    `[sentiment] ${points.length} signaux de sentiment collectés sur internet.`
  );

  const snapshot: SentimentSnapshot = await analyzeSentimentWithAI(points);

  const full = path.join(process.cwd(), OUT_FILE);
  await ensureDirFor(full);
  await fs.writeFile(full, JSON.stringify(snapshot, null, 2), "utf8");

  console.log(
    `[sentiment] snapshot sauvegardé dans ${OUT_FILE} (global=${snapshot.globalScore}/100).`
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error("[sentiment] Erreur fatale:", err);
    process.exit(1);
  });
}
