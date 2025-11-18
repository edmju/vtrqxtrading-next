// src/components/charts/NeonAreaChart.tsx
"use client";

import type { FC } from "react";

export type NeonAreaPoint = { t: string; v: number };

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

type Props = {
  points: NeonAreaPoint[];
  height?: number;
  showTicks?: boolean;
};

const NeonAreaChart: FC<Props> = ({ points, height = 200, showTicks = true }) => {
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
};

export default NeonAreaChart;
