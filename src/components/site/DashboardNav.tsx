"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/news", label: "News" },
  { href: "/dashboard/sentiment", label: "Sentiment" },
  { href: "/dashboard/macro", label: "Macro" },
  { href: "/dashboard/dotplots", label: "Dot Plots" },
  { href: "/dashboard/positioning", label: "Positioning" },
];

export default function DashboardNav() {
  const pathname = usePathname();
  return (
    <nav className="space-y-2">
      {ITEMS.map((it) => {
        const active = pathname === it.href;
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`block px-3 py-2 rounded-lg text-sm ${active ? "bg-white/5 text-primary" : "text-white/70 hover:text-primary hover:bg-white/5"}`}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
