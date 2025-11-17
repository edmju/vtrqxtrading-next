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
/* Helpers visuels                                                            */
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
/* Helpers sparkline (avec temps + point live)                                */
/* -------------------------------------------------------------------------- */

type SparkRange = { min: number; max: number };

function projectScoreToChart(
  score: number,
  index: number,
  total: number,
  range: SparkRange
) {
  const { min, max } = range;
  const span = max - min || 1;
  const dx = total === 1 ? 0 : 100 / (total - 1);
  const x = total === 1 ? 50 : index * dx;
  const norm = (score - min) / span;
  const y = 40 - norm * 30 - 5; // marge haut/bas
  return { x, y };
}

function buildLinePath(
  points: SentimentHistoryPoint[],
  range: SparkRange
): string {
  if (!points.length) return "";

  const n = points.length;
  const coords = points.map((p, i) =>
    projectScoreToChart(p.globalScore, i, n, range)
  );

  let d = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 1; i < coords.length; i++) {
    d += ` L ${coords[i].x} ${coords[i].y}`;
  }
  return d;
}

function buildAreaPath(
  points: SentimentHistoryPoint[],
  range: SparkRange
): string {
  if (!points.length) return "";

  const n = points.length;
  const coords = points.map((p, i) =>
    projectScoreToChart(p.globalScore, i, n, range)
  );

  const baseY = 40;
  const startX = n === 1 ? 50 : 0;
  const endX = n === 1 ? 50 : coords[coords.length - 1].x;

  let d = `M ${startX} ${baseY}`;
  d += ` L ${coords[0].x} ${coords[0].y}`;
  for (let i = 1; i < coords.length; i++) {
    d += ` L ${coords[i].x} ${coords[i].y}`;
  }
  d += ` L ${endX} ${baseY} Z`;
  return d;
}

type TimeTick = { x: number; label: string };

function formatTickLabel(date: Date, multiDay: boolean): string {
  if (Number.isNaN(date.getTime())) return "";
  if (multiDay) {
    return date.toLocaleString(undefined, {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function buildTimeTicks(
  points: SentimentHistoryPoint[],
  maxTicks = 4
): TimeTick[] {
  if (!points.length) return [];
  const n = points.length;
  const indices: number[] =
    n <= maxTicks
      ? Array.from({ length: n }, (_, i) => i)
      : [0, Math.floor(n / 3), Math.floor((2 * n) / 3), n - 1];

  const multiDay =
    n > 1 &&
    (() => {
      const first = new Date(points[0].timestamp);
      const last = new Date(points[n - 1].timestamp);
      return first.toDateString() !== last.toDateString();
    })();

  const seen = new Set<number>();
  const ticks: TimeTick[] = [];

  for (const i of indices) {
    if (seen.has(i)) continue;
    seen.add(i);
    const p = points[i];
    const d = new Date(p.timestamp);
    const label = formatTickLabel(d, multiDay);
    const x = n === 1 ? 50 : (i * 100) / (n - 1);
    ticks.push({ x, label });
  }

  return ticks;
}

/* Mini sparkline par thème */

type MiniHistoryCardProps = {
  title: string;
  history: SentimentHistoryPoint[];
  accessor: (p: SentimentHistoryPoint) => number | undefined;
};

function MiniHistoryCard({ title, history, accessor }: MiniHistoryCardProps) {
  if (!history || history.length === 0) {
    return (
      <div className="rounded-3xl border border-neutral-800/70 bg-neutral-950/85 backdrop-blur-2xl px-3 py-3 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-neutral-300">
          <span>{title}</span>
          <span>—</span>
        </div>
        <div className="h-10 w-full flex items-center justify-center text-[11px] text-neutral-500">
          Historique en cours de construction.
        </div>
      </div>
    );
  }

  const series = history.map((p) => {
    const v = accessor(p);
    return {
      ...p,
      globalScore:
        typeof v === "number" && !Number.isNaN(v) ? v : p.globalScore,
    };
  });

  let min = 100;
  let max = 0;
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
  const gradientId = `sentimentLine-${title
    .toLowerCase()
    .replace(/\s+/g, "-")}`;

  return (
    <div className="rounded-3xl border border-neutral-800/70 bg-neutral-950/85 backdrop-blur-2xl px-3 py-3 space-y-1.5">
      <div className="flex items-center justify-between text-[11px] text-neutral-300">
        <span>{title}</span>
        <span>{Math.round(last)}/100</span>
      </div>
      <div className="h-14 w-full relative">
        <svg
          viewBox="0 0 100 40"
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>
          <path
            d={buildAreaPath(series, range)}
            fill={`url(#${gradientId})`}
            fillOpacity={0.2}
          />
          <path
            d={buildLinePath(series, range)}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={1.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Composant principal                                                        */
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

  const sourcesPresent = useMemo(
    () => !!(snapshot.sources && snapshot.sources.length > 0),
    [snapshot.sources]
  );

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
      .slice(-30);
  }, [history]);

  const historyMinMax = useMemo<SparkRange>(() => {
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

  const lastPoint = historyPoints[historyPoints.length - 1];
  const hasHistory = historyPoints.length > 0;

  const livePointCoords =
    hasHistory && lastPoint
      ? projectScoreToChart(
          lastPoint.globalScore,
          historyPoints.length - 1,
          historyPoints.length,
          historyMinMax
        )
      : null;

  const timeTicks = useMemo(
    () => buildTimeTicks(historyPoints),
    [historyPoints]
  );

  return (
    <main className="py-8 lg:py-10 w-full overflow-x-hidden">
      <div className="rounded-3xl border border-neutral-800/60 bg-gradient-to-b from-neutral-950/90 via-neutral-950/80 to-neutral-950/90 shadow-[0_0_50px_rgba(0,0,0,0.85)] backdrop-blur-xl">
        <div className="p-6 sm:p-8 lg:p-10 space-y-8 lg:space-y-10">
          {/* Header aéré */}
          <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-semibold text-neutral-50 tracking-tight">
                Sentiment de marché (vue IA)
              </h1>
              <p className="text-xs sm:text-sm text-neutral-400 max-w-2xl">
                Lecture multi-actifs construite à partir de nos flux
                d’actualités : forex, actions, commodities & régime global.
              </p>
            </div>

            <div className="flex flex-col items-start md:items-end gap-1 text-[11px] sm:text-[12px]">
              <div className="text-neutral-400">
                Dernière mise à jour :{" "}
                <span className="text-neutral-200">{formattedDate}</span>
              </div>
              {sourcesPresent && (
                <div className="flex flex-wrap items-center gap-2 text-neutral-400 max-w-[360px]">
                  <span className="px-2 py-0.5 rounded-full bg-neutral-900/70 border border-neutral-700/70 text-[10px] text-neutral-100 uppercase tracking-wide">
                    Flux multi-sources : forex · actions · commodities
                  </span>
                  <span className="text-neutral-500">
                    issus de nos sources de marché.
                  </span>
                </div>
              )}
            </div>
          </header>

          {/* Ligne 1 : trois gros blocs bien espacés */}
          <section className="grid gap-6 md:grid-cols-3 min-w-0">
            {/* Global sentiment */}
            <div className="group rounded-3xl p-5 bg-gradient-to-br from-sky-900/50 via-sky-900/15 to-sky-600/10 border border-sky-500/35 shadow-[0_0_35px_rgba(8,47,73,0.9)] backdrop-blur-2xl flex flex-col gap-4 min-w-0 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_0_55px_rgba(8,47,73,1)] hover:border-sky-400/70">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-sky-200/90">
                  Global sentiment score
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="px-2 py-0.5 rounded-full bg-sky-900/80 border border-sky-400/60 text-sky-100 shadow-[0_0_10px_rgba(56,189,248,0.4)]">
                    Confiance IA :{" "}
                    <span className="font-semibold">
                      {Math.round(globalConfidence)}/100
                    </span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="relative w-28 h-28 shrink-0">
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
                    <span
                      className={`text-3xl font-semibold ${scoreToColor(
                        globalScore
                      )}`}
                    >
                      {Math.round(globalScore)}
                    </span>
                  </div>
                  <div className="absolute -inset-1 rounded-full border border-sky-500/40 blur-[2px] opacity-70 group-hover:opacity-100 group-hover:animate-pulse transition duration-700" />
                </div>

                <div className="flex flex-col gap-1.5 min-w-0">
                  <p className="text-sm text-sky-50 leading-snug">
                    Score agrégé{" "}
                    <span className={scoreToColor(globalScore)}>
                      {Math.round(globalScore)}/100
                    </span>{" "}
                    calculé à partir de nos flux d’actualités multi-sources.
                  </p>
                  <p className="text-[11px] text-sky-100/80 leading-snug">
                    IA : {shortRegimeDescription || "lecture neutre du marché."}
                  </p>
                </div>
              </div>

              <div className="mt-1 space-y-1">
                <div className="flex items-center justify-between gap-2 text-[11px] text-sky-100/80">
                  <span>{consensusLabel}</span>
                  <span className="flex items-center gap-1">
                    <span className="text-sky-200/90">
                      {Math.round(sourceConsensus)}/100
                    </span>
                    <span className="text-sky-200/60">consensus</span>
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-sky-950/80 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-400 via-emerald-400 to-lime-300 transition-all duration-600"
                    style={{ width: `${Math.max(6, sourceConsensus)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Régime de marché */}
            <div className="group rounded-3xl p-5 bg-gradient-to-br from-violet-900/45 via-violet-900/20 to-violet-600/10 border border-violet-500/35 shadow-[0_0_35px_rgba(76,29,149,0.9)] backdrop-blur-2xl flex flex-col justify-between min-w-0 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_0_55px_rgba(76,29,149,1)] hover:border-violet-400/70">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-violet-200">
                  Régime de marché (IA)
                </div>
                <div className="text-[11px] text-neutral-100">
                  Confiance :{" "}
                  <span className="font-semibold">
                    {marketRegime.confidence}/100
                  </span>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <div className="text-sm font-semibold text-emerald-300">
                  {marketRegime.label}
                </div>
                <p className="text-[12px] text-violet-50 leading-snug">
                  {marketRegime.description}
                </p>
              </div>
            </div>

            {/* Focus drivers */}
            <div className="group rounded-3xl p-5 bg-gradient-to-br from-emerald-900/45 via-emerald-900/20 to-emerald-600/10 border border-emerald-500/35 shadow-[0_0_35px_rgba(6,95,70,0.9)] backdrop-blur-2xl min-w-0 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_0_55px_rgba(6,95,70,1)] hover:border-emerald-400/70">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-200">
                  Focus drivers (IA)
                </div>
                {normalizedFocusDrivers.length > 0 && (
                  <div className="text-[11px] text-neutral-100">
                    {normalizedFocusDrivers.length} axes dominants
                  </div>
                )}
              </div>

              {normalizedFocusDrivers.length === 0 ? (
                <p className="mt-3 text-xs text-neutral-200">
                  L’IA ne détecte pas de driver dominant sur cette fenêtre :
                  le flux est réparti entre plusieurs thèmes.
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
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
                              className="h-full bg-gradient-to-r from-emerald-400 via-lime-400 to-amber-300 transition-all duration-600 group-hover:translate-x-[1px]"
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

          {/* Timeline historique bien visible */}
          <section className="space-y-4 pt-2 border-t border-neutral-900/80">
            <div className="flex items-center justify-between px-1">
              <div>
                <h2 className="text-[14px] font-semibold text-neutral-100">
                  Historique du sentiment
                </h2>
                <p className="text-[11px] text-neutral-400">
                  Vue du sentiment global et par classe d’actifs sur les
                  derniers rafraîchissements.
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-neutral-800/70 bg-neutral-950/90 backdrop-blur-2xl px-4 py-4 space-y-3">
              {!hasHistory ? (
                <div className="text-[11px] text-neutral-400">
                  La timeline se remplira automatiquement au fil des prochains
                  runs de collecte.
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-[11px] text-neutral-300 mb-1">
                    <span>Global</span>
                    <span>
                      Dernière valeur :{" "}
                      <span className={scoreToColor(globalScore)}>
                        {Math.round(globalScore)}/100
                      </span>
                    </span>
                  </div>

                  <div className="h-24 w-full relative overflow-hidden">
                    <svg
                      viewBox="0 0 100 40"
                      preserveAspectRatio="none"
                      className="absolute inset-x-0 top-0 h-18 w-full"
                    >
                      <defs>
                        <linearGradient
                          id="sentimentLine-global"
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

                      {/* fond léger */}
                      <rect
                        x="0"
                        y="0"
                        width="100"
                        height="40"
                        fill="url(#sentimentLine-global)"
                        fillOpacity={0.04}
                      />

                      {/* aire + ligne */}
                      <path
                        d={buildAreaPath(historyPoints, historyMinMax)}
                        fill="url(#sentimentLine-global)"
                        fillOpacity={0.18}
                      />
                      <path
                        d={buildLinePath(historyPoints, historyMinMax)}
                        fill="none"
                        stroke="url(#sentimentLine-global)"
                        strokeWidth={1.4}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* point live avec onde */}
                      {livePointCoords && (
                        <>
                          <circle
                            cx={livePointCoords.x}
                            cy={livePointCoords.y}
                            r={4}
                            className="fill-emerald-300/20 animate-ping"
                          />
                          <circle
                            cx={livePointCoords.x}
                            cy={livePointCoords.y}
                            r={1.8}
                            className="fill-emerald-300"
                          />
                        </>
                      )}
                    </svg>

                    {/* ticks de temps en dessous */}
                    <div className="absolute inset-x-0 bottom-0 h-6 text-[10px] text-neutral-500">
                      <div className="relative w-full h-full">
                        {timeTicks.map((t) => (
                          <div
                            key={`${t.x}-${t.label}`}
                            className="absolute top-0 -translate-x-1/2 flex flex-col items-center gap-0.5"
                            style={{ left: `${t.x}%` }}
                          >
                            <div className="h-[6px] w-px bg-neutral-700/70" />
                            <div className="whitespace-nowrap">
                              {t.label || "—"}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1">
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
                </>
              )}
            </div>

            {/* Mini séries par thème avec plus d'air */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <MiniHistoryCard
                title="Forex"
                history={historyPoints}
                accessor={(p) =>
                  typeof p.forexScore === "number" ? p.forexScore : undefined
                }
              />
              <MiniHistoryCard
                title="Actions"
                history={historyPoints}
                accessor={(p) =>
                  typeof p.stocksScore === "number" ? p.stocksScore : undefined
                }
              />
              <MiniHistoryCard
                title="Commodities"
                history={historyPoints}
                accessor={(p) =>
                  typeof p.commoditiesScore === "number"
                    ? p.commoditiesScore
                    : undefined
                }
              />
            </div>
          </section>

          {/* Ligne 2 : thèmes + indicateurs + idées, avec plus d'espace */}
          <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] min-w-0 pt-4 border-t border-neutral-900/80">
            {/* Thèmes + idées sentiment */}
            <div className="space-y-5 min-w-0">
              <div className="px-1 flex items-baseline justify-between">
                <div>
                  <h2 className="text-[15px] font-semibold text-neutral-100">
                    Sentiment par grand thème
                  </h2>
                  <p className="text-[11px] text-neutral-400">
                    Forex, actions et commodities – agrégés à partir de nos
                    flux, même logique que le radar de thèmes de la page News.
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-neutral-800/70 bg-neutral-950/88 backdrop-blur-2xl shadow-[0_0_25px_rgba(0,0,0,0.9)] p-5 space-y-4 min-w-0">
                {[forex, stocks, commodities]
                  .filter(Boolean)
                  .map((t) => {
                    const theme = t as SentimentTheme;
                    const width = Math.min(100, Math.max(0, theme.score));
                    const label = sentimentLabel(theme.score);

                    return (
                      <div
                        key={theme.id}
                        className="space-y-1.5 transition-all duration-250 hover:bg-neutral-900/70 rounded-2xl px-3 py-2"
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

              {suggestions && suggestions.length > 0 && (
                <div className="space-y-2">
                  <div className="px-1 flex items-baseline justify-between">
                    <h2 className="text-[15px] font-semibold text-neutral-100">
                      Idées de positionnement (IA)
                    </h2>
                    <span className="text-[11px] text-neutral-500">
                      Basées uniquement sur le sentiment agrégé.
                    </span>
                  </div>
                  <div className="rounded-3xl border border-neutral-800/70 bg-neutral-950/88 backdrop-blur-2xl shadow-[0_0_25px_rgba(0,0,0,0.9)] p-4 space-y-3">
                    {suggestions.slice(0, 3).map((s: SentimentSuggestion) => (
                      <div
                        key={s.id}
                        className="rounded-2xl px-3 py-3 bg-neutral-900/75 border border-neutral-700/70 flex flex-col gap-1.5 text-xs transition-all duration-250 hover:border-emerald-500/70 hover:bg-neutral-900 hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(34,197,94,0.35)]"
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

            {/* Indicateurs de risque plus aérés */}
            <div className="space-y-4 min-w-0">
              <div className="px-1">
                <h2 className="text-[15px] font-semibold text-neutral-100">
                  Indicateurs de risque
                </h2>
                <p className="text-[11px] text-neutral-400">
                  Volatilité perçue, balance bull/bear & dynamique du flux –
                  normalisés sur 0–100 pour compléter la lecture IA du régime
                  global.
                </p>
              </div>

              <div className="rounded-3xl border border-neutral-800/70 bg-neutral-950/88 backdrop-blur-2xl shadow-[0_0_25px_rgba(0,0,0,0.9)] p-5 space-y-3 min-w-0">
                {(!riskIndicators || riskIndicators.length === 0) && (
                  <div className="space-y-3">
                    <p className="text-[12px] text-neutral-300">
                      Les indicateurs chiffrés ne sont pas encore intégrés.
                      Pour l’instant, le risque est lu via la structure et
                      l’intensité du flux d’actualités.
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
                      className="space-y-1.5 transition-all duration-250 hover:bg-neutral-900/75 rounded-2xl px-3 py-2"
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
