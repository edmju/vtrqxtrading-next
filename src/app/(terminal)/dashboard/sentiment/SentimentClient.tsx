// src/app/(terminal)/dashboard/sentiment/SentimentClient.tsx

"use client";

import { useMemo } from "react";
import type {
  SentimentSnapshot,
  SentimentTheme,
  RiskIndicator,
  FocusDriver,
  SentimentHistoryPoint,
  SentimentSuggestion,
} from "./page";

type Props = { snapshot: SentimentSnapshot };

/* ------------------------------ helpers UI ------------------------------ */

function scoreToColor(score: number) {
  if (score >= 70) return "text-emerald-300";
  if (score >= 55) return "text-lime-300";
  if (score >= 45) return "text-amber-300";
  if (score >= 30) return "text-orange-300";
  return "text-red-300";
}

function barBg(score: number) {
  if (score >= 70) return "from-emerald-500/70 via-emerald-400/70 to-lime-400/70";
  if (score >= 55) return "from-lime-500/70 via-lime-400/70 to-emerald-400/70";
  if (score >= 45) return "from-amber-500/70 via-amber-400/70 to-yellow-400/70";
  if (score >= 30) return "from-orange-500/80 via-amber-500/80 to-red-500/80";
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
  if (bias === "long") return "border-emerald-500/60 text-emerald-300 bg-emerald-500/10";
  if (bias === "short") return "border-red-500/60 text-red-300 bg-red-500/10";
  return "border-neutral-600 text-neutral-300 bg-neutral-800/60";
}

/* --------------------------- sparkline helpers -------------------------- */

type SparkRange = { min: number; max: number };

function projectScoreToChart(score: number, i: number, n: number, range: SparkRange) {
  const { min, max } = range;
  const span = max - min || 1;
  const dx = n === 1 ? 0 : 100 / (n - 1);
  const x = n === 1 ? 50 : i * dx;
  const norm = (score - min) / span;
  const y = 40 - norm * 30 - 5;
  return { x, y };
}

function buildLinePath(points: SentimentHistoryPoint[], range: SparkRange): string {
  if (!points.length) return "";
  const n = points.length;
  const coords = points.map((p, i) => projectScoreToChart(p.globalScore, i, n, range));
  let d = `M ${coords[0].x} ${coords[0].y}`;
  for (let k = 1; k < coords.length; k++) d += ` L ${coords[k].x} ${coords[k].y}`;
  return d;
}

function buildAreaPath(points: SentimentHistoryPoint[], range: SparkRange): string {
  if (!points.length) return "";
  const n = points.length;
  const coords = points.map((p, i) => projectScoreToChart(p.globalScore, i, n, range));
  const baseY = 40;
  const startX = n === 1 ? 50 : 0;
  const endX = n === 1 ? 50 : coords[coords.length - 1].x;
  let d = `M ${startX} ${baseY}`;
  d += ` L ${coords[0].x} ${coords[0].y}`;
  for (let k = 1; k < coords.length; k++) d += ` L ${coords[k].x} ${coords[k].y}`;
  d += ` L ${endX} ${baseY} Z`;
  return d;
}

type TimeTick = { x: number; label: string };

function formatTickLabel(date: Date, multiDay: boolean): string {
  if (Number.isNaN(date.getTime())) return "";
  return multiDay
    ? date.toLocaleString(undefined, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })
    : date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
}

function buildTimeTicks(points: SentimentHistoryPoint[], maxTicks = 4): TimeTick[] {
  if (!points.length) return [];
  const n = points.length;
  const idxs = n <= maxTicks ? [...Array(n).keys()] : [0, Math.floor(n / 3), Math.floor((2 * n) / 3), n - 1];
  const multiDay = n > 1 && new Date(points[0].timestamp).toDateString() !== new Date(points[n - 1].timestamp).toDateString();
  return idxs.map((i) => ({
    x: n === 1 ? 50 : (i * 100) / (n - 1),
    label: formatTickLabel(new Date(points[i].timestamp), multiDay),
  }));
}

/* ------------------------------ composant -------------------------------- */

export default function SentimentClient({ snapshot }: Props) {
  const { globalScore, marketRegime, themes, riskIndicators, focusDrivers, history, suggestions } =
    snapshot;

  const formattedDate = snapshot.generatedAt
    ? new Date(snapshot.generatedAt).toLocaleString(undefined, { hour12: false })
    : "—";

  const themeMap = useMemo(() => {
    const m: Record<string, SentimentTheme> = {};
    themes.forEach((t) => (m[t.id] = t));
    return m;
  }, [themes]);

  const forex = themeMap.forex;
  const stocks = themeMap.stocks;
  const commodities = themeMap.commodities;

  const sourcesPresent = !!(snapshot.sources && snapshot.sources.length > 0);

  // Drivers : poids 1..3 -> width %
  const drivers = (focusDrivers || []).map((d) => {
    const w = d?.weight && d.weight >= 1 && d.weight <= 3 ? d.weight : 1;
    const widthPct = Math.round((w / 3) * 100);
    return { ...d, weight: w, widthPct };
  });

  const historyPoints: SentimentHistoryPoint[] = useMemo(() => {
    if (!history || !Array.isArray(history)) return [];
    return history.filter((h) => typeof h.globalScore === "number").slice(-30);
  }, [history]);

  const historyRange: SparkRange = useMemo(() => {
    if (!historyPoints.length) return { min: 0, max: 100 };
    let min = 100,
      max = 0;
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

  const hasHistory = historyPoints.length > 0;
  const lastPoint = hasHistory ? historyPoints[historyPoints.length - 1] : undefined;
  const live = hasHistory
    ? projectScoreToChart(lastPoint!.globalScore, historyPoints.length - 1, historyPoints.length, historyRange)
    : null;

  // consensus
  const consensus = snapshot.sourceConsensus ?? 50;
  const consensusLabel =
    consensus >= 70 ? "Sources très alignées" : consensus >= 55 ? "Consensus correct" : consensus >= 40 ? "Lecture mitigée" : "Sources divergentes";
  const globalConfidence = snapshot.globalConfidence ?? marketRegime.confidence;

  // jauge régime : position = globalScore (0..100)
  const regimePos = Math.max(0, Math.min(100, globalScore));

  return (
    <main className="py-8 lg:py-10 w-full overflow-x-hidden">
      <div className="rounded-3xl border border-neutral-800/60 bg-gradient-to-b from-neutral-950/90 via-neutral-950/80 to-neutral-950/90 shadow-[0_0_50px_rgba(0,0,0,0.85)] backdrop-blur-xl">
        <div className="p-6 sm:p-8 lg:p-10 space-y-8 lg:space-y-10">
          {/* Header */}
          <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-semibold text-neutral-50 tracking-tight">
                Sentiment de marché (vue IA)
              </h1>
              <p className="text-xs sm:text-sm text-neutral-400 max-w-2xl">
                Lecture multi-actifs construite à partir de nos flux d’actualités : forex, actions, commodities & régime global.
              </p>
            </div>

            <div className="flex flex-col items-start md:items-end gap-1 text-[11px] sm:text-[12px]">
              <div className="text-neutral-400">
                Dernière mise à jour : <span className="text-neutral-200">{formattedDate}</span>
              </div>
              {sourcesPresent && (
                <div className="flex flex-wrap items-center gap-2 text-neutral-400 max-w-[360px]">
                  <span className="px-2 py-0.5 rounded-full bg-neutral-900/70 border border-neutral-700/70 text-[10px] text-neutral-100 uppercase tracking-wide">
                    Flux multi-sources : forex · actions · commodities
                  </span>
                  <span className="text-neutral-500">issus de nos sources de marché.</span>
                </div>
              )}
            </div>
          </header>

          {/* Ligne 1 : Global / Régime / Drivers */}
          <section className="grid gap-8 md:grid-cols-3 min-w-0">
            {/* Global */}
            <div className="group rounded-3xl p-6 bg-gradient-to-br from-sky-900/50 via-sky-900/15 to-sky-600/10 border border-sky-500/35 shadow-[0_0_35px_rgba(8,47,73,0.9)] backdrop-blur-2xl flex flex-col gap-4 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_0_55px_rgba(8,47,73,1)] hover:border-sky-400/70">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-sky-200/90">
                  Global sentiment score
                </div>
                <span className="px-2 py-0.5 rounded-full bg-sky-900/80 border border-sky-400/60 text-sky-100 shadow-[0_0_10px_rgba(56,189,248,0.4)]">
                  Confiance IA : <span className="font-semibold">{Math.round(globalConfidence)}/100</span>
                </span>
              </div>

              <div className="flex items-center gap-6">
                <div className="relative w-28 h-28">
                  <div className="absolute inset-0 rounded-full bg-neutral-950/80" />
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background:
                        "conic-gradient(from 220deg, #22c55e 0deg, #22c55e " +
                        globalScore * 3.6 +
                        "deg, rgba(148,163,184,0.2) " +
                        globalScore * 3.6 +
                        "deg, rgba(15,23,42,0.9) 360deg)",
                    }}
                  />
                  <div className="absolute inset-[6px] rounded-full bg-neutral-950 flex items-center justify-center">
                    <span className={`text-3xl font-semibold ${scoreToColor(globalScore)}`}>
                      {Math.round(globalScore)}
                    </span>
                  </div>
                  <div className="absolute -inset-1 rounded-full border border-sky-500/40 blur-[2px] opacity-70 group-hover:opacity-100 group-hover:animate-pulse transition duration-700" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-sky-50 leading-snug">
                    Score agrégé <span className={scoreToColor(globalScore)}>{Math.round(globalScore)}/100</span> calculé à partir de nos flux multi-sources.
                  </p>
                  <p className="text-[11px] text-sky-100/80 leading-snug">
                    IA : {(marketRegime?.description || "").split(/[.\n]/)[0] || "lecture neutre."}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-sky-100/80">
                  <span>{consensusLabel}</span>
                  <span className="flex items-center gap-1">
                    <span className="text-sky-200/90">{Math.round(consensus)}/100</span>
                    <span className="text-sky-200/60">consensus</span>
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-sky-950/80 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-sky-400 via-emerald-400 to-lime-300 transition-all duration-600" style={{ width: `${Math.max(6, consensus)}%` }} />
                </div>
              </div>
            </div>

            {/* Régime (avec jauge) */}
            <div className="group rounded-3xl p-6 bg-gradient-to-br from-violet-900/45 via-violet-900/20 to-violet-600/10 border border-violet-500/35 shadow-[0_0_35px_rgba(76,29,149,0.9)] backdrop-blur-2xl transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_0_55px_rgba(76,29,149,1)] hover:border-violet-400/70">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-violet-200">
                  Régime de marché (IA)
                </div>
                <div className="text-[11px] text-neutral-100">
                  Confiance : <span className="font-semibold">{marketRegime.confidence}/100</span>
                </div>
              </div>

              <div className="mt-3 space-y-3">
                <div className="text-sm font-semibold text-emerald-300">{marketRegime.label}</div>
                <p className="text-[12px] text-violet-50 leading-snug">{marketRegime.description}</p>

                {/* Jauge risk-off ↔ risk-on */}
                <div className="mt-2">
                  <div className="flex items-center justify-between text-[10px] text-neutral-300 mb-1">
                    <span>Risk‑off</span>
                    <span>Neutre</span>
                    <span>Risk‑on</span>
                  </div>
                  <div className="relative h-3 rounded-full bg-gradient-to-r from-rose-500/30 via-amber-400/20 to-emerald-500/30 border border-violet-400/30 overflow-hidden">
                    <div
                      className="absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-emerald-300/30 blur-[6px]"
                      style={{ left: `calc(${regimePos}% - 10px)` }}
                    />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.8)] animate-pulse"
                      style={{ left: `calc(${regimePos}% - 5px)` }}
                      title={`Position du biais global : ${Math.round(regimePos)}/100`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Focus drivers (poids 1..3) */}
            <div className="group rounded-3xl p-6 bg-gradient-to-br from-emerald-900/45 via-emerald-900/20 to-emerald-600/10 border border-emerald-500/35 shadow-[0_0_35px_rgba(6,95,70,0.9)] backdrop-blur-2xl transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_0_55px_rgba(6,95,70,1)] hover:border-emerald-400/70">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-200">
                  Focus drivers (IA)
                </div>
                {drivers.length > 0 && (
                  <div className="text-[11px] text-neutral-100">{drivers.length} axes dominants</div>
                )}
              </div>

              {drivers.length === 0 ? (
                <p className="mt-3 text-xs text-neutral-200">
                  L’IA ne détecte pas de driver dominant sur cette fenêtre.
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {drivers.map((d) => (
                    <li key={d.label} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-neutral-50 truncate">{d.label}</span>
                        <span className="px-1.5 py-0.5 rounded-md bg-neutral-900/70 border border-neutral-700/70 text-neutral-200">
                          Poids {d.weight}/3
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-neutral-900 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-400 via-lime-400 to-amber-300 transition-all duration-600 group-hover:translate-x-[1px]"
                          style={{ width: `${Math.max(10, d.widthPct)}%` }}
                        />
                      </div>
                      {d.description && (
                        <p className="text-[11px] text-neutral-100 leading-snug">{d.description}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Timeline */}
          <section className="space-y-4 pt-2 border-t border-neutral-900/80">
            <div>
              <h2 className="text-[14px] font-semibold text-neutral-100">Historique du sentiment</h2>
              <p className="text-[11px] text-neutral-400">
                Sentiment global et par classe d’actifs sur les derniers rafraîchissements.
              </p>
            </div>

            <div className="rounded-3xl border border-neutral-800/70 bg-neutral-950/90 backdrop-blur-2xl px-4 py-5 space-y-3">
              {!hasHistory ? (
                <div className="text-[11px] text-neutral-400">
                  La timeline se remplira automatiquement au fil des prochains runs.
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-[11px] text-neutral-300 mb-1">
                    <span>Global</span>
                    <span>
                      Dernière valeur :{" "}
                      <span className={scoreToColor(globalScore)}>{Math.round(globalScore)}/100</span>
                    </span>
                  </div>

                  <div className="h-28 w-full relative overflow-hidden">
                    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
                      <defs>
                        <linearGradient id="sentimentLine-global" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#22c55e" />
                          <stop offset="50%" stopColor="#eab308" />
                          <stop offset="100%" stopColor="#ef4444" />
                        </linearGradient>
                      </defs>

                      <rect x="0" y="0" width="100" height="40" fill="url(#sentimentLine-global)" fillOpacity={0.04} />
                      <path d={buildAreaPath(historyPoints, historyRange)} fill="url(#sentimentLine-global)" fillOpacity={0.18} />
                      <path d={buildLinePath(historyPoints, historyRange)} fill="none" stroke="url(#sentimentLine-global)" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />

                      {live && (
                        <>
                          <circle cx={live.x} cy={live.y} r={5} className="fill-emerald-300/20 animate-ping" />
                          <circle cx={live.x} cy={live.y} r={2} className="fill-emerald-300" />
                        </>
                      )}
                    </svg>

                    <div className="absolute inset-x-0 bottom-0 h-6 text-[10px] text-neutral-500">
                      <div className="relative w-full h-full">
                        {buildTimeTicks(historyPoints).map((t) => (
                          <div key={`${t.x}-${t.label}`} className="absolute top-0 -translate-x-1/2 flex flex-col items-center gap-0.5" style={{ left: `${t.x}%` }}>
                            <div className="h-[6px] w-px bg-neutral-700/70" />
                            <div className="whitespace-nowrap">{t.label || "—"}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1">
                    <span>
                      Min <span className="text-neutral-200">{Math.round(historyRange.min)}</span>/100
                    </span>
                    <span>
                      Max <span className="text-neutral-200">{Math.round(historyRange.max)}</span>/100
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* mini-séries */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <MiniCard title="Forex" history={historyPoints} pick={(p) => p.forexScore} />
              <MiniCard title="Actions" history={historyPoints} pick={(p) => p.stocksScore} />
              <MiniCard title="Commodities" history={historyPoints} pick={(p) => p.commoditiesScore} />
            </div>
          </section>

          {/* Thèmes + indicateurs + idées */}
          <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] min-w-0 pt-4 border-t border-neutral-900/80">
            {/* Thèmes */}
            <div className="space-y-5">
              <div>
                <h2 className="text-[15px] font-semibold text-neutral-100">Sentiment par grand thème</h2>
                <p className="text-[11px] text-neutral-400">
                  Forex, actions et commodities – agrégés à partir de nos flux.
                </p>
              </div>

              <div className="rounded-3xl border border-neutral-800/70 bg-neutral-950/88 backdrop-blur-2xl shadow-[0_0_25px_rgba(0,0,0,0.9)] p-5 space-y-4">
                {[forex, stocks, commodities].filter(Boolean).map((t) => {
                  const theme = t as SentimentTheme;
                  const width = Math.max(0, Math.min(100, theme.score));
                  return (
                    <div key={theme.id} className="space-y-1.5 transition-all duration-250 hover:bg-neutral-900/70 rounded-2xl px-3 py-2">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-neutral-100 font-medium">{theme.label}</span>
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
                            {theme.direction === "bullish" ? "biais risk-on" : theme.direction === "bearish" ? "biais risk-off" : "neutre"}
                          </span>
                        </div>
                        <span className={"text-[11px] font-medium " + scoreToColor(theme.score)}>
                          {Math.round(theme.score)}/100
                        </span>
                      </div>

                      <div className="h-2 rounded-full bg-neutral-900 overflow-hidden">
                        <div className={"h-full rounded-full bg-gradient-to-r " + barBg(theme.score)} style={{ width: `${width}%` }} />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-neutral-400">
                        <span>{sentimentLabel(theme.score)}</span>
                        {theme.comment && <span className="text-right max-w-[60%] truncate text-neutral-300">{theme.comment}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {suggestions && suggestions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <h2 className="text-[15px] font-semibold text-neutral-100">Idées de positionnement (IA)</h2>
                    <span className="text-[11px] text-neutral-500">Basées uniquement sur le sentiment agrégé.</span>
                  </div>
                  <div className="rounded-3xl border border-neutral-800/70 bg-neutral-950/88 backdrop-blur-2xl shadow-[0_0_25px_rgba(0,0,0,0.9)] p-4 space-y-3">
                    {suggestions.slice(0, 3).map((s) => (
                      <div
                        key={s.id}
                        className="rounded-2xl px-3 py-3 bg-neutral-900/75 border border-neutral-700/70 flex flex-col gap-1.5 text-xs transition-all duration-250 hover:border-emerald-500/70 hover:bg-neutral-900 hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(34,197,94,0.35)]"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-neutral-50 font-medium truncate">{s.label}</span>
                            <span className={"px-2 py-0.5 rounded-full text-[11px] border " + badgeForBias(s.bias)}>
                              {s.bias === "long" ? "biais long" : s.bias === "short" ? "biais short" : "neutre"}
                            </span>
                          </div>
                          <span className="text-[11px] text-neutral-200">{Math.round(s.confidence)}/100</span>
                        </div>
                        <p className="text-[11px] text-neutral-200 leading-snug">{s.rationale}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Indicateurs */}
            <div className="space-y-4">
              <div>
                <h2 className="text-[15px] font-semibold text-neutral-100">Indicateurs de risque</h2>
                <p className="text-[11px] text-neutral-400">Volatilité perçue, balance bull/bear & dynamique du flux.</p>
              </div>

              <div className="rounded-3xl border border-neutral-800/70 bg-neutral-950/88 backdrop-blur-2xl shadow-[0_0_25px_rgba(0,0,0,0.9)] p-5 space-y-3">
                {(!riskIndicators || riskIndicators.length === 0) && (
                  <div className="space-y-2">
                    <div className="h-1.5 rounded-full bg-neutral-900 overflow-hidden">
                      <div className="h-full w-2/3 bg-neutral-700/60 animate-pulse" />
                    </div>
                    <div className="h-1.5 rounded-full bg-neutral-900 overflow-hidden">
                      <div className="h-full w-1/2 bg-neutral-700/40 animate-pulse" />
                    </div>
                  </div>
                )}

                {riskIndicators.map((ind) => {
                  const width = Math.max(0, Math.min(100, ind.score));
                  const dir =
                    ind.direction === "up" ? "en hausse" : ind.direction === "down" ? "en baisse" : "stable";
                  return (
                    <div key={ind.id} className="space-y-1.5 transition-all duration-250 hover:bg-neutral-900/75 rounded-2xl px-3 py-2">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex flex-col min-w-0">
                          <span className="text-neutral-100 font-medium">{ind.label}</span>
                          <span className="text-neutral-400 text-[11px]">{ind.value ? ind.value : "—"} · {dir}</span>
                        </div>
                        <span className={"text-[11px] font-medium " + scoreToColor(ind.score)}>{Math.round(ind.score)}/100</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-neutral-900 overflow-hidden">
                        <div className={"h-full rounded-full bg-gradient-to-r " + barBg(ind.score)} style={{ width: `${width}%` }} />
                      </div>
                      {ind.comment && <div className="text-[11px] text-neutral-300">{ind.comment}</div>}
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

/* --------------------------- mini sparkline ------------------------------ */

type MiniProps = {
  title: string;
  history: SentimentHistoryPoint[];
  pick: (p: SentimentHistoryPoint) => number | undefined;
};

function MiniCard({ title, history, pick }: MiniProps) {
  if (!history?.length) {
    return (
      <div className="rounded-3xl border border-neutral-800/70 bg-neutral-950/85 backdrop-blur-2xl px-3 py-3 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-neutral-300">
          <span>{title}</span>
          <span>—</span>
        </div>
        <div className="h-10 w-full flex items-center justify-center text-[11px] text-neutral-500">
          Historique en construction.
        </div>
      </div>
    );
  }

  const series = history.map((p) => ({
    ...p,
    globalScore: typeof pick(p) === "number" ? (pick(p) as number) : p.globalScore,
  }));

  let min = 100,
    max = 0;
  for (const p of series) {
    if (p.globalScore < min) min = p.globalScore;
    if (p.globalScore > max) max = p.globalScore;
  }
  if (min === max) {
    min = Math.max(0, min - 5);
    max = Math.min(100, max + 5);
  }
  const range: SparkRange = { min, max };
  const last = series[series.length - 1]?.globalScore ?? 50;
  const gid = `spark-${title.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div className="rounded-3xl border border-neutral-800/70 bg-neutral-950/85 backdrop-blur-2xl px-3 py-3 space-y-1.5">
      <div className="flex items-center justify-between text-[11px] text-neutral-300">
        <span>{title}</span>
        <span>{Math.round(last)}/100</span>
      </div>
      <div className="h-14 w-full relative">
        <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-full">
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>
          <path d={buildAreaPath(series, range)} fill={`url(#${gid})`} fillOpacity={0.2} />
          <path d={buildLinePath(series, range)} fill="none" stroke={`url(#${gid})`} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}
