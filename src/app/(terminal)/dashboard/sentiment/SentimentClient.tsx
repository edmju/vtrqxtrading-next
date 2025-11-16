// src/app/(terminal)/dashboard/sentiment/SentimentClient.tsx
"use client";

import { useMemo } from "react";
import type {
  SentimentSnapshot,
  SentimentTheme,
  RiskIndicator,
  FocusDriver,
  SentimentSource,
} from "./page";

type Props = {
  snapshot: SentimentSnapshot;
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function scoreToColor(score: number) {
  if (score >= 70) return "text-emerald-300";
  if (score >= 55) return "text-lime-300";
  if (score >= 45) return "text-amber-300";
  if (score >= 30) return "text-orange-300";
  return "text-red-300";
}

function barBg(score: number) {
  if (score >= 70)
    return "from-emerald-500/70 via-emerald-400/70 to-lime-400/70";
  if (score >= 55)
    return "from-lime-500/70 via-lime-400/70 to-emerald-400/70";
  if (score >= 45)
    return "from-amber-500/70 via-amber-400/70 to-yellow-400/70";
  if (score >= 30)
    return "from-orange-500/80 via-amber-500/80 to-red-500/80";
  return "from-red-600/80 via-red-500/80 to-rose-500/80";
}

function sentimentLabel(score: number) {
  if (score >= 70) return "Risk-on fort";
  if (score >= 55) return "Risk-on modéré";
  if (score >= 45) return "Neutre";
  if (score >= 30) return "Risk-off modéré";
  return "Risk-off fort";
}

function indicatorTone(score: number) {
  if (score >= 70) return "plutôt pro-risque";
  if (score >= 55) return "modérément pro-risque";
  if (score >= 45) return "équilibré";
  if (score >= 30) return "modérément défensif";
  return "nettement défensif";
}

/* -------------------------------------------------------------------------- */

export default function SentimentClient({ snapshot }: Props) {
  const { globalScore, marketRegime, themes, riskIndicators, focusDrivers } =
    snapshot;

  const regimeLabel = sentimentLabel(globalScore);

  const formattedDate = snapshot.generatedAt
    ? new Date(snapshot.generatedAt).toLocaleString(undefined, {
        hour12: false,
      })
    : "—";

  const themeMap = useMemo(() => {
    const map: Record<string, SentimentTheme> = {};
    themes.forEach((t) => (map[t.id] = t));
    return map;
  }, [themes]);

  const forex = themeMap.forex;
  const stocks = themeMap.stocks;
  const commodities = themeMap.commodities;

  const sourcesLabel = useMemo(() => {
    if (!snapshot.sources || snapshot.sources.length === 0) return "";
    const list = snapshot.sources as SentimentSource[];
    const uniqueNames = Array.from(
      new Set(list.map((s) => s.name))
    );
    return uniqueNames.join(" · ");
  }, [snapshot.sources]);

  return (
    <main className="py-6 lg:py-8 w-full overflow-x-hidden">
      <div className="rounded-3xl border border-neutral-800/80 bg-gradient-to-b from-neutral-950/95 via-neutral-950/90 to-neutral-950/80 shadow-[0_0_40px_rgba(0,0,0,0.75)]">
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8">
          {/* Bandeau titre + méta */}
          <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-neutral-50">
                Sentiment de marché (vue IA)
              </h1>
              <p className="text-xs text-neutral-400 mt-1">
                Synthèse multi-sources : forex, actions, commodities & indices
                de risque.
              </p>
            </div>
            <div className="text-[11px] text-neutral-400 space-y-0.5">
              <div>
                Dernière mise à jour :{" "}
                <span className="text-neutral-200">{formattedDate}</span>
              </div>
              {sourcesLabel && (
                <div className="max-w-[360px]">
                  Sources agrégées :{" "}
                  <span className="text-neutral-300">{sourcesLabel}</span>
                </div>
              )}
            </div>
          </header>

          {/* Ligne 1 : score global + régime + drivers */}
          <section className="grid gap-4 lg:gap-6 md:grid-cols-3 min-w-0">
            {/* Score global */}
            <div className="rounded-2xl p-4 bg-gradient-to-br from-sky-950/90 via-sky-900/60 to-sky-800/40 ring-1 ring-sky-600/50 shadow-md shadow-sky-950/40 flex flex-col gap-3 min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wide text-sky-300/80">
                Global sentiment score
              </div>

              <div className="flex items-center gap-4">
                <div className="relative w-24 h-24 shrink-0">
                  <div className="absolute inset-0 rounded-full bg-neutral-900/80" />
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background:
                        "conic-gradient(from 220deg, #22c55e 0deg, #22c55e " +
                        globalScore * 3.6 +
                        "deg, rgba(148,163,184,0.3) " +
                        globalScore * 3.6 +
                        "deg, rgba(15,23,42,0.6) 360deg)",
                    }}
                  />
                  <div className="absolute inset-[6px] rounded-full bg-neutral-950 flex items-center justify-center">
                    <span
                      className={`text-2xl font-semibold ${scoreToColor(
                        globalScore
                      )}`}
                    >
                      {Math.round(globalScore)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1 min-w-0">
                  <div className="text-sm font-medium text-neutral-100">
                    {regimeLabel}
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    Lecture IA : score{" "}
                    <span className={scoreToColor(globalScore)}>
                      {Math.round(globalScore)}/100
                    </span>
                    , indiquant un régime {indicatorTone(globalScore)} à
                    l’échelle agrégée.
                  </p>
                </div>
              </div>
            </div>

            {/* Régime de marché */}
            <div className="rounded-2xl p-4 bg-gradient-to-br from-violet-950/90 via-violet-900/60 to-fuchsia-800/40 ring-1 ring-violet-600/50 shadow-md shadow-violet-950/40 flex flex-col justify-between min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wide text-violet-300/80">
                Régime de marché (IA)
              </div>
              <div className="mt-3">
                <div className="text-lg font-semibold text-emerald-300">
                  {marketRegime.label}
                </div>
                <p className="mt-2 text-xs text-neutral-200 leading-relaxed">
                  {marketRegime.description}
                </p>
              </div>
              <div className="mt-3 text-[11px] text-neutral-400">
                Confiance IA :{" "}
                <span className="text-neutral-100">
                  {marketRegime.confidence}/100
                </span>
              </div>
            </div>

            {/* Focus drivers */}
            <div className="rounded-2xl p-4 bg-gradient-to-br from-emerald-950/90 via-emerald-900/60 to-teal-800/40 ring-1 ring-emerald-600/50 shadow-md shadow-emerald-950/40 min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-300/80">
                Focus drivers (IA)
              </div>
              {focusDrivers.length === 0 ? (
                <p className="mt-3 text-xs text-neutral-300">
                  Aucun driver dominant détecté. Le flux est réparti entre
                  plusieurs thèmes.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {focusDrivers.slice(0, 4).map((d) => {
                    const pct = Math.round(d.weight * 100);
                    return (
                      <li key={d.label} className="space-y-1">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="text-neutral-50 truncate">
                            {d.label}
                          </span>
                          <span className="text-neutral-300 text-[11px]">
                            {pct}/100
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-neutral-900 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-400 via-lime-400 to-amber-300"
                            style={{ width: `${Math.max(10, pct)}%` }}
                          />
                        </div>
                        {d.comment && (
                          <p className="text-[11px] text-neutral-300">
                            {d.comment}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {/* Ligne 2 : thèmes + indicateurs de risque */}
          <section className="grid gap-6 lg:gap-8 lg:grid-cols-[1.1fr_0.9fr] min-w-0">
            {/* Thèmes : Forex / Stocks / Commodities */}
            <div className="space-y-3 min-w-0">
              <div className="px-1">
                <h2 className="text-lg font-semibold text-neutral-50">
                  Sentiment par grand thème
                </h2>
                <p className="text-xs text-neutral-400">
                  Forex, actions et commodities – scores agrégés multi-sources.
                </p>
              </div>

              <div className="rounded-2xl border border-neutral-800/80 bg-neutral-950/90 shadow-sm shadow-black/50 p-4 space-y-4 min-w-0">
                {[forex, stocks, commodities]
                  .filter(Boolean)
                  .map((t) => {
                    const theme = t as SentimentTheme;
                    const width = Math.min(100, Math.max(0, theme.score));
                    const label = sentimentLabel(theme.score);

                    return (
                      <div key={theme.id} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-neutral-100 font-medium">
                              {theme.label}
                            </span>
                            <span
                              className={
                                "px-2 py-0.5 rounded-full text-[11px] border " +
                                (theme.direction === "bullish"
                                  ? "border-emerald-500/60 text-emerald-300 bg-emerald-500/10"
                                  : theme.direction === "bearish"
                                  ? "border-red-500/60 text-red-300 bg-red-500/10"
                                  : "border-neutral-600 text-neutral-300 bg-neutral-800/60")
                              }
                            >
                              {theme.direction === "bullish"
                                ? "biais risk-on"
                                : theme.direction === "bearish"
                                ? "biais risk-off"
                                : "neutre"}
                            </span>
                          </div>
                          <span
                            className={
                              "text-[11px] font-medium " +
                              scoreToColor(theme.score)
                            }
                          >
                            {Math.round(theme.score)}/100
                          </span>
                        </div>

                        <div className="h-2 rounded-full bg-neutral-900 overflow-hidden">
                          <div
                            className={
                              "h-full rounded-full bg-gradient-to-r " +
                              barBg(theme.score)
                            }
                            style={{ width: `${width}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-neutral-400">
                          <span>{label}</span>
                          {theme.comment && (
                            <span className="text-right max-w-[60%] truncate">
                              {theme.comment}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                {!forex && !stocks && !commodities && (
                  <p className="text-sm text-neutral-400">
                    Aucun score de thème disponible pour cette fenêtre.
                  </p>
                )}
              </div>
            </div>

            {/* Indicateurs de risque */}
            <div className="space-y-3 min-w-0">
              <div className="px-1">
                <h2 className="text-lg font-semibold text-neutral-50">
                  Indicateurs de risque
                </h2>
                <p className="text-xs text-neutral-400">
                  Volatilité, dérivés, crédit… normalisés sur une échelle
                  0–100.
                </p>
              </div>

              <div className="rounded-2xl border border-neutral-800/80 bg-neutral-950/90 shadow-sm shadow-black/50 p-4 space-y-3 min-w-0">
                {riskIndicators.length === 0 && (
                  <p className="text-sm text-neutral-400">
                    Aucun indicateur de risque agrégé n’est disponible pour
                    l’instant.
                  </p>
                )}

                {riskIndicators.map((ind: RiskIndicator) => {
                  const width = Math.min(100, Math.max(0, ind.score));
                  const tone = indicatorTone(ind.score);
                  const dirLabel =
                    ind.direction === "up"
                      ? "en hausse"
                      : ind.direction === "down"
                      ? "en baisse"
                      : "stable";

                  return (
                    <div key={ind.id} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex flex-col min-w-0">
                          <span className="text-neutral-100 font-medium">
                            {ind.label}
                          </span>
                          <span className="text-neutral-400 text-[11px]">
                            {ind.value} · {dirLabel}
                          </span>
                        </div>
                        <span
                          className={
                            "text-[11px] font-medium " +
                            scoreToColor(ind.score)
                          }
                        >
                          {Math.round(ind.score)}/100
                        </span>
                      </div>

                      <div className="h-1.5 rounded-full bg-neutral-900 overflow-hidden">
                        <div
                          className={
                            "h-full rounded-full bg-gradient-to-r " +
                            barBg(ind.score)
                          }
                          style={{ width: `${width}%` }}
                        />
                      </div>

                      <div className="text-[11px] text-neutral-400">
                        {ind.comment ? (
                          ind.comment
                        ) : (
                          <>Lecture IA : indicateur {tone}.</>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
