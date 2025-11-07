import crypto from "crypto";
import { RawArticle, NewsBundle } from "./types";
import { writeJSON } from "../../src/lib/news/fs";

function stripHtml(s: string) {
  return s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

export function normalizeDedup(articles: RawArticle[], max = 400): RawArticle[] {
  const clean = articles
    .filter(a => a.url && a.title)
    .map(a => ({
      ...a,
      title: a.title.trim(),
      // IMPORTANT: ne plus enlever la query string (ça cassait les liens uniques)
      url: a.url.trim(),
      source: (a.source || "unknown").trim(),
      lang: a.lang || "en",
      description: a.description ? stripHtml(String(a.description)) : ""
    }));

  // Dédoublonnage par (host + title) — URL intacte pour l’ouverture du lien
  const seen = new Set<string>();
  const out: RawArticle[] = [];

  for (const a of clean) {
    const host = (() => {
      try { return new URL(a.url).host.replace(/^www\./, ""); } catch { return "unknown"; }
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
