import crypto from "crypto";
import { RawArticle, NewsBundle } from "./types";
import { writeJSON } from "../../src/lib/news/fs";

export function normalizeDedup(articles: RawArticle[], max = 400): RawArticle[] {
  const clean = articles
    .filter(a => a.url && a.title)
    .map(a => ({
      ...a,
      title: a.title.trim(),
      url: a.url.split("?")[0],
      source: a.source?.trim() || "unknown",
      lang: a.lang || "en",
    }));

  const seen = new Set<string>();
  const out: RawArticle[] = [];
  for (const a of clean) {
    const host = (() => {
      try {
        return new URL(a.url).host.replace(/^www\./, "");
      } catch {
        return "unknown";
      }
    })();
    const h = crypto.createHash("md5").update(`${host}:${a.title.toLowerCase()}`).digest("hex");
    if (seen.has(h)) continue;
    seen.add(h);
    out.push({ ...a, id: h });
    if (out.length >= max) break;
  }
  return out.sort((x, y) => +new Date(y.publishedAt) - +new Date(x.publishedAt));
}

export function persistBundle(bundle: NewsBundle, outFile: string) {
  writeJSON(outFile, bundle);
}
