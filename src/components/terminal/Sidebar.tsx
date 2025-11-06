// src/components/terminal/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/dashboard/news", label: "News", icon: NewsIcon },
  { href: "/dashboard/sentiment", label: "Sentiment", icon: RadarIcon },
  { href: "/dashboard/macro", label: "Macro", icon: TimelineIcon },
  { href: "/dashboard/dotplots", label: "Dot Plots", icon: DotsIcon },
  { href: "/dashboard/positioning", label: "Positioning", icon: PositionIcon },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <nav className="terminal-glass rounded-xl p-3">
      <ul className="space-y-1">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition
                ${active ? "bg-white/10 ring-1 ring-primary/40" : "hover:bg-white/5"}`}
              >
                <Icon />
                <span className="text-sm">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function NewsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 8h8M7 12h10M7 16h6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
function RadarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 12l5-5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  );
}
function TimelineIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M4 7h6M14 7h6M4 12h10M4 17h14" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  );
}
function DotsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="6" cy="12" r="2" fill="currentColor" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      <circle cx="18" cy="12" r="2" fill="currentColor" />
    </svg>
  );
}
function PositionIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 3v18M3 12h18" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
  );
}
