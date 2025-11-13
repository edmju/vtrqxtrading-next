// scripts/news/filter.ts
import { RawArticle } from "./types";
import { scoreTextWithHits } from "./hotKeywords";
import { isFinanceUrl } from "./siteFilters";

export function filterAndScoreHot(
  articles: RawArticle[],
  opts: { tickers: string[]; max: number; minScore: number },
): RawArticle[] {
  const eligible = articles.filter((a) => isFinanceUrl(a.url));

  const scored = eligible.map((a) => {
    const text = `${a.title || ""} ${a.description || ""}`;
    const { score, hits } = scoreTextWithHits(text, opts.tickers);
    return { ...a, score, hits };
  });

  const baseMin = opts.minScore;
  const hardMinDaily =
    Number(process.env.NEWS_MIN_DAILY_HOT || 8); // cible mini d’articles « hot »

  const sortFn = (a: RawArticle, b: RawArticle) =>
    (b.score! - a.score!) ||
    +new Date(b.publishedAt) - +new Date(a.publishedAt);

  const pick = (minScore: number) =>
    scored
      .filter((a) => (a.score ?? 0) >= minScore)
      .sort(sortFn);

  // 1er passage: seuil normal (assez strict)
  let hot = pick(baseMin);

  // Si on a trop peu de news, on détend légèrement le seuil
  if (hot.length < Math.min(hardMinDaily, opts.max)) {
    const relaxed = Math.max(1, baseMin - 2);
    if (relaxed < baseMin) {
      hot = pick(relaxed);
    }
  }

  // Dernier recours : s'il reste encore trop peu d'articles, on prend
  // simplement les meilleurs scores (même avec un score faible)
  if (hot.length < Math.min(hardMinDaily, opts.max)) {
    hot = [...scored].sort(sortFn).slice(0, Math.min(opts.max, hardMinDaily));
  }

  return hot.slice(0, opts.max);
}
