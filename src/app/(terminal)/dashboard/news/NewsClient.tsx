// path: src/app/(terminal)/dashboard/news/NewsClient.tsx
// (UI néon/glassy MASSIVE, desk IA retiré – filtres, tri, radar, superhot & auto-refresh conservés)

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

type HeatLevel = "superhot" | "hot" | "medium" | "low";

function getHeatLevel(article: Article): HeatLevel {
  const score = article.score ?? 0;
  const h = hoursSince(article.publishedAt);
  const imp = impactLabel(score, article.publishedAt);

  if ((imp === "High" && h <= 12) || score >= 20) return "superhot";
  if (imp === "High" || (imp === "Medium" && h <= 48) || score >= 10) return "hot";
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

function inferMarketRegime(themes: AITheme[], actions: AIAction[], regime?: AIMarketRegime) {
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

/* -------------------------------------------------------------------------- */
/*  Page Client – tout dans un gros bloc néon                                 */
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
  const totalDrivers =
    (ai.focusDrivers?.length ?? 0) + (ai.marketRegime && ai.marketRegime.label ? 1 : 0);

  const regimeText = inferMarketRegime(ai.mainThemes, ai.actions, ai.marketRegime);
  const focusText = inferFocus(ai.mainThemes, ai.focusDrivers);

  const superHotNews = useMemo(
    () =>
      news.articles
        .filter((a) => getHeatLevel(a) === "superhot")
        .sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt))
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
        if (a.description && a.description.toLowerCase().includes(q)) return true;
        return false;
      });
    }

    items.sort((a, b) => {
      const da = +new Date(a.publishedAt);
      const db = +new Date(b.publishedAt);
      return sortOrder === "recent" ? db - da : da - db;
    });

    return items;
  }, [news.articles, heatFilter, themeFilter, searchTerm, sortOrder, articleThemes]);

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
        className="p-3 hover:bg-neutral-900/70 transition-colors duration-200 border-b border-neutral-900/70 last:border-b-0"
      >
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="space-y-1 min-w-0">
            <a
              href={a.url}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[14px] text-neutral-100 hover:text-cyan-300 hover:underline line-clamp-2"
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
                <span className="px-1.5 py-0.5 rounded bg-neutral-900/90 text-neutral-200 ring-1 ring-neutral-600/60">
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
                "text-[10px] px-1.5 py-0.5 rounded-full shadow-[0_0_10px_rgba(248,250,252,0.18)] " +
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
          <p className="mt-2 text-[12px] text-neutral-300/95 line-clamp-2">
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
        className="inline-flex flex-col justify-between w-56 max-w-xs p-3 rounded-xl bg-black/40 border border-red-600/60 hover:border-orange-400/90 hover:bg-black/80 transition-transform duration-200 hover:-translate-y-0.5 mr-3 shadow-[0_0_18px_rgba(248,113,113,0.55)]"
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
    <main className="relative py-6 lg:py-8 w-full overflow-x-hidden">
      {/* halo global */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-80"
        style={{
          background:
            "radial-gradient(900px 280px at 10% -10%, rgba(56,189,248,0.28), transparent 60%), radial-gradient(900px 280px at 90% 0%, rgba(129,140,248,0.28), transparent 60%), radial-gradient(900px 380px at 50% 110%, rgba(16,185,129,0.25), transparent 60%)",
        }}
      />

      <div className="relative w-full rounded-3xl border border-cyan-500/20 bg-gradient-to-b from-neutral-950/95 via-neutral-950/90 to-neutral-950/80 shadow-[0_0_80px_rgba(8,47,73,0.85)] overflow-hidden">
        {/* glow interne */}
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-x-20 -top-40 h-72 opacity-60 blur-3xl"
          style={{
            background:
              "radial-gradient(circle at 10% 0%, rgba(56,189,248,0.35), transparent 60%), radial-gradient(circle at 90% 0%, rgba(236,72,153,0.28), transparent 55%)",
          }}
        />

        <div className="relative p-4 sm:p-6 lg:p-7 space-y-5 lg:space-y-6">
          {/* Bandeau de synthèse */}
          <section className="grid gap-4 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1.2fr)] min-w-0">
            {/* Stats + refresh */}
            <div className="rounded-2xl p-4 bg-gradient-to-br from-sky-950/80 via-slate-950/70 to-sky-900/40 ring-1 ring-sky-500/50 shadow-[0_0_40px_rgba(8,47,73,0.9)]">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.9)] animate-pulse" />
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-200/80">
                    Flux d’actualités tradables
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => router.refresh()}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-sky-900/80 text-sky-100 hover:bg-sky-800/80 hover:shadow-[0_0_16px_rgba(56,189,248,0.75)] transition"
                >
                  Refresh
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-5 text-[13px] text-sky-100">
                <div className="space-y-0.5">
                  <div className="text-[11px] text-sky-300/80">News filtrées</div>
                  <div className="text-2xl font-semibold tracking-tight">
                    {totalNews}
                  </div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-[11px] text-sky-300/80">Thèmes IA</div>
                  <div className="text-2xl font-semibold tracking-tight">
                    {totalThemes}
                  </div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-[11px] text-sky-300/80">Drivers IA</div>
                  <div className="text-2xl font-semibold tracking-tight">
                    {totalDrivers}
                  </div>
                </div>
              </div>

              <div className="mt-3 text-[10px] text-sky-200/80 space-y-0.5">
                <div>
                  Dernière collecte :{" "}
                  {news.generatedAt
                    ? new Date(news.generatedAt).toLocaleString()
                    : "—"}
                </div>
                <div>Auto-refresh : toutes les 1h (tant que la page reste ouverte).</div>
              </div>

              <div className="mt-4 h-16 rounded-xl border border-sky-500/20 bg-gradient-to-br from-sky-950/70 via-sky-900/40 to-cyan-900/40 overflow-hidden">
                <div className="relative h-full w-full">
                  <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_0%_0%,rgba(56,189,248,0.7),transparent_55%),radial-gradient(circle_at_100%_100%,rgba(14,165,233,0.6),transparent_55%)]" />
                  <div className="absolute inset-x-2 bottom-2 flex items-end gap-[3px]">
                    {Array.from({ length: 40 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex-1 max-w-[9px] rounded-t-sm bg-gradient-to-t from-cyan-500 via-sky-300 to-white/90"
                        style={{
                          height: `${30 + Math.sin(i / 2) * 18 + (i % 6) * 3}%`,
                          opacity: 0.35 + ((i * 7) % 10) / 30,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Regime + focales */}
            <div className="space-y-3">
              <div className="rounded-2xl p-4 bg-gradient-to-br from-violet-950/80 via-violet-900/60 to-fuchsia-800/50 ring-1 ring-violet-500/50 shadow-[0_0_40px_rgba(109,40,217,0.85)]">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-200/90">
                    Régime de marché (vue IA)
                  </div>
                  {ai.marketRegime && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-900/80 text-violet-100 border border-violet-400/70">
                      Conf {ai.marketRegime.confidence}/100
                    </span>
                  )}
                </div>
                <p className="mt-2.5 text-[13px] text-violet-50 leading-snug line-clamp-4">
                  {regimeText}
                </p>
              </div>

              <div className="rounded-2xl p-4 bg-gradient-to-br from-emerald-950/80 via-emerald-900/60 to-emerald-700/50 ring-1 ring-emerald-500/60 shadow-[0_0_40px_rgba(5,150,105,0.9)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200/90">
                  Focales du moment
                </div>
                <p className="mt-2.5 text-[13px] text-emerald-50 leading-snug line-clamp-4">
                  {focusText}
                </p>
              </div>
            </div>
          </section>

          {/* Super hot marquee */}
          {superHotNews.length > 0 && (
            <section className="rounded-2xl border border-red-700/70 bg-gradient-to-r from-red-950/90 via-red-900/80 to-orange-800/80 shadow-[0_0_40px_rgba(185,28,28,0.85)] overflow-hidden">
              <div className="px-4 py-2 flex items-center justify-between border-b border-red-700/70">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-red-100">
                  Super hot du moment
                </span>
                <span className="text-[10px] text-red-100/85">
                  {superHotNews.length} news très sensibles
                </span>
              </div>

              <div className="superhot-marquee-outer py-3">
                <div className="superhot-marquee-track">
                  {superHotCards}
                  {superHotCards}
                </div>
              </div>
            </section>
          )}

          {/* Bloc principal : flux + radar dans un seul container néon */}
          <section className="rounded-2xl border border-neutral-800/80 bg-neutral-950/90 shadow-[0_0_40px_rgba(15,23,42,0.9)] min-w-0 overflow-hidden">
            <div className="relative">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-cyan-400/0 via-cyan-400/80 to-cyan-400/0 opacity-70 animate-pulse" />
            </div>

            <div className="grid gap-4 lg:gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1.2fr)] items-start min-w-0 p-3.5 lg:p-4">
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

                <div className="rounded-2xl border border-neutral-800/80 bg-neutral-950/90 min-w-0 overflow-hidden">
                  {/* Filtres */}
                  <div className="px-3 pt-2.5 pb-2 border-b border-neutral-800/80 flex flex-wrap items-center gap-3 justify-between">
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="text-neutral-400 mr-1">Température :</span>
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
                          onClick={() => setHeatFilter(opt.key as "all" | HeatLevel)}
                          className={
                            "px-2 py-0.5 rounded-full border text-[11px] transition-colors " +
                            (heatFilter === opt.key
                              ? "border-amber-400 bg-amber-500/20 text-amber-100 shadow-[0_0_12px_rgba(251,191,36,0.8)]"
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
                            {label}{" "}
                            {themeCounts[label] ? `(${themeCounts[label]})` : ""}
                          </option>
                        ))}
                      </select>

                      <input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Mot-clé…"
                        className="bg-neutral-900 border border-neutral-700 text-neutral-100 text-[11px] rounded-full px-2 py-0.5 focus:outline-none w-[140px]"
                      />
                    </div>
                  </div>

                  {/* Liste */}
                  <ul className="divide-y divide-neutral-900/80">
                    {primaryNews.map((a) => renderNewsItem(a))}
                    {showAllNews && extraNews.map((a) => renderNewsItem(a))}
                    {filteredNews.length === 0 && (
                      <li className="p-4 text-sm text-neutral-400">
                        Aucune actualité ne correspond aux filtres.
                      </li>
                    )}
                  </ul>

                  {extraNews.length > 0 && (
                    <div className="border-t border-neutral-900/80 p-2.5 flex justify-center bg-neutral-950">
                      <button
                        type="button"
                        onClick={() => setShowAllNews((v) => !v)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium bg-neutral-900/90 text-neutral-50 hover:bg-neutral-800/90 hover:shadow-[0_0_16px_rgba(148,163,184,0.55)] transition"
                      >
                        {showAllNews
                          ? "Réduire la liste"
                          : `Dérouler (${extraNews.length} news)`}
                      </button>
                    </div>
                  )}
                </div>
              </section>

              {/* Colonne 2 : radar de thèmes IA (dans le même bloc) */}
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

                <div className="rounded-2xl border border-neutral-800/80 bg-neutral-950/90 min-w-0">
                  <ul className="px-2.5 py-2 space-y-2.5">
                    {ai.mainThemes.map((t) => {
                      const w = Math.max(0.05, Math.min(1, t.weight));
                      const pct = Math.round(w * 100);
                      return (
                        <li
                          key={t.label}
                          className="rounded-xl px-2.5 py-2 bg-neutral-900/80 border border-neutral-700/80 hover:border-violet-400/70 hover:shadow-[0_0_24px_rgba(139,92,246,0.4)] transition"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-[13px] font-medium text-neutral-100 truncate">
                              {t.label}
                            </div>
                            <div className="text-[11px] text-neutral-300">
                              {pct}/100
                            </div>
                          </div>
                          <div className="mt-2 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-violet-400 via-sky-400 to-cyan-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          {t.summary && (
                            <p className="mt-1 text-[11px] text-neutral-300 line-clamp-2">
                              {t.summary}
                            </p>
                          )}
                          {themeCounts[t.label] ? (
                            <p className="mt-1 text-[10px] text-neutral-500">
                              {themeCounts[t.label]} article(s) associés
                            </p>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </section>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
