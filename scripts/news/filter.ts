import { RawArticle } from "./types";
import { isHot } from "./hotKeywords";

export function filterHot(articles: RawArticle[], max = 60): RawArticle[] {
  // 1) ne garder que les items "hot"
  const hot = articles.filter(a => isHot(a.title || "", a.description || ""));

  // 2) limiter la liste (paramétrable via env)
  const limit = Number(process.env.NEWS_MAX_HOT || max);
  return hot.slice(0, limit);
}
