// path: src/components/terminal/Sidebar.tsx
// (Header gauche terminal — glossy, espacé, néon, actifs inchangés)
// Source d'origine: :contentReference[oaicite:4]{index=4}
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
    <aside className="relative">
      {/* Halo néon */}
      <div
        className="pointer-events-none absolute -inset-2 rounded-2xl blur-2xl opacity-40"
        style={{
          background:
            "radial-gradient(600px 120px at 20% 0%, rgba(34,211,238,0.15), transparent), radial-gradient(600px 120px at 80% 0%, rgba(139,92,246,0.15), transparent)",
        }}
      />
      <nav className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-neutral-900/60 via-neutral-900/40 to-neutral-900/20 backdrop-blur-xl shadow-[0_0_40px_rgba(0,0,0,0.6)] p-3">
        <div className="px-2 py-1 text-[10px] tracking-[.18em] uppercase text-white/50">Market Desk</div>
        <ul className="mt-1 space-y-2">
          {ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={[
                    "group flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl transition",
                    "border",
                    active
                      ? "border-cyan/40 bg-cyan/10 ring-1 ring-cyan/40 shadow-[0_0_20px_rgba(34,211,238,0.25)]"
                      : "border-white/5 hover:border-white/15 hover:bg-white/5",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={active ? "text-cyan" : "text-white/80"}>
                      <Icon />
                    </span>
                    <span className={`text-sm truncate ${active ? "text-cyan" : "text-white/85"}`}>{label}</span>
                  </div>
                  <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-cyan shadow-[0_0_10px_rgba(34,211,238,0.9)]" : "bg-white/20 group-hover:bg-white/40"}`} />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

function NewsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7 8h8M7 12h10M7 16h6" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
function RadarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 12l5-5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  );
}
function TimelineIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M4 7h6M14 7h6M4 12h10M4 17h14" stroke="currentColor" strokeWidth="1.6" />
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
      <path d="M12 3v18M3 12h18" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
  );
}
