// src/app/(terminal)/dashboard/news/NewsClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Article = {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  description?: string;
  score?: number;
  hits?: string[];
};

type NewsBundle = {
  generatedAt: string;
  total: number;
  articles: Article[];
};

type AIAction = {
  symbol: string;
  direction: "BUY" | "SELL";
  conviction: number; // 0..10
  confidence: number; // 0..100
  reason: string;
  evidenceIds?: string[];

  explanation?: string;
  horizon?: string;
  themeLabel?: string;
  articleCount?: number;
};

type AITheme = {
  label: string;
  weight: number; // 0..1
  summary?: string;
  evidenceIds?: string[];
};

type AICluster = {
  label: string;
  weight: number;
  summary: string;
  articleIds: string[];
};

type AIFocusDriver = {
  label: string;
  weight: number;
  description: string;
};

type AIMarketRegime = {
  label: string;
  description: string;
  confidence: number; // 0..100
};

type AIOutput = {
  generatedAt: string;
  mainThemes: AITheme[];
  actions: AIAction[];
  clusters?: AICluster[];
  focusDrivers?: AIFocusDriver[];
  marketRegime?: AIMarketRegime;
};

type Props = {
  news: NewsBundle;
  ai: AIOutput;
};

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function hoursSince(iso: string) {
  if (!iso) return 9999;
  return (Date.now() - new Date(iso).getTime()) / 36e5;
}

function impactLabel(score?: number, publishedAt?: string) {
  const s = score ?? 0;
  const h = hoursSince(publishedAt || "");
  if (s >= 15 && h <= 24) return "High";
  if (s >= 8 && h <= 72) return "Medium";
  if (s >= 4) return "Low";
  return "Very low";
}

function impactClass(label: string) {
  switch (label) {
    case "High":
      return "bg-rose-500/20 text-rose-200 ring-1 ring-rose-500/50";
    case "Medium":
      return "bg-amber-500/20 text-amber-200 ring-1 ring-amber-500/40";
    case "Low":
      return "bg-sky-500/20 text-sky-200 ring-1 ring-sky-500/30";
    default:
      return "bg-neutral-700/40 text-neutral-300 ring-1 ring-neutral-600/50";
  }
}

function badgeDir(d: "BUY" | "SELL") {
  return d === "BUY"
    ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-600/40"
    : "bg-rose-500/20 text-rose-300 ring-1 ring-rose-600/40";
}

function badgeConf(c: number) {
  if (c >= 80)
    return "bg-green-500/20 text-green-300 ring-1 ring-green-600/40";
  if (c >= 60)
    return "bg-lime-500/20 text-lime-300 ring-1 ring-lime-600/40";
  if (c >= 40)
    return "bg-amber-500/20 text-amber-300 ring-1 ring-amber-600/40";
  return "bg-rose-500/20 text-rose-300 ring-1 ring-rose-600/40";
}

type HeatLevel = "superhot" | "hot" | "medium" | "low";

function getHeatLevel(article: Article): HeatLevel {
  const score = article.score ?? 0;
  const h = hoursSince(article.publishedAt);
  const imp = impactLabel(score, article.publishedAt);

  if ((imp === "High" && h <= 12) || score >= 20) return "superhot";
  if (imp === "High" || (imp === "Medium" && h <= 48) || score >= 10)
    return "hot";
  if (imp === "Medium" || score >= 4) return "medium";
  return "low";
}

function heatLabel(level: HeatLevel) {
  switch (level) {
    case "superhot":
      return "Super hot";
    case "hot":
      return "Hot";
    case "medium":
      return "Medium";
    case "low":
      return "Low";
  }
}

function heatPillClass(level: HeatLevel) {
  switch (level) {
    case "superhot":
      return "bg-red-600 text-white";
    case "hot":
      return "bg-orange-500 text-white";
    case "medium":
      return "bg-amber-400 text-black";
    case "low":
      return "bg-neutral-500 text-white";
  }
}

function inferMarketRegime(
  themes: AITheme[],
  actions: AIAction[],
  regime?: AIMarketRegime
) {
  if (regime && regime.label && regime.description) {
    return regime.description;
  }

  const text = (
    themes.map((t) => t.label + " " + (t.summary || "")).join(" ") +
    " " +
    actions.map((a) => a.reason).join(" ")
  ).toLowerCase();

  const hasDovish =
    text.includes("dovish") ||
    text.includes("assouplissement") ||
    text.includes("rate cut") ||
    text.includes("pivot");
  const hasHawkish =
    text.includes("hawkish") ||
    text.includes("durcissement") ||
    text.includes("rate hike") ||
    text.includes("tightening");
  const hasRiskOff =
    text.includes("tariff") ||
    text.includes("sanction") ||
    text.includes("embargo") ||
    text.includes("crisis") ||
    text.includes("shutdown") ||
    text.includes("default");
  const hasEnergyShock =
    text.includes("opec") ||
    text.includes("production cut") ||
    text.includes("refinery") ||
    text.includes("gas") ||
    text.includes("oil");

  if (hasDovish && !hasRiskOff && !hasHawkish) {
    return "Régime plutôt risk-on : narratif d’assouplissement monétaire dominant.";
  }
  if (hasHawkish && !hasRiskOff) {
    return "Régime plutôt risk-off : durcissement monétaire mis en avant.";
  }
  if (hasRiskOff || hasEnergyShock) {
    return "Régime prudent : focus sur risques politiques, tarifs ou chocs d’offre.";
  }
  return "Régime neutre : news dispersées sans driver macro évident.";
}

function inferFocus(themes: AITheme[], focusDrivers?: AIFocusDriver[]) {
  if (focusDrivers && focusDrivers.length) {
    const top = focusDrivers
      .slice(0, 3)
      .map((d) => d.label)
      .join(" · ");
    return `Focales du moment : ${top}.`;
  }
  if (!themes.length) return "Pas de cluster clair, flux de news dispersé.";
  const names = themes.slice(0, 3).map((t) => t.label);
  return `Focales du moment : ${names.join(" · ")}.`;
}

function fallbackExplanation(action: AIAction, proofsCount: number) {
  const verb = action.direction === "BUY" ? "acheter" : "vendre";
  const bias =
    action.direction === "BUY" ? "biais haussier" : "biais baissier";
  const theme = action.themeLabel || "le thème principal suivi par l’IA";
  const articles = action.articleCount ?? proofsCount;
  return `Setup synthèse : ${theme}, ${articles} article(s) alignés, ${bias} (conviction ${action.conviction}/10, confiance ${action.confidence}/100) → idée : ${verb.toUpperCase()} ${
    action.symbol
  }.`;
}

/* -------------------------------------------------------------------------- */
/*  Action Card (Desk de trades IA)                                           */
/* -------------------------------------------------------------------------- */

function ActionCard({
  action,
  proofs,
}: {
  action: AIAction;
  proofs: Article[];
}) {
  const [open, setOpen] = useState(false);
  const totalSources = proofs.length;
  const shortText =
    (action.explanation || "").split("\n")[0]?.slice(0, 260) ||
    fallbackExplanation(action, totalSources);
  const horizon = action.horizon;
  const themeLabel = action.themeLabel;
  const articleCount = action.articleCount ?? totalSources;

  return (
    <li className="p-3 rounded-2xl bg-neutral-900/90 ring-1 ring-neutral-700/70 shadow-sm shadow-black/60 hover:ring-neutral-500/80 hover:-translate-y-0.5 transition min-w-0">
      <header className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1 min-w-0">
          <div
            className={
              "inline-flex items-center justify-center text-[11px] px-2.5 py-1 rounded-full font-semibold " +
              badgeDir(action.direction)
            }
          >
            {action.direction}
          </div>
          <div className="inline-flex flex-wrap items-center gap-1 text-[11px] text-neutral-300">
            <span className="font-medium text-neutral-100">
              Conviction {action.conviction}/10
            </span>
            {horizon && (
              <>
                <span className="opacity-50">•</span>
                <span>{horizon}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-neutral-800 text-neutral-100">
            {action.symbol}
          </span>
          <span
            className={
              "text-[11px] px-2.5 py-1 rounded-full font-medium " +
              badgeConf(action.confidence)
            }
          >
            Conf {action.confidence}/100
          </span>
        </div>
      </header>

      <div className="mt-2 grid grid-cols-[auto,1fr] gap-x-2 gap-y-1 text-[11px] text-neutral-300">
        {themeLabel && (
          <>
            <span className="text-neutral-400">Thème</span>
            <span className="font-medium text-neutral-100 truncate">
              {themeLabel}
              {articleCount
                ? ` · ${articleCount} article(s)`
                : ""}
            </span>
          </>
        )}
        <span className="text-neutral-400">Lecture IA</span>
        <span className="text-neutral-100 line-clamp-3">{shortText}</span>
      </div>

      {totalSources > 0 && (
        <div className="mt-3 border-t border-neutral-800/80 pt-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-[11px] inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-neutral-800/80 text-neutral-200 hover:bg-neutral-700/80 transition"
          >
            <span>
              Basé sur {totalSources} source{totalSources > 1 ? "s" : ""}
            </span>
            <span className="text-[9px] opacity-80">
              {open ? "▲ cacher" : "▼ voir"}
            </span>
          </button>

          {open && (
            <ul className="mt-1 space-y-1 pl-1 max-h-32 overflow-y-auto pr-1">
              {proofs.map((p) => (
                <li key={p.id} className="text-[11px] text-neutral-400">
                  •{" "}
                  <a
                    className="underline hover:text-neutral-100"
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {p.source}: {p.title}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page Client – layout sans débordement horizontal                          */
/* -------------------------------------------------------------------------- */

export default function NewsClient({ news, ai }: Props) {
  const router = useRouter();

  // Refresh automatique toutes les 1h (basé sur l’heure d’ouverture)
  useEffect(() => {
    const id = setInterval(() => {
      router.refresh();
    }, 60 * 60 * 1000);
    return () => clearInterval(id);
  }, [router]);

  const index = useMemo(
    () => new Map(news.articles.map((a) => [a.id, a] as const)),
    [news.articles]
  );

  const articleThemes = useMemo(() => {
    const map = new Map<string, string[]>();
    ai.mainThemes.forEach((t) => {
      (t.evidenceIds || []).forEach((id) => {
        if (!id) return;
        if (!index.has(id)) return;
        const list = map.get(id) || [];
        if (!list.includes(t.label)) list.push(t.label);
        map.set(id, list);
      });
    });
    return map;
  }, [ai.mainThemes, index]);

  const themeOptions = useMemo(() => {
    const labels = ai.mainThemes.map((t) => t.label).filter(Boolean);
    return Array.from(new Set(labels));
  }, [ai.mainThemes]);

  const themeCounts: Record<string, number> = useMemo(() => {
    const counts: Record<string, number> = {};
    ai.mainThemes.forEach((t) => {
      const n = (t.evidenceIds || []).filter((id) => index.has(id)).length;
      counts[t.label] = n;
    });
    return counts;
  }, [ai.mainThemes, index]);

  const totalNews = news.articles.length;
  const totalThemes = ai.mainThemes.length;
  const totalActions = ai.actions.length;

  const regimeText = inferMarketRegime(
    ai.mainThemes,
    ai.actions,
    ai.marketRegime
  );
  const focusText = inferFocus(ai.mainThemes, ai.focusDrivers);

  const superHotNews = useMemo(
    () =>
      news.articles
        .filter((a) => getHeatLevel(a) === "superhot")
        .sort(
          (a, b) =>
            +new Date(b.publishedAt) - +new Date(a.publishedAt)
        )
        .slice(0, 12),
    [news.articles]
  );

  const [heatFilter, setHeatFilter] = useState<"all" | HeatLevel>("all");
  const [sortOrder, setSortOrder] = useState<"recent" | "oldest">("recent");
  const [themeFilter, setThemeFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAllNews, setShowAllNews] = useState(false);

  const filteredNews = useMemo(() => {
    let items = [...news.articles];

    if (heatFilter !== "all") {
      items = items.filter((a) => getHeatLevel(a) === heatFilter);
    }

    if (themeFilter !== "all") {
      items = items.filter((a) => {
        const t = articleThemes.get(a.id) || [];
        return t.includes(themeFilter);
      });
    }

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      items = items.filter((a) => {
        if (a.title.toLowerCase().includes(q)) return true;
        if (a.source.toLowerCase().includes(q)) return true;
        if (a.description && a.description.toLowerCase().includes(q))
          return true;
        return false;
      });
    }

    items.sort((a, b) => {
      const da = +new Date(a.publishedAt);
      const db = +new Date(b.publishedAt);
      return sortOrder === "recent" ? db - da : da - db;
    });

    return items;
  }, [
    news.articles,
    heatFilter,
    themeFilter,
    searchTerm,
    sortOrder,
    articleThemes,
  ]);

  const previewCount = 6;
  const primaryNews = filteredNews.slice(0, previewCount);
  const extraNews = filteredNews.slice(previewCount);

  const renderNewsItem = (a: Article) => {
    const impLabel = impactLabel(a.score, a.publishedAt);
    const themesForArticle = articleThemes.get(a.id) || [];
    const heat = getHeatLevel(a);

    return (
      <li
        key={a.id}
        className="p-3 hover:bg-neutral-900/70 transition-colors"
      >
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="space-y-1 min-w-0">
            <a
              href={a.url}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[14px] text-neutral-100 hover:text-sky-200 hover:underline line-clamp-2"
            >
              {a.title}
            </a>
            <div className="text-[11px] text-neutral-400 flex flex-wrap items-center gap-2">
              <span>{a.source}</span>
              <span>
                •{" "}
                {new Date(a.publishedAt).toLocaleString(undefined, {
                  hour12: false,
                })}
              </span>
              {typeof a.score === "number" && (
                <span className="px-1.5 py-0.5 rounded bg-neutral-800/80 text-neutral-200 ring-1 ring-neutral-600/60">
                  score {a.score}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            <span
              className={
                "text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap " +
                impactClass(impLabel)
              }
            >
              Impact {impLabel}
            </span>
            <span
              className={
                "text-[10px] px-1.5 py-0.5 rounded-full " +
                heatPillClass(heat)
              }
            >
              {heatLabel(heat)}
            </span>
          </div>
        </div>

        {themesForArticle.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {themesForArticle.map((label) => (
              <span
                key={label}
                className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-200 ring-1 ring-violet-600/40"
              >
                {label}
              </span>
            ))}
          </div>
        )}

        {a.hits && a.hits.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {a.hits.slice(0, 4).map((h, idxHit) => (
              <span
                key={idxHit}
                className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-200 ring-1 ring-indigo-600/40"
              >
                {h}
              </span>
            ))}
          </div>
        )}

        {a.description && (
          <p className="mt-2 text-[12px] text-neutral-300 line-clamp-2">
            {a.description}
          </p>
        )}
      </li>
    );
  };

  const superHotCards = superHotNews.map((a) => {
    return (
      <a
        key={a.id}
        href={a.url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex flex-col justify-between w-56 max-w-xs p-3 rounded-xl bg-black/30 border border-red-600/60 hover:border-orange-400/80 hover:bg-black/60 transition mr-3"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-red-100 truncate">
            {a.source}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-600 text-white">
            Super hot
          </span>
        </div>
        <div className="mt-1 text-[12px] font-semibold text-neutral-50 line-clamp-2">
          {a.title}
        </div>
        <div className="mt-1 text-[10px] text-red-100/80">
          {new Date(a.publishedAt).toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })}
        </div>
      </a>
    );
  });

  return (
    <main className="py-6 lg:py-8 w-full max-w-full overflow-x-hidden">
      <div className="w-full rounded-3xl border border-neutral-800/80 bg-gradient-to-b from-neutral-950/95 via-neutral-950/90 to-neutral-950/80 shadow-[0_0_40px_rgba(0,0,0,0.75)]">
        <div className="p-4 sm:p-6 lg:p-7 space-y-5 lg:space-y-6">
          {/* Bandeau de synthèse */}
          <section className="grid gap-3 md:gap-4 md:grid-cols-3 min-w-0">
            <div className="rounded-2xl p-3.5 bg-gradient-to-br from-sky-900/70 via-sky-800/40 to-sky-600/20 ring-1 ring-sky-500/40 shadow-md shadow-sky-900/40 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-sky-300/80">
                  Flux d’actualités tradables
                </div>
                <button
                  type="button"
                  onClick={() => router.refresh()}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-sky-900/70 text-sky-100 hover:bg-sky-800/80 transition"
                >
                  Refresh
                </button>
              </div>
              <div className="mt-2.5 flex gap-4 text-[13px] text-sky-100">
                <div>
                  <div className="text-xl font-semibold">{totalNews}</div>
                  <div className="text-[11px] text-sky-300/80">
                    news filtrées
                  </div>
                </div>
                <div>
                  <div className="text-xl font-semibold">
                    {totalThemes}
                  </div>
                  <div className="text-[11px] text-sky-300/80">
                    thèmes IA
                  </div>
                </div>
                <div>
                  <div className="text-xl font-semibold">
                    {totalActions}
                  </div>
                  <div className="text-[11px] text-sky-300/80">
                    trades IA
                  </div>
                </div>
              </div>
              <div className="mt-2 text-[10px] text-sky-200/80 space-y-0.5">
                <div>
                  Dernière collecte :{" "}
                  {news.generatedAt
                    ? new Date(news.generatedAt).toLocaleString()
                    : "—"}
                </div>
                <div>
                  Auto-refresh : toutes les 1h (tant que la page reste
                  ouverte).
                </div>
              </div>
            </div>

            <div className="rounded-2xl p-3.5 bg-gradient-to-br from-violet-900/70 via-violet-800/40 to-violet-600/20 ring-1 ring-violet-500/40 shadow-md shadow-violet-900/40 min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-violet-300/80">
                Régime de marché (vue IA)
              </div>
              <p className="mt-2 text-[13px] text-violet-50 leading-snug line-clamp-4">
                {regimeText}
              </p>
            </div>

            <div className="rounded-2xl p-3.5 bg-gradient-to-br from-emerald-900/70 via-emerald-800/40 to-emerald-600/20 ring-1 ring-emerald-500/40 shadow-md shadow-emerald-900/40 min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-300/80">
                Focales du moment
              </div>
              <p className="mt-2 text-[13px] text-emerald-50 leading-snug line-clamp-4">
                {focusText}
              </p>
            </div>
          </section>

          {/* Ruban horizontal des super hot */}
          {superHotNews.length > 0 && (
            <section className="rounded-2xl border border-red-700/60 bg-gradient-to-r from-red-900/80 via-red-800/70 to-orange-700/70 shadow-sm shadow-black/40">
              <div className="px-3 py-1.5 flex items-center justify-between border-b border-red-700/60">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-red-100">
                  Super hot du moment
                </span>
                <span className="text-[10px] text-red-100/80">
                  {superHotNews.length} news très sensibles
                </span>
              </div>
              <div className="px-3 py-2 overflow-x-auto overflow-y-hidden whitespace-nowrap no-scrollbar">
                {superHotCards}
              </div>
            </section>
          )}

          {/* Layout principal 3 colonnes (sans overflow horizontal) */}
          <section className="grid gap-4 lg:gap-5 xl:grid-cols-3 items-start min-w-0">
            {/* Colonne 1 : flux de news */}
            <section className="space-y-2 min-w-0">
              <div className="px-1 flex items-baseline justify-between">
                <div>
                  <h2 className="text-[15px] font-semibold text-neutral-100">
                    Flux d’actualités tradables
                  </h2>
                  <p className="text-[11px] text-neutral-400">
                    Impact estimé par score + fraîcheur
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-800/70 bg-neutral-950/80 shadow-sm shadow-black/50 min-w-0">
                {/* Filtres */}
                <div className="px-3 pt-2.5 pb-2 border-b border-neutral-800/80 flex flex-wrap items-center gap-3 justify-between">
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="text-neutral-400 mr-1">
                      Température :
                    </span>
                    {[
                      { key: "all", label: "Tous" as const },
                      { key: "superhot", label: "Super hot" as const },
                      { key: "hot", label: "Hot" as const },
                      { key: "medium", label: "Medium" as const },
                      { key: "low", label: "Low" as const },
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() =>
                          setHeatFilter(opt.key as "all" | HeatLevel)
                        }
                        className={
                          "px-2 py-0.5 rounded-full border text-[11px] " +
                          (heatFilter === opt.key
                            ? "border-amber-400 bg-amber-500/20 text-amber-100"
                            : "border-neutral-700 bg-neutral-900 text-neutral-300 hover:border-neutral-500")
                        }
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <select
                      value={sortOrder}
                      onChange={(e) =>
                        setSortOrder(e.target.value as "recent" | "oldest")
                      }
                      className="bg-neutral-900 border border-neutral-700 text-neutral-100 text-[11px] rounded-full px-2 py-0.5 focus:outline-none"
                    >
                      <option value="recent">Plus récentes</option>
                      <option value="oldest">Plus anciennes</option>
                    </select>

                    <select
                      value={themeFilter}
                      onChange={(e) => setThemeFilter(e.target.value)}
                      className="bg-neutral-900 border border-neutral-700 text-neutral-100 text-[11px] rounded-full px-2 py-0.5 focus:outline-none max-w-[150px]"
                    >
                      <option value="all">Tous les thèmes</option>
                      {themeOptions.map((label) => (
                        <option key={label} value={label}>
                          {label}
                        </option>
                      ))}
                    </select>

                    <input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Mot-clé…"
                      className="bg-neutral-900 border border-neutral-700 text-neutral-100 text-[11px] rounded-full px-2 py-0.5 focus:outline-none w-[130px]"
                    />
                  </div>
                </div>

                {/* Liste (scroll vertical via page, pas de scroll interne horizontal) */}
                <ul className="divide-y divide-neutral-800/80">
                  {primaryNews.map((a) => renderNewsItem(a))}

                  {showAllNews &&
                    extraNews.map((a) => renderNewsItem(a))}

                  {filteredNews.length === 0 && (
                    <li className="p-4 text-sm text-neutral-400">
                      Aucune actualité ne correspond aux filtres.
                    </li>
                  )}
                </ul>

                {extraNews.length > 0 && (
                  <div className="border-t border-neutral-800/80 p-2.5 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setShowAllNews((v) => !v)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium bg-neutral-800/90 text-neutral-50 hover:bg-neutral-700/90 transition"
                    >
                      {showAllNews
                        ? "Réduire la liste"
                        : `Dérouler (${extraNews.length} news)`}
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* Colonne 2 : radar de thèmes IA */}
            <section className="space-y-2 min-w-0">
              <div className="px-1 flex items-baseline justify-between">
                <div>
                  <h2 className="text-[15px] font-semibold text-neutral-100">
                    Radar de thèmes (IA)
                  </h2>
                  <p className="text-[11px] text-neutral-400">
                    Pondération 0–100 basée sur le flux de titres
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-800/70 bg-neutral-950/80 shadow-sm shadow-black/50 min-w-0">
                <ul className="px-2.5 py-2 space-y-2.5">
                  {ai.mainThemes.map((t) => {
                    const w = Math.max(0.05, Math.min(1, t.weight || 0));
                    const count = themeCounts[t.label] ?? 0;
                    return (
                      <li
                        key={t.label}
                        className="p-3 rounded-2xl bg-neutral-900/90 ring-1 ring-neutral-700/70 shadow-sm shadow-black/50 hover:ring-violet-500/70 transition min-w-0"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-[13px] text-neutral-100 font-semibold truncate">
                              {t.label}
                            </div>
                            <div className="text-[11px] text-neutral-400">
                              {count} article(s) liés
                            </div>
                          </div>
                          <div className="text-[11px] text-neutral-300 shrink-0">
                            poids {(w * 100).toFixed(0)}/100
                          </div>
                        </div>

                        <div className="mt-1.5 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-emerald-400 transition-all duration-500"
                            style={{ width: `${w * 100}%` }}
                          />
                        </div>

                        {t.summary && (
                          <p className="mt-1.5 text-[12px] text-neutral-300 line-clamp-3">
                            {t.summary}
                          </p>
                        )}
                      </li>
                    );
                  })}

                  {ai.mainThemes.length === 0 && (
                    <li className="text-sm text-neutral-400 px-1">
                      Aucun thème clé détecté par l’IA sur la fenêtre
                      actuelle.
                    </li>
                  )}
                </ul>
              </div>
            </section>

            {/* Colonne 3 : desk de trades IA */}
            <section className="space-y-2 min-w-0">
              <div className="px-1 flex items-baseline justify-between">
                <div>
                  <h2 className="text-[15px] font-semibold text-neutral-100">
                    Desk de trades (IA)
                  </h2>
                  <p className="text-[11px] text-neutral-400">
                    Propositions basées sur les thèmes &amp; news
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-800/70 bg-neutral-950/80 shadow-sm shadow-black/50 min-w-0">
                <ul className="px-2.5 py-2 space-y-2.5">
                  {ai.actions.map((action) => {
                    const proofs = (action.evidenceIds || [])
                      .map((id) => index.get(id))
                      .filter(Boolean) as Article[];
                    return (
                      <ActionCard
                        key={`${action.symbol}-${action.direction}-${action.confidence}-${action.conviction}`}
                        action={action}
                        proofs={proofs}
                      />
                    );
                  })}

                  {ai.actions.length === 0 && (
                    <li className="text-sm text-neutral-400 px-1">
                      Aucune action proposée aujourd’hui (pas de signal
                      suffisamment robuste). Utilise quand même le radar
                      de thèmes comme lecture rapide du narratif de
                      marché.
                    </li>
                  )}
                </ul>
              </div>
            </section>
          </section>
        </div>
      </div>
    </main>
  );
}
