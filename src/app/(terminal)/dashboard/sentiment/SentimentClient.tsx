// src/app/(terminal)/dashboard/sentiment/SentimentClient.tsx
"use client";

import { useMemo } from "react";
import type {
  SentimentSnapshot,
  SentimentTheme,
  RiskIndicator,
  FocusDriver,
  SentimentSource,
  SentimentHistoryPoint,
  SentimentSuggestion,
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
  if (score >= 70) return "très pro-risque";
  if (score >= 55) return "orienté risque";
  if (score >= 45) return "équilibré";
  if (score >= 30) return "défensif";
  return "fortement défensif";
}

function badgeForBias(bias: SentimentSuggestion["bias"]) {
  if (bias === "long")
    return "border-emerald-500/60 text-emerald-300 bg-emerald-500/10";
  if (bias === "short")
    return "border-red-500/60 text-red-300 bg-red-500/10";
  return "border-neutral-600 text-neutral-300 bg-neutral-800/60";
}

/* -------------------------------------------------------------------------- */

export default function SentimentClient({ snapshot }: Props) {
  const {
    globalScore,
    marketRegime,
    themes,
    riskIndicators,
    focusDrivers,
    history,
    suggestions,
  } = snapshot;

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

  const sourcesSummary = useMemo(() => {
    if (!snapshot.sources || snapshot.sources.length === 0) return null;

    const counts: Record<string, number> = {
      forex: 0,
      stocks: 0,
      commodities: 0,
      global: 0,
    };

    snapshot.sources.forEach((s: SentimentSource) => {
      const key = s.assetClass ?? "global";
      if (counts[key] === undefined) counts[key] = 0;
      counts[key] += 1;
    });

    const total = snapshot.sources.length;
    const parts: string[] = [];
    if (counts.forex) parts.push(`${counts.forex} Forex`);
    if (counts.stocks) parts.push(`${counts.stocks} Actions`);
    if (counts.commodities) parts.push(`${counts.commodities} Commodities`);

    return {
      total,
      breakdown: parts.join(" · "),
    };
  }, [snapshot.sources]);

  const normalizedFocusDrivers = useMemo(() => {
    if (!focusDrivers || focusDrivers.length === 0) return [];

    const raw = focusDrivers.map((d) => ({
      ...d,
      weight: d.weight && d.weight > 0 ? d.weight : 1,
    }));

    const totalWeight = raw.reduce((acc, d) => acc + d.weight, 0) || raw.length;

    let used = 0;
    return raw.map((d, index) => {
      let share = d.weight / totalWeight;
      let score = Math.round(share * 100);

      if (index === raw.length - 1) {
        score = Math.max(0, 100 - used);
      } else {
        used += score;
      }

      return {
        ...d,
        displayScore: score,
      };
    });
  }, [focusDrivers]);

  const shortRegimeDescription = useMemo(() => {
    const txt = marketRegime?.description || "";
    const firstSentence = txt.split(/[\.\n]/).map((x) => x.trim())[0] || "";
    return firstSentence ? `${firstSentence}.` : "";
  }, [marketRegime]);

  const historyPoints = useMemo<SentimentHistoryPoint[]>(() => {
    if (!history || !Array.isArray(history)) return [];
    return history
      .filter(
        (h) =>
          h &&
          typeof h.globalScore === "number" &&
          !Number.isNaN(h.globalScore)
      )
      .slice(-30); // max 30 points
  }, [history]);

  const historyMinMax = useMemo(() => {
    if (!historyPoints.length) return { min: 0, max: 100 };
    let min = 100;
    let max = 0;
    for (const p of historyPoints) {
      if (p.globalScore < min) min = p.globalScore;
      if (p.globalScore > max) max = p.globalScore;
    }
    if (min === max) {
      min = Math.max(0, min - 5);
      max = Math.min(100, max + 5);
    }
    return { min, max };
  }, [historyPoints]);

  const globalConfidence = snapshot.globalConfidence ?? marketRegime.confidence;
  const sourceConsensus = snapshot.sourceConsensus ?? 50;

  const consensusLabel =
    sourceConsensus >= 70
      ? "Sources très alignées"
      : sourceConsensus >= 55
      ? "Consensus correct"
      : sourceConsensus >= 40
      ? "Lecture mitigée"
      : "Sources divergentes";

  return (
    <main className="py-6 lg:py-8 w-full overflow-x-hidden">
      <div className="rounded-3xl border border-neutral-800/80 bg-gradient-to-b from-neutral-950/95 via-neutral-950/90 to-neutral-950/80 shadow-[0_0_40px_rgba(0,0,0,0.75)]">
        <div className="p-4 sm:p-6 lg:p-7 space-y-5 lg:space-y-6">
          {/* Header aligné sur la page News */}
          <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-neutral-50 tracking-tight">
                Sentiment de marché (vue IA)
              </h1>
              <p className="text-xs text-neutral-400 mt-1">
                Lecture multi-actifs construite à partir du flux d’actualités :
                forex, actions, commodities & régime global.
              </p>
            </div>

            <div className="flex flex-col items-start md:items-end gap-1 text-[11px]">
              <div className="text-neutral-400">
                Dernière mise à jour :{" "}
                <span className="text-neutral-200">{formattedDate}</span>
              </div>
              {sourcesSummary && (
                <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-neutral-400 max-w-[360px]">
                  <span>Basé sur</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-neutral-900/80 border border-neutral-700/70 text-[10px] text-neutral-100 uppercase tracking-wide">
                    {sourcesSummary.total} flux d’actualités
                  </span>
                  {sourcesSummary.breakdown && (
                    <>
                      <span>·</span>
                      <span className="text-neutral-300">
                        {sourcesSummary.breakdown}
                      </span>
                    </>
                  )}
                  <span className="text-neutral-500">
                    (Alpha Vantage – News Sentiment)
                  </span>
                </div>
              )}
            </div>
          </header>

          {/* Ligne 1 : score global + régime IA + focus drivers */}
          <section className="grid gap-3 md:gap-4 md:grid-cols-3 min-w-0">
            {/* Score global + confiance + consensus sources */}
            <div className="group rounded-2xl p-3.5 bg-gradient-to-br from-sky-900/70 via-sky-800/40 to-sky-600/20 ring-1 ring-sky-500/40 shadow-md shadow-sky-900/40 flex flex-col gap-3 min-w-0 transition-all duration-300 hover:-translate-y-[1px] hover:shadow-[0_0_30px_rgba(8,47,73,0.8)]">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-sky-300/80">
                  Global sentiment score
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-sky-100/90">
                    Confiance IA :{" "}
                    <span className="font-medium">
                      {Math.round(globalConfidence)}/100
                    </span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="relative w-24 h-24 shrink-0">
                  <div className="absolute inset-0 rounded-full bg-neutral-950/80" />
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background:
                        "conic-gradient(from 220deg, #22c55e 0deg, #22c55e " +
                        globalScore * 3.6 +
                        "deg, rgba(148,163,184,0.25) " +
                        globalScore * 3.6 +
                        "deg, rgba(15,23,42,0.9) 360deg)",
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
                  <div className="absolute -inset-1 rounded-full border border-sky-500/30 blur-[1px] opacity-60 group-hover:opacity-100 group-hover:animate-pulse transition duration-500" />
                </div>

                <div className="flex flex-col gap-1 min-w-0">
                  <p className="text-xs text-sky-50 leading-snug">
                    Score agrégé{" "}
                    <span className={scoreToColor(globalScore)}>
                      {Math.round(globalScore)}/100
                    </span>{" "}
                    calculé à partir des flux Alpha Vantage.
                  </p>
                  <p className="text-[11px] text-sky-100/80 leading-snug">
                    IA : {shortRegimeDescription || "lecture neutre du marché."}
                  </p>
                </div>
              </div>

              <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-sky-100/80">
                <span>{consensusLabel}</span>
                <span className="flex items-center gap-1">
                  <span className="text-sky-200/80">
                    {Math.round(sourceConsensus)}/100
                  </span>
                  <span className="text-sky-200/60">consensus</span>
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-sky-950/80 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-400 via-emerald-400 to-lime-300 transition-all duration-500"
                  style={{ width: `${Math.max(5, sourceConsensus)}%` }}
                />
              </div>
            </div>

            {/* Régime de marché IA */}
            <div className="group rounded-2xl p-3.5 bg-gradient-to-br from-violet-900/70 via-violet-800/40 to-violet-600/20 ring-1 ring-violet-500/40 shadow-md shadow-violet-900/40 flex flex-col min-w-0 transition-all duration-300 hover:-translate-y-[1px] hover:shadow-[0_0_30px_rgba(76,29,149,0.9)]">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-violet-300/80">
                  Régime de marché (IA)
                </div>
                <div className="text-[11px] text-neutral-200">
                  Confiance :{" "}
                  <span className="font-medium">
                    {marketRegime.confidence}/100
                  </span>
                </div>
              </div>
              <div className="mt-2">
                <div className="text-sm font-semibold text-emerald-300">
                  {marketRegime.label}
                </div>
                <p className="mt-2 text-[12px] text-violet-50 leading-snug">
                  {marketRegime.description}
                </p>
              </div>
            </div>

            {/* Focus drivers IA */}
            <div className="group rounded-2xl p-3.5 bg-gradient-to-br from-emerald-900/70 via-emerald-800/40 to-emerald-600/20 ring-1 ring-emerald-500/40 shadow-md shadow-emerald-900/40 min-w-0 transition-all duration-300 hover:-translate-y-[1px] hover:shadow-[0_0_30px_rgba(6,95,70,0.9)]">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-300/80">
                  Focus drivers (IA)
                </div>
                {normalizedFocusDrivers.length > 0 && (
                  <div className="text-[11px] text-neutral-200">
                    {normalizedFocusDrivers.length} axes dominants
                  </div>
                )}
              </div>

              {normalizedFocusDrivers.length === 0 ? (
                <p className="mt-3 text-xs text-neutral-200">
                  L’IA ne détecte pas de driver dominant sur cette fenêtre :
                  le flux de news est réparti entre plusieurs thèmes.
                </p>
              ) : (
                <ul className="mt-3 space-y-2.5">
                  {normalizedFocusDrivers.map(
                    (d: FocusDriver & { displayScore: number }) => {
                      const width = Math.min(100, Math.max(0, d.displayScore));
                      const text = d.description || d.comment || undefined;

                      return (
                        <li key={d.label} className="space-y-1">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="text-neutral-50 truncate">
                              {d.label}
                            </span>
                            <span className="text-neutral-200 text-[11px]">
                              {width}/100
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-neutral-900 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-400 via-lime-400 to-amber-300 transition-all duration-500 group-hover:translate-x-[1px]"
                              style={{ width: `${Math.max(10, width)}%` }}
                            />
                          </div>
                          {text && (
                            <p className="text-[11px] text-neutral-100 leading-snug">
                              {text}
                            </p>
                          )}
                        </li>
                      );
                    }
                  )}
                </ul>
              )}
            </div>
          </section>

          {/* Timeline historique */}
          {historyPoints.length > 1 && (
            <section className="mt-1 space-y-2">
              <div className="flex items-center justify-between px-1">
                <div>
                  <h2 className="text-[13px] font-semibold text-neutral-100">
                    Historique du sentiment global
                  </h2>
                  <p className="text-[11px] text-neutral-400">
                    Dernières mesures enregistrées – utile pour voir si le
                    marché se retourne ou s’installe dans un régime.
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-neutral-800/80 bg-neutral-950/90 px-3 py-2">
                <div className="h-16 w-full relative">
                  <svg
                    viewBox="0 0 100 40"
                    preserveAspectRatio="none"
                    className="w-full h-full"
                  >
                    {/* fond */}
                    <defs>
                      <linearGradient
                        id="sentimentLine"
                        x1="0"
                        y1="0"
                        x2="1"
                        y2="0"
                      >
                        <stop offset="0%" stopColor="#22c55e" />
                        <stop offset="50%" stopColor="#eab308" />
                        <stop offset="100%" stopColor="#ef4444" />
                      </linearGradient>
                    </defs>
                    {/* zone */}
                    <path
                      d={buildAreaPath(historyPoints, historyMinMax)}
                      fill="url(#sentimentLine)"
                      fillOpacity={0.15}
                    />
                    {/* ligne */}
                    <path
                      d={buildLinePath(historyPoints, historyMinMax)}
                      fill="none"
                      stroke="url(#sentimentLine)"
                      strokeWidth="0.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-neutral-400">
                  <span>
                    Min{" "}
                    <span className="text-neutral-200">
                      {Math.round(historyMinMax.min)}
                    </span>
                    /100
                  </span>
                  <span>
                    Max{" "}
                    <span className="text-neutral-200">
                      {Math.round(historyMinMax.max)}
                    </span>
                    /100
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* Ligne 2 : thèmes + indicateurs de risque + suggestions */}
          <section className="grid gap-5 lg:gap-6 lg:grid-cols-[1.1fr_0.9fr] min-w-0">
            {/* Thèmes : Forex / Stocks / Commodities */}
            <div className="space-y-3 min-w-0">
              <div className="px-1 flex items-baseline justify-between">
                <div>
                  <h2 className="text-[15px] font-semibold text-neutral-100">
                    Sentiment par grand thème
                  </h2>
                  <p className="text-[11px] text-neutral-400">
                    Forex, actions et commodities – agrégés à partir des flux
                    externes, même logique que le radar de thèmes de la page
                    News.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-800/80 bg-neutral-950/90 shadow-sm shadow-black/50 p-4 space-y-3 min-w-0">
                {[forex, stocks, commodities]
                  .filter(Boolean)
                  .map((t) => {
                    const theme = t as SentimentTheme;
                    const width = Math.min(100, Math.max(0, theme.score));
                    const label = sentimentLabel(theme.score);

                    return (
                      <div
                        key={theme.id}
                        className="space-y-1.5 transition-all duration-300 hover:bg-neutral-900/70 rounded-xl px-2 py-1.5 -mx-2"
                      >
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
                            <span className="text-right max-w-[60%] truncate text-neutral-300">
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

              {/* Suggestions de trades basées sur le sentiment */}
              {suggestions && suggestions.length > 0 && (
                <div className="space-y-2">
                  <div className="px-1 flex items-baseline justify-between">
                    <h2 className="text-[15px] font-semibold text-neutral-100">
                      Idées de positionnement (IA)
                    </h2>
                    <span className="text-[11px] text-neutral-500">
                      Basées uniquement sur le sentiment agrégé
                    </span>
                  </div>
                  <div className="rounded-2xl border border-neutral-800/80 bg-neutral-950/90 shadow-sm shadow-black/50 p-3 space-y-2.5">
                    {suggestions.slice(0, 3).map((s: SentimentSuggestion) => (
                      <div
                        key={s.id}
                        className="rounded-xl px-3 py-2 bg-neutral-900/70 border border-neutral-700/60 flex flex-col gap-1.5 text-xs transition-all duration-200 hover:border-emerald-500/60 hover:bg-neutral-900"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-neutral-50 font-medium truncate">
                              {s.label}
                            </span>
                            <span
                              className={
                                "px-2 py-0.5 rounded-full text-[11px] border " +
                                badgeForBias(s.bias)
                              }
                            >
                              {s.bias === "long"
                                ? "biais long"
                                : s.bias === "short"
                                ? "biais short"
                                : "neutre"}
                            </span>
                          </div>
                          <span className="text-[11px] text-neutral-200">
                            {Math.round(s.confidence)}/100
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-200 leading-snug">
                          {s.rationale}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Indicateurs de risque */}
            <div className="space-y-3 min-w-0">
              <div className="px-1">
                <h2 className="text-[15px] font-semibold text-neutral-100">
                  Indicateurs de risque
                </h2>
                <p className="text-[11px] text-neutral-400">
                  Volatilité, biais bull/bear & intensité du flux – normalisés
                  sur 0–100 pour compléter la lecture IA du régime global.
                </p>
              </div>

              <div className="rounded-2xl border border-neutral-800/80 bg-neutral-950/90 shadow-sm shadow-black/50 p-4 space-y-3 min-w-0">
                {(!riskIndicators || riskIndicators.length === 0) && (
                  <div className="space-y-3">
                    <p className="text-[12px] text-neutral-300">
                      Les indicateurs chiffrés (VIX, spreads de crédit, etc.)
                      ne sont pas encore intégrés. Pour l’instant, le risque
                      est lu via la structure du flux d’actualités.
                    </p>
                    <div className="space-y-2">
                      <div className="h-1.5 rounded-full bg-neutral-900 overflow-hidden">
                        <div className="h-full w-2/3 bg-neutral-700/60 animate-pulse" />
                      </div>
                      <div className="h-1.5 rounded-full bg-neutral-900 overflow-hidden">
                        <div className="h-full w-1/2 bg-neutral-700/40 animate-pulse" />
                      </div>
                    </div>
                  </div>
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
                    <div
                      key={ind.id}
                      className="space-y-1.5 transition-all duration-300 hover:bg-neutral-900/70 rounded-xl px-2 py-1.5 -mx-2"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex flex-col min-w-0">
                          <span className="text-neutral-100 font-medium">
                            {ind.label}
                          </span>
                          <span className="text-neutral-400 text-[11px]">
                            {ind.value ? ind.value : "—"} · {dirLabel}
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

                      <div className="text-[11px] text-neutral-300">
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

/* -------------------------------------------------------------------------- */
/* Helpers sparkline                                                          */
/* -------------------------------------------------------------------------- */

function buildLinePath(
  points: SentimentHistoryPoint[],
  range: { min: number; max: number }
): string {
  if (!points.length) return "";

  const n = points.length;
  const dx = n === 1 ? 0 : 100 / (n - 1);
  const { min, max } = range;
  const span = max - min || 1;

  const coords = points.map((p, i) => {
    const x = i * dx;
    const norm = (p.globalScore - min) / span;
    const y = 40 - norm * 30 - 5; // marge en haut/bas
    return { x, y };
  });

  let d = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 1; i < coords.length; i++) {
    d += ` L ${coords[i].x} ${coords[i].y}`;
  }
  return d;
}

function buildAreaPath(
  points: SentimentHistoryPoint[],
  range: { min: number; max: number }
): string {
  if (!points.length) return "";
  const line = buildLinePath(points, range);
  if (!line) return "";

  const n = points.length;
  const dx = n === 1 ? 0 : 100 / (n - 1);

  const baseY = 40;
  const startX = 0;
  const endX = (n - 1) * dx;

  // on transforme "M x0 y0 L x1 y1 ..." en path fermé sous la ligne
  const main = line.replace(/^M/, "L");
  return `M ${startX} ${baseY}${main} L ${endX} ${baseY} Z`;
}
