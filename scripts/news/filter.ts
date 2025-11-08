import { RawArticle } from "./types";
import { scoreText } from "./hotKeywords";

export function filterAndScoreHot(
  articles: RawArticle[],
  opts: { tickers: string[]; max: number; minScore: number }
): RawArticle[] {
  const scored = articles.map(a => {
    const text = `${a.title || ""} ${a.description || ""}`;
    const score = scoreText(text, opts.tickers);
    return { ...a, score };
  });

  const hot = scored
    .filter(a => (a.score ?? 0) >= opts.minScore)
    .sort((a, b) => (b.score! - a.score!) || (+new Date(b.publishedAt) - +new Date(a.publishedAt)));

  return hot.slice(0, opts.max);
}
