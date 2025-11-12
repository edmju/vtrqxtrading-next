import { RawArticle } from "./types";
import { scoreTextWithHits } from "./hotKeywords";
import { isFinanceUrl } from "./siteFilters";

export function filterAndScoreHot(
  articles: RawArticle[],
  opts: { tickers: string[]; max: number; minScore: number }
): RawArticle[] {
  const eligible = articles.filter(a => isFinanceUrl(a.url));

  const scored = eligible.map(a => {
    const text = `${a.title || ""} ${a.description || ""}`;
    const { score, hits } = scoreTextWithHits(text, opts.tickers);
    return { ...a, score, hits };
  });

  const hot = scored
    .filter(a => (a.score ?? 0) >= opts.minScore)
    .sort((a, b) => (b.score! - a.score!) || (+new Date(b.publishedAt) - +new Date(a.publishedAt)));

  return hot.slice(0, opts.max);
}
