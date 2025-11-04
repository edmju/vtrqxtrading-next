"use client";
import { useMemo } from "react";

export default function Sparkline({
  values,
  width = 240,
  height = 64,
}: {
  values: number[];
  width?: number;
  height?: number;
}) {
  const path = useMemo(() => {
    if (!values.length) return "";
    const max = Math.max(...values);
    const min = Math.min(...values);
    const sx = (i: number) => (i / (values.length - 1)) * width;
    const sy = (v: number) => height - ((v - min) / Math.max(1, max - min)) * height;
    return values.map((v, i) => `${i === 0 ? "M" : "L"} ${sx(i)} ${sy(v)}`).join(" ");
  }, [values, width, height]);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path d={path} fill="none" stroke="url(#g)" strokeWidth="2" />
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#22D3EE" />
          <stop offset="100%" stopColor="#FFD54A" />
        </linearGradient>
      </defs>
    </svg>
  );
}
