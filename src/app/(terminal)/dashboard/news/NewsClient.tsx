// src/app/(terminal)/dashboard/news/NewsClient.tsx
"use client";

import { useMemo, useState } from "react";

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

  // Champs supplémentaires éventuels renvoyés par ton backend
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

type AIOutput = {
  generatedAt: string;
  mainThemes: AITheme[];
  actions: AIAction[];
  clusters?: AICluster[];
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
  if (c >= 80) return "bg-green-500/20 text-green-300 ring-1 ring-green-600/40";
  if (c >= 60) return "bg-lime-500/20 text-lime-300 ring-1 ring-lime-600/40";
  if (c >= 40)
    return "bg-amber-500/20 text-amber-300 ring-1 ring-amber-600/40";
  return "bg-rose-500/20 text-rose-300 ring-1 ring-rose-600/40";
}

function inferMarketRegime(themes: AITheme[], actions: AIAction[]) {
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
    return "Tendance plutôt risk-on : narratif d’assouplissement monétaire dominant.";
  }
  if (hasHawkish && !hasRiskOff) {
    return "Tendance plutôt risk-off : durcissement monétaire mis en avant.";
  }
  if (hasRiskOff || hasEnergyShock) {
    return "Tendance prudente : focus sur risques politiques, tarifs ou chocs d’offre.";
  }
  return "Régime neutre : news dispersées sans driver macro évident.";
}

function inferFocus(themes: AITheme[]) {
  if (!themes.length) return "Pas de cluster clair, flux de news dispersé.";
  const names = themes.slice(0, 3).map((t) => t.label);
  return `Focales du moment : ${names.join(" · ")}.`;
}

/* -------------------------------------------------------------------------- */
/*  Action Card (Desk de trades IA)                                           */
/* -------------------------------------------------------------------------- */

function ActionCard({ action, proofs }: { action: AIAction; proofs: Article[] }) {
  const [open, setOpen] = useState(false);
  const totalSources = proofs.length;
  const explanation = action.explanation || action.reason;
  const horizon = action.horizon;
  const themeLabel = action.themeLabel;
  const articleCount = action.articleCount ?? totalSources;

  return (
    <li className="p-4 rounded-2xl bg-neutral-900/80 ring-1 ring-neutral-700/60 shadow-sm shadow-black/40 hover:ring-neutral-500/80 hover:-translate-y-0.5 transition">
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <div
            className={
              "inline-flex items-center justify-center text-xs px-2 py-1 rounded-full font-semibold " +
              badgeDir(action.direction)
            }
          >
            {action.direction}
          </div>
          <div className="inline-flex items-center gap-1 text-xs text-neutral-300">
            <span className="font-medium text-neutral-100">
              Conviction {action.conviction}/10
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span className="text-xs px-2 py-1 rounded-full bg-neutral-800 text-neutral-100">
            {action.symbol}
          </span>
          <span
            className={
              "text-xs px-2 py-1 rounded-full font-medium " +
              badgeConf(action.confidence)
            }
          >
            Confiance {action.confidence}/100
          </span>
        </div>
      </header>

      <div className="mt-3 space-y-1 text-xs text-neutral-300">
        {themeLabel && (
          <p>
            Signal basé sur le thème{" "}
            <span className="font-semibold text-neutral-100">
              « {themeLabel} »
            </span>
            {articleCount ? ` (${articleCount} article(s)).` : "."}
          </p>
        )}
        {horizon && (
          <p className="text-neutral-400">
            Horizon indicatif : <span className="font-medium">{horizon}</span>
          </p>
        )}
      </div>

      {explanation && (
        <p className="mt-3 text-sm leading-relaxed text-neutral-200">
          <span className="font-semibold text-neutral-50">Analyse IA : </span>
          {explanation}
        </p>
      )}

      {totalSources > 0 && (
        <div className="mt-4 border-t border-neutral-800/80 pt-3">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded-full bg-neutral-800/80 text-neutral-200 hover:bg-neutral-700/80 transition"
          >
            <span>
              Basé sur {totalSources} source{totalSources > 1 ? "s" : ""}
            </span>
            <span className="text-[10px] opacity-80">
              {open ? "▲ cacher les sources" : "▼ voir la liste des sources"}
            </span>
          </button>

          {open && (
            <ul className="mt-2 space-y-1 pl-1">
              {proofs.map((p) => (
                <li key={p.id} className="text-xs text-neutral-400">
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
/*  Page Client                                                               */
/* -------------------------------------------------------------------------- */

export default function NewsClient({ news, ai }: Props) {
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

  const regimeText = inferMarketRegime(ai.mainThemes, ai.actions);
  const focusText = inferFocus(ai.mainThemes);

  const sortedNews = useMemo(
    () =>
      [...news.articles].sort(
        (a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt)
      ),
    [news.articles]
  );

  // Pas de scrollbar interne : on affiche par blocs, la page scrolle elle-même
  const [visibleCount, setVisibleCount] = useState(15);
  const visibleNews = sortedNews.slice(0, visibleCount);
  const hasMoreNews = visibleCount < sortedNews.length;

  return (
    <main className="p-6 lg:p-8 space-y-6 lg:space-y-8">
      {/* Bandeau de synthèse */}
      <section className="grid gap-4 lg:gap-6 lg:grid-cols-3">
        <div className="rounded-2xl p-4 bg-gradient-to-br from-sky-900/70 via-sky-800/40 to-sky-600/20 ring-1 ring-sky-500/40 shadow-md shadow-sky-900/40">
          <div className="text-xs font-semibold uppercase tracking-wide text-sky-300/80">
            Flux d’actualités tradables
          </div>
          <div className="mt-3 flex gap-6 text-sm text-sky-100">
            <div>
              <div className="text-2xl font-semibold">{totalNews}</div>
              <div className="text-xs text-sky-300/80">
                news “hot” dans la fenêtre
              </div>
            </div>
            <div>
              <div className="text-2xl font-semibold">{totalThemes}</div>
              <div className="text-xs text-sky-300/80">thèmes IA</div>
            </div>
            <div>
              <div className="text-2xl font-semibold">{totalActions}</div>
              <div className="text-xs text-sky-300/80">idées de trades</div>
            </div>
          </div>
          <div className="mt-3 text-xs text-sky-200/80">
            Dernière collecte :{" "}
            {news.generatedAt
              ? new Date(news.generatedAt).toLocaleString()
              : "—"}
          </div>
        </div>

        <div className="rounded-2xl p-4 bg-gradient-to-br from-violet-900/70 via-violet-800/40 to-violet-600/20 ring-1 ring-violet-500/40 shadow-md shadow-violet-900/40">
          <div className="text-xs font-semibold uppercase tracking-wide text-violet-300/80">
            Régime de marché (vue IA)
          </div>
          <p className="mt-3 text-sm text-violet-50 leading-relaxed">
            {regimeText}
          </p>
        </div>

        <div className="rounded-2xl p-4 bg-gradient-to-br from-emerald-900/70 via-emerald-800/40 to-emerald-600/20 ring-1 ring-emerald-500/40 shadow-md shadow-emerald-900/40">
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-300/80">
            Focales du moment
          </div>
          <p className="mt-3 text-sm text-emerald-50 leading-relaxed">
            {focusText}
          </p>
        </div>
      </section>

      {/* Layout principal 3 colonnes */}
      <section className="grid gap-6 lg:gap-8 lg:grid-cols-[2.3fr,2fr,2fr]">
        {/* Colonne 1 : flux de news (sans scrollbar interne) */}
        <section className="space-y-3">
          <div className="px-1 flex items-baseline justify-between">
            <div>
              <h2 className="text-lg font-semibold text-neutral-100">
                Flux d’actualités tradables
              </h2>
              <p className="text-xs text-neutral-400">
                Impact estimé par score + fraîcheur
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-800/70 bg-neutral-950/60 shadow-sm shadow-black/40">
            <ul className="divide-y divide-neutral-800/80">
              {visibleNews.map((a) => {
                const impLabel = impactLabel(a.score, a.publishedAt);
                const themesForArticle = articleThemes.get(a.id) || [];
                return (
                  <li
                    key={a.id}
                    className="p-4 hover:bg-neutral-900/70 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <a
                          href={a.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-neutral-100 hover:text-sky-200 hover:underline"
                        >
                          {a.title}
                        </a>
                        <div className="text-xs text-neutral-400 flex flex-wrap items-center gap-2">
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

                      <span
                        className={
                          "text-xs px-2 py-1 rounded-full whitespace-nowrap " +
                          impactClass(impLabel)
                        }
                      >
                        Impact {impLabel}
                      </span>
                    </div>

                    {themesForArticle.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {themesForArticle.map((label) => (
                          <span
                            key={label}
                            className="text-[11px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-200 ring-1 ring-violet-600/40"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    )}

                    {a.hits && a.hits.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {a.hits.slice(0, 5).map((h, idxHit) => (
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
                      <p className="mt-2 text-sm text-neutral-300 line-clamp-3">
                        {a.description}
                      </p>
                    )}
                  </li>
                );
              })}

              {sortedNews.length === 0 && (
                <li className="p-4 text-sm text-neutral-400">
                  Aucune actualité “hot” dans la fenêtre de temps actuelle.
                </li>
              )}
            </ul>

            {hasMoreNews && (
              <div className="border-t border-neutral-800/80 p-3 flex justify-center">
                <button
                  type="button"
                  onClick={() =>
                    setVisibleCount((prev) =>
                      Math.min(prev + 15, sortedNews.length)
                    )
                  }
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-neutral-800/90 text-neutral-50 hover:bg-neutral-700/90 transition"
                >
                  Afficher plus de news (
                  {sortedNews.length - visibleCount}
                  )
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Colonne 2 : radar de thèmes IA */}
        <section className="space-y-3">
          <div className="px-1 flex items-baseline justify-between">
            <div>
              <h2 className="text-lg font-semibold text-neutral-100">
                Radar de thèmes (IA)
              </h2>
              <p className="text-xs text-neutral-400">
                Pondération 0–100 basée sur le flux de titres
              </p>
            </div>
          </div>

          <ul className="space-y-3">
            {ai.mainThemes.map((t) => {
              const w = Math.max(0.05, Math.min(1, t.weight || 0));
              const count = themeCounts[t.label] ?? 0;
              return (
                <li
                  key={t.label}
                  className="p-4 rounded-2xl bg-neutral-900/80 ring-1 ring-neutral-700/70 shadow-sm shadow-black/40 hover:ring-violet-500/70 transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-neutral-100 font-semibold">
                        {t.label}
                      </div>
                      <div className="text-xs text-neutral-400">
                        {count} article(s) liés
                      </div>
                    </div>
                    <div className="text-xs text-neutral-300">
                      poids {(w * 100).toFixed(0)}/100
                    </div>
                  </div>

                  <div className="mt-2 h-2 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-emerald-400 transition-all duration-500"
                      style={{ width: `${w * 100}%` }}
                    />
                  </div>

                  {t.summary && (
                    <p className="mt-2 text-sm text-neutral-300">
                      {t.summary}
                    </p>
                  )}
                </li>
              );
            })}

            {ai.mainThemes.length === 0 && (
              <li className="text-sm text-neutral-400 px-1">
                Aucun thème clé détecté par l’IA sur la fenêtre actuelle.
              </li>
            )}
          </ul>
        </section>

        {/* Colonne 3 : desk de trades IA */}
        <section className="space-y-3">
          <div className="px-1 flex items-baseline justify-between">
            <div>
              <h2 className="text-lg font-semibold text-neutral-100">
                Desk de trades (IA)
              </h2>
              <p className="text-xs text-neutral-400">
                Propositions basées sur les thèmes &amp; news ci-contre
              </p>
            </div>
          </div>

          <ul className="space-y-3">
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
                suffisamment robuste). Utilise quand même le radar de thèmes
                comme lecture rapide du narratif de marché.
              </li>
            )}
          </ul>
        </section>
      </section>
    </main>
  );
}
