// src/app/(terminal)/dashboard/sentiment/SentimentClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  SentimentSnapshot,
  SentimentTheme,
  RiskIndicator,
  FocusDriver,
  SentimentHistoryPoint,
  SentimentSuggestion,
} from "./page";

/* -------------------------------------------------------------------------- */
/* Helpers UI                                                                 */
/* -------------------------------------------------------------------------- */

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

function badgeForBias(bias: SentimentSuggestion["bias"]) {
  if (bias === "long")
    return "border-emerald-500/60 text-emerald-300 bg-emerald-500/10";
  if (bias === "short")
    return "border-red-500/60 text-red-300 bg-red-500/10";
  return "border-neutral-600 text-neutral-300 bg-neutral-800/60";
}

/* -------------------------------------------------------------------------- */
/* Chart primitives                                                           */
/* -------------------------------------------------------------------------- */

type SparkRange = { min: number; max: number };

function project(score: number, i: number, n: number, range: SparkRange) {
  const span = Math.max(1, range.max - range.min);
  const x = n === 1 ? 50 : (i * 100) / (n - 1);
  const y = 40 - ((score - range.min) / span) * 30 - 5;
  return { x, y };
}

function buildLine(points: number[], range: SparkRange) {
  if (!points.length) return "";
  const n = points.length;
  let d = `M ${project(points[0], 0, n, range).x} ${
    project(points[0], 0, n, range).y
  }`;
  for (let i = 1; i < n; i++) {
    const p = project(points[i], i, n, range);
    d += ` L ${p.x} ${p.y}`;
  }
  return d;
}

function buildArea(points: number[], range: SparkRange) {
  if (!points.length) return "";
  const n = points.length;
  const baseY = 40;
  const startX = n === 1 ? 50 : 0;
  let d = `M ${startX} ${baseY} L ${project(points[0], 0, n, range).x} ${
    project(points[0], 0, n, range).y
  }`;
  for (let i = 1; i < n; i++) {
    const p = project(points[i], i, n, range);
    d += ` L ${p.x} ${p.y}`;
  }
  const last = project(points[n - 1], n - 1, n, range);
  d += ` L ${last.x} ${baseY} Z`;
  return d;
}

function buildTicks(ts: string[], maxTicks = 6) {
  if (!ts.length) return [];
  const n = ts.length;
  const idx =
    n <= maxTicks
      ? Array.from({ length: n }, (_, i) => i)
      : [
          0,
          Math.floor(n / 5),
          Math.floor((2 * n) / 5),
          Math.floor((3 * n) / 5),
          Math.floor((4 * n) / 5),
          n - 1,
        ];
  const multiDay =
    new Date(ts[0]).toDateString() !== new Date(ts[n - 1]).toDateString();
  return idx.map((i) => {
    const x = n === 1 ? 50 : (i * 100) / (n - 1);
    const d = new Date(ts[i]);
    const label = multiDay
      ? d.toLocaleString(undefined, {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      : d.toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
    return { x, label };
  });
}

/* -------------------------------------------------------------------------- */
/* Neon line chart                                                            */
/* -------------------------------------------------------------------------- */

function NeonLineChart({
  points,
  height = 200,
  showTicks = true,
}: {
  points: { t: string; v: number }[];
  height?: number;
  showTicks?: boolean;
}) {
  if (!points?.length) {
    return (
      <div className="h-[200px] w-full rounded-3xl border border-neutral-800/70 bg-neutral-950/90 backdrop-blur-2xl flex items-center justify-center text-[11px] text-neutral-500">
        Historique en construction…
      </div>
    );
  }

  const values = points.map((p) => p.v);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min = Math.max(0, min - 5);
    max = Math.min(100, max + 5);
  }
  const range = { min, max };

  const area = buildArea(values, range);
  const line = buildLine(values, range);
  const n = points.length;
  const last = points[n - 1];
  const lastProj = project(last.v, n - 1, n, range);

  return (
    <div className="relative w-full" style={{ height }}>
      <svg
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        <defs>
          <linearGradient id="nlc-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25" />
            <stop offset="70%" stopColor="#22d3ee" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="nlc-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="50%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
          <filter id="nlc-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.8" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* fond + grille */}
        <rect
          x="0"
          y="0"
          width="100"
          height="40"
          fill="url(#nlc-area)"
          opacity="0.25"
        />
        {[0, 10, 20, 30, 40].map((y) => (
          <line
            key={y}
            x1="0"
            x2="100"
            y1={y}
            y2={y}
            stroke="rgba(148,163,184,0.15)"
            strokeWidth="0.25"
          />
        ))}

        {/* aire + ligne néon */}
        <path d={area} fill="url(#nlc-area)" opacity="0.55" />
        <path
          d={line}
          fill="none"
          stroke="url(#nlc-line)"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#nlc-glow)"
        />

        {/* point live + ripple */}
        <circle cx={lastProj.x} cy={lastProj.y} r="2.6" fill="#22d3ee" />
        <circle cx={lastProj.x} cy={lastProj.y} r="7" fill="#22d3ee" opacity="0.18">
          <animate
            attributeName="r"
            values="6;10;6"
            dur="2s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.25;0;0.25"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>
      </svg>

      {showTicks && (
        <div className="absolute inset-x-0 bottom-0 h-6 text-[10px] text-neutral-500">
          <div className="relative w-full h-full">
            {buildTicks(points.map((p) => p.t), 6).map((t) => (
              <div
                key={`${t.x}-${t.label}`}
                className="absolute top-0 -translate-x-1/2 flex flex-col items-center gap-0.5"
                style={{ left: `${t.x}%` }}
              >
                <div className="h-[6px] w-px bg-neutral-700/70" />
                <div className="whitespace-nowrap">{t.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Mini charts                                                                */
/* -------------------------------------------------------------------------- */

function MiniNeon({
  title,
  history,
  pick,
}: {
  title: string;
  history: SentimentHistoryPoint[];
  pick: (p: SentimentHistoryPoint) => number | undefined;
}) {
  const pts = useMemo(() => {
    if (!history?.length) return [];
    return history.map((h) => ({
      t: h.timestamp,
      v:
        typeof pick(h) === "number"
          ? (pick(h) as number)
          : h.globalScore,
    }));
  }, [history, pick]);

  return (
    <div className="rounded-3xl border border-neutral-800/70 bg-neutral-950/85 backdrop-blur-2xl px-3 py-3 space-y-1.5">
      <div className="flex items-center justify-between text-[11px] text-neutral-300">
        <span>{title}</span>
        <span>{pts.length ? Math.round(pts[pts.length - 1].v) : "—"}/100</span>
      </div>
      <NeonLineChart points={pts} height={90} showTicks={false} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Main page                                                                  */
/* -------------------------------------------------------------------------- */

type Props = { snapshot: SentimentSnapshot };

export default function SentimentClient({ snapshot }: Props) {
  const [windowSel, setWindowSel] = useState<"24h" | "72h" | "7j" | "all">(
    "all"
  );

  const {
    globalScore,
    marketRegime,
    themes,
    riskIndicators,
    focusDrivers,
    history: snapshotHistory,
    suggestions,
  } = snapshot;

  // Historique en state local (on part de snapshot.history si présent)
  const [history, setHistory] = useState<SentimentHistoryPoint[]>(
    snapshotHistory ?? []
  );

  // Fetch client-side de tout history.json (évite le cache, et prend le gros fichier)
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const v = encodeURIComponent(snapshot.generatedAt ?? "");
        const res = await fetch(`/data/sentiment/history.json?v=${v}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const json = await res.json();
        if (!Array.isArray(json)) return;
        const cleaned = json.filter(
          (h: any) => h && typeof h.globalScore === "number"
        ) as SentimentHistoryPoint[];
        if (!cancelled) {
          setHistory(cleaned);
        }
      } catch (e) {
        console.error("[sentiment] failed to load client history", e);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [snapshot.generatedAt]);

  const themeMap = useMemo(() => {
    const m: Record<string, SentimentTheme> = {};
    themes.forEach((t) => (m[t.id] = t));
    return m;
  }, [themes]);

  const forex = themeMap.forex;
  const stocks = themeMap.stocks;
  const commodities = themeMap.commodities;

  const sourcesPresent = !!(snapshot.sources && snapshot.sources.length);

  const fullHistory = useMemo<SentimentHistoryPoint[]>(
    () => history,
    [history]
  );

  const windowedHistory = useMemo(() => {
    if (!fullHistory.length) return [];
    const map = {
      "24h": 24,
      "72h": 72,
      "7j": 7 * 24,
      all: Number.MAX_SAFE_INTEGER,
    } as const;
    return fullHistory.slice(-map[windowSel]);
  }, [fullHistory, windowSel]);

  const globalSeries = windowedHistory.map((h) => ({
    t: h.timestamp,
    v: h.globalScore,
  }));

  const formattedDate = snapshot.generatedAt
    ? new Date(snapshot.generatedAt).toLocaleString(undefined, {
        hour12: false,
      })
    : "—";
  const globalConfidence =
    snapshot.globalConfidence ?? marketRegime.confidence;
  const consensus = snapshot.sourceConsensus ?? 50;

  const drivers = (focusDrivers || []).map((d) => {
    const w = d?.weight && d.weight >= 1 && d.weight <= 3 ? d.weight : 1;
    return { ...d, weight: w, widthPct: Math.round((w / 3) * 100) };
  });

  return (
    <main className="py-10 w-full overflow-x-hidden">
      <div className="rounded-3xl border border-neutral-800/60 bg-gradient-to-b from-neutral-950/90 via-neutral-950/80 to-neutral-950/90 shadow-[0_0_60px_rgba(0,0,0,0.85)] backdrop-blur-xl">
        <div className="p-8 lg:p-10 space-y-10">
          {/* HEADER */}
          <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
            <div className="space-y-1.5">
              <h1 className="text-3xl font-semibold text-neutral-50 tracking-tight">
                Sentiment de marché (vue IA)
              </h1>
              <p className="text-sm text-neutral-400">
                Lecture multi-actifs construite à partir de nos flux
                d’actualités : forex, actions, commodities & régime global.
              </p>
            </div>
            <div className="flex flex-col items-start md:items-end gap-1 text-[12px]">
              <div className="text-neutral-400">
                Dernière mise à jour :{" "}
                <span className="text-neutral-200">{formattedDate}</span>
              </div>
              {sourcesPresent && (
                <div className="flex flex-wrap items-center gap-2 text-neutral-400">
                  <span className="px-2 py-0.5 rounded-full bg-neutral-900/70 border border-neutral-700/70 text-[10px] text-neutral-100 uppercase tracking-wide">
                    Flux multi-sources : forex · actions · commodities
                  </span>
                  <span className="text-neutral-500">
                    issus de nos sources de marché
                  </span>
                </div>
              )}
            </div>
          </header>

          {/* LIGNE 1 : Global / Régime / Drivers */}
          <section className="grid gap-8 md:grid-cols-3">
            {/* Global */}
            <div className="group rounded-3xl p-6 bg-gradient-to-br from-sky-900/50 via-sky-900/15 to-sky-600/10 border border-sky-500/35 shadow-[0_0_35px_rgba(8,47,73,0.9)] backdrop-blur-2xl transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_0_55px_rgba(8,47,73,1)] hover:border-sky-400/70">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-sky-200/90">
                  Global sentiment score
                </div>
                <span className="px-2 py-0.5 rounded-full bg-sky-900/80 border border-sky-400/60 text-sky-100 shadow-[0_0_10px_rgba(56,189,248,0.4)]">
                  Confiance IA :{" "}
                  <span className="font-semibold">
                    {Math.round(globalConfidence)}/100
                  </span>
                </span>
              </div>

              <div className="mt-4 flex items-center gap-6">
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

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-sky-50 leading-snug">
                    Score agrégé{" "}
                    <span className={scoreToColor(globalScore)}>
                      {Math.round(globalScore)}/100
                    </span>{" "}
                    calculé à partir de nos flux multi-sources.
                  </p>
                  <p className="text-[11px] text-sky-100/80 leading-snug">
                    IA :{" "}
                    {(marketRegime?.description || "").split(/[.\n]/)[0] ||
                      "lecture neutre."}
                  </p>
                </div>
              </div>

              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-between text-[11px] text-sky-100/80">
                  <span>
                    {(snapshot.sourceConsensus ?? 50) >= 70
                      ? "Sources très alignées"
                      : (snapshot.sourceConsensus ?? 50) >= 55
                      ? "Consensus correct"
                      : (snapshot.sourceConsensus ?? 50) >= 40
                      ? "Lecture mitigée"
                      : "Sources divergentes"}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-sky-200/90">
                      {Math.round(consensus)}/100
                    </span>
                    <span className="text-sky-200/60">consensus</span>
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-sky-950/80 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-400 via-emerald-400 to-lime-300 transition-all duration-600"
                    style={{ width: `${Math.max(6, consensus)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Régime */}
            <div className="group rounded-3xl p-6 bg-gradient-to-br from-violet-900/45 via-violet-900/20 to-violet-600/10 border border-violet-500/35 shadow-[0_0_35px_rgba(76,29,149,0.9)] backdrop-blur-2xl transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_0_55px_rgba(76,29,149,1)] hover:border-violet-400/70">
              <div className="flex items-center justify-between">
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
              <div className="mt-3 space-y-3">
                <div className="text-sm font-semibold text-emerald-300">
                  {marketRegime.label}
                </div>
                <p className="text-[12px] text-violet-50 leading-snug">
                  {marketRegime.description}
                </p>
                <div className="mt-1">
                  <div className="flex items-center justify-between text-[10px] text-neutral-300 mb-1">
                    <span>Risk-off</span>
                    <span>Neutre</span>
                    <span>Risk-on</span>
                  </div>
                  <div className="relative h-3 rounded-full bg-gradient-to-r from-rose-500/30 via-amber-400/20 to-emerald-500/30 border border-violet-400/30 overflow-hidden">
                    <div className="absolute inset-y-0 left-1/2 w-px bg-violet-400/30" />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.8)] animate-pulse"
                      style={{
                        left: `calc(${Math.max(
                          0,
                          Math.min(100, globalScore)
                        )}% - 5px)`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Drivers */}
            <div className="group rounded-3xl p-6 bg-gradient-to-br from-emerald-900/45 via-emerald-900/20 to-emerald-600/10 border border-emerald-500/35 shadow-[0_0_35px_rgba(6,95,70,0.9)] backdrop-blur-2xl transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_0_55px_rgba(6,95,70,1)] hover:border-emerald-400/70">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-200">
                  Focus drivers (IA)
                </div>
                {drivers.length > 0 && (
                  <div className="text-[11px] text-neutral-100">
                    {drivers.length} axes
                  </div>
                )}
              </div>
              {drivers.length === 0 ? (
                <p className="mt-3 text-xs text-neutral-200">
                  Pas de driver dominant détecté.
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {drivers.map((d) => (
                    <li key={d.label} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-neutral-50 truncate">
                          {d.label}
                        </span>
                        <span className="px-1.5 py-0.5 rounded-md bg-neutral-900/70 border border-neutral-700/70 text-neutral-200">
                          Poids {d.weight}/3
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-neutral-900 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-400 via-lime-400 to-amber-300 transition-all duration-600"
                          style={{ width: `${Math.max(10, d.widthPct)}%` }}
                        />
                      </div>
                      {d.description && (
                        <p className="text-[11px] text-neutral-100 leading-snug">
                          {d.description}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* HISTORIQUE */}
          <section className="space-y-4 pt-2 border-t border-neutral-900/80">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[14px] font-semibold text-neutral-100">
                  Historique du sentiment
                </h2>
                <p className="text-[11px] text-neutral-400">
                  Sentiment global et par classe d’actifs sur la fenêtre
                  sélectionnée.
                </p>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                {(["24h", "72h", "7j", "all"] as const).map((k) => (
                  <button
                    key={k}
                    onClick={() => setWindowSel(k)}
                    className={`px-2 py-1 rounded-full border transition ${
                      windowSel === k
                        ? "border-emerald-500/60 text-emerald-300 bg-emerald-500/10"
                        : "border-neutral-700/70 text-neutral-300 hover:border-neutral-500/70"
                    }`}
                  >
                    {k === "all" ? "Tout" : k}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-neutral-800/70 bg-neutral-950/90 backdrop-blur-2xl px-4 py-6">
              <div className="flex items-center justify-between text-[11px] text-neutral-300 mb-2">
                <span>Global</span>
                <span>
                  Dernière valeur :{" "}
                  <span className={scoreToColor(globalScore)}>
                    {Math.round(globalScore)}/100
                  </span>
                </span>
              </div>
              <NeonLineChart points={globalSeries} height={200} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <MiniNeon
                title="Forex"
                history={windowedHistory}
                pick={(p) => p.forexScore}
              />
              <MiniNeon
                title="Actions"
                history={windowedHistory}
                pick={(p) => p.stocksScore}
              />
              <MiniNeon
                title="Commodities"
                history={windowedHistory}
                pick={(p) => p.commoditiesScore}
              />
            </div>
          </section>

          {/* THEMES + INDICATEURS + IDÉES */}
          <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] pt-6 border-t border-neutral-900/80">
            {/* Thèmes */}
            <div className="space-y-5">
              <div>
                <h2 className="text-[15px] font-semibold text-neutral-100">
                  Sentiment par grand thème
                </h2>
                <p className="text-[11px] text-neutral-400">
                  Forex, actions et commodities – agrégés depuis nos flux.
                </p>
              </div>

              <div className="rounded-3xl border border-neutral-800/70 bg-neutral-950/88 backdrop-blur-2xl shadow-[0_0_25px_rgba(0,0,0,0.9)] p-5 space-y-4">
                {[forex, stocks, commodities]
                  .filter(Boolean)
                  .map((t) => {
                    const theme = t as SentimentTheme;
                    const width = Math.max(0, Math.min(100, theme.score));
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
                            className={`text-[11px] font-medium ${scoreToColor(
                              theme.score
                            )}`}
                          >
                            {Math.round(theme.score)}/100
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-neutral-900 overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${barBg(
                              theme.score
                            )}`}
                            style={{ width: `${width}%` }}
                          />
                        </div>
                        {theme.comment && (
                          <div className="text-[11px] text-neutral-300">
                            {theme.comment}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>

              {suggestions?.length ? (
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <h2 className="text-[15px] font-semibold text-neutral-100">
                      Idées de positionnement (IA)
                    </h2>
                    <span className="text-[11px] text-neutral-500">
                      Basées uniquement sur le sentiment agrégé.
                    </span>
                  </div>
                  <div className="rounded-3xl border border-neutral-800/70 bg-neutral-950/88 backdrop-blur-2xl p-4 space-y-3">
                    {suggestions.slice(0, 3).map((s) => (
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
                              className={`px-2 py-0.5 rounded-full text-[11px] border ${badgeForBias(
                                s.bias
                              )}`}
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
              ) : null}
            </div>

            {/* Indicateurs */}
            <div className="space-y-4">
              <div>
                <h2 className="text-[15px] font-semibold text-neutral-100">
                  Indicateurs de risque
                </h2>
                <p className="text-[11px] text-neutral-400">
                  Volatilité perçue, balance bull/bear & dynamique du flux.
                </p>
              </div>
              <div className="rounded-3xl border border-neutral-800/70 bg-neutral-950/88 backdrop-blur-2xl p-5 space-y-3">
                {(riskIndicators || []).map((ind: RiskIndicator) => {
                  const dir =
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
                            {ind.value ?? "—"} · {dir}
                          </span>
                        </div>
                        <span
                          className={`text-[11px] font-medium ${scoreToColor(
                            ind.score
                          )}`}
                        >
                          {Math.round(ind.score)}/100
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-neutral-900 overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${barBg(
                            ind.score
                          )}`}
                          style={{
                            width: `${Math.max(
                              0,
                              Math.min(100, ind.score)
                            )}%`,
                          }}
                        />
                      </div>
                      {ind.comment && (
                        <div className="text-[11px] text-neutral-300">
                          {ind.comment}
                        </div>
                      )}
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
