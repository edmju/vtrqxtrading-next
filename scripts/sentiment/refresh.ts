// scripts/sentiment/refresh.ts

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchAllSentimentPoints } from "./sources";
import { buildSentimentSnapshot } from "./analyze";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function ensureDir(filePath: string) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

async function main() {
  const outFile =
    process.env.SENTIMENT_OUTPUT_FILE ||
    path.join(__dirname, "../../public/data/sentiment/latest.json");

  console.log("[sentiment] output file:", outFile);

  const points = await fetchAllSentimentPoints();
  console.log("[sentiment] points collected:", points.length);

  const snapshot = await buildSentimentSnapshot(points);

  await ensureDir(outFile);
  await fs.writeFile(outFile, JSON.stringify(snapshot, null, 2), "utf8");

  console.log("[sentiment] snapshot written");
}

main().catch((err) => {
  console.error("[sentiment] fatal error", err);
  process.exit(1);
});
