"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";

/**
 * Petit chart SVG réactif, sans dépendance.
 * - Aire lissée (bezier), grille, tooltip, glow néon.
 * - Responsive via viewBox, évite tout CSS global.
 */

export type Point = { x: number; y: number };

type Props = {
  data: Point[];
  height?: number;             // px du viewBox (largeur fixe 800)
  min?: number | null;         // borne min Y (auto si null)
  max?: number | null;         // borne max Y (auto si null)
  accent?: "yellow" | "cyan" | "blue";
  className?: string;
  smooth?: boolean;
  showGrid?: boolean;
  unit?: string;               // suffixe de valeur (ex: "/100")
  formatX?: (x: number) => string;
  formatY?: (y: number) => string;
};

const W = 800;

export default function NeonAreaChart({
  data,
  height = 240,
  min = null,
  max = null,
  accent = "cyan",
  className,
  smooth = true,
  showGrid = true,
  unit = "",
  formatX,
  formatY,
}: Props) {
  const H = height;
  const box = `${W} ${H}`;
  const pad = 16;

  const xs = data.map((d) => d.x);
  const ys = data.map((d) => d.y);
  const xmin = xs.length ? Math.min(...xs) : 0;
  const xmax = xs.length ? Math.max(...xs) : 1;
  const ymin = min ?? (ys.length ? Math.min(...ys) : 0);
  const ymax = max ?? (ys.length ? Math.max(...ys) : 1);
  const xr = Math.max(1, xmax - xmin);
  const yr = Math.max(1, ymax - ymin);

  const sx = (x: number) =>
    pad + ((x - xmin) / xr) * (W - pad * 2);
  const sy = (y: number) =>
    H - pad - ((y - ymin) / yr) * (H - pad * 2);

  // Path lissé (Bezier) ou polyline
  const d = useMemo(() => {
    if (data.length === 0) return "";
    if (!smooth || data.length < 3) {
      return `M ${sx(data[0].x)},${sy(data[0].y)} ` + data.slice(1).map(p => `L ${sx(p.x)},${sy(p.y)}`).join(" ");
    }
    const pts = data.map(p => [sx(p.x), sy(p.y)]);
    let path = `M ${pts[0][0]},${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      const xm = (x0 + x1) / 2;
      path += ` Q ${x0},${y0} ${xm},${(y0 + y1) / 2}`;
      path += ` T ${x1},${y1}`;
    }
    return path;
  }, [data, smooth, xmin, xmax, ymin, ymax]);

  // Aire fermée pour le fill
  const dArea = d
    ? d +
      ` L ${sx(xmax)},${sy(ymin)} L ${sx(xmin)},${sy(ymin)} Z`
    : "";

  // Tooltip
  const ref = useRef<SVGSVGElement | null>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [hover, setHover] = useState<{ x: number; y: number; px: number; py: number } | null>(null);

  useEffect(() => {
    if (hoverX == null || !data.length) {
      setHover(null);
      return;
    }
    // Cherche le point le plus proche
    const left = data.reduce((a, b) => (Math.abs(a.x - hoverX) < Math.abs(b.x - hoverX) ? a : b));
    setHover({ x: left.x, y: left.y, px: sx(left.x), py: sy(left.y) });
  }, [hoverX, data]);

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const px = e.clientX - r.left;
    // convertit px -> x (inverse de sx)
    const t = (px - pad) / (W - pad * 2);
    const x = xmin + t * xr;
    setHoverX(x);
  };

  const onLeave = () => setHoverX(null);

  const palette = {
    yellow: { stroke: "#FFD54A", fill: "url(#grad-yellow)", glow: "url(#glow-yellow)" },
    cyan:   { stroke: "#22D3EE", fill: "url(#grad-cyan)",   glow: "url(#glow-cyan)"   },
    blue:   { stroke: "#3B82F6", fill: "url(#grad-blue)",   glow: "url(#glow-blue)"   },
  }[accent];

  const grid = useMemo(() => {
    if (!showGrid) return [];
    const lines: number[] = [];
    const steps = 4;
    for (let i = 1; i < steps; i++) lines.push(pad + (i / steps) * (H - pad * 2));
    return lines;
  }, [H, showGrid]);

  const fmtX = formatX ?? ((x: number) => new Date(x).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  const fmtY = formatY ?? ((y: number) => `${Math.round(y)}${unit}`);

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${box}`}
      className={className}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      role="img"
      aria-label="chart"
    >
      <defs>
        <linearGradient id="grad-cyan" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#22D3EE" stopOpacity="0.00" />
        </linearGradient>
        <linearGradient id="grad-yellow" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#FFD54A" stopOpacity="0.38" />
          <stop offset="100%" stopColor="#FFD54A" stopOpacity="0.00" />
        </linearGradient>
        <linearGradient id="grad-blue" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.30" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.00" />
        </linearGradient>

        <filter id="glow-cyan">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="glow-yellow">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="glow-blue">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Grille */}
      {grid.map((y, i) => (
        <line key={i} x1={pad} x2={W - pad} y1={y} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 6" />
      ))}

      {/* Aire */}
      {dArea && <path d={dArea} fill={palette.fill} />}

      {/* Courbe */}
      {d && (
        <path
          d={d}
          fill="none"
          stroke={palette.stroke}
          strokeWidth={2}
          filter={palette.glow}
          style={{ paintOrder: "stroke" }}
        />
      )}

      {/* Hover / Tooltip */}
      {hover && (
        <>
          <line x1={hover.px} x2={hover.px} y1={pad} y2={H - pad} stroke="rgba(255,255,255,0.08)" />
          <circle cx={hover.px} cy={hover.py} r={5} fill={palette.stroke} />
          <g transform={`translate(${Math.min(W - 180, Math.max(24, hover.px + 8))}, ${Math.max(36, hover.py - 24)})`}>
            <rect width="160" height="40" rx="8" fill="rgba(6,10,14,0.9)" stroke="rgba(255,255,255,0.08)" />
            <text x="10" y="18" fill="#fff" fontSize="12" fontFamily="ui-sans-serif, system-ui">
              {fmtX(hover.x)}
            </text>
            <text x="10" y="34" fill="#FFD54A" fontSize="12" fontFamily="ui-sans-serif, system-ui">
              {fmtY(hover.y)}
            </text>
          </g>
        </>
      )}
    </svg>
  );
}
