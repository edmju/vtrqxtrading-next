"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/components/providers/LangProvider";

const ITEMS = [
  { href: "/dashboard", key: "overview" },
  { href: "/dashboard/news", key: "news" },
  { href: "/dashboard/sentiment", key: "sentiment" },
  { href: "/dashboard/macro", key: "macro" },
  { href: "/dashboard/dotplots", key: "dotplots" },
  { href: "/dashboard/positioning", key: "positioning" },
];

export default function DashboardNav() {
  const pathname = usePathname();
  const { t } = useLang();
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
            {t(`dashboard.nav.${it.key}`)}
          </Link>
        );
      })}
    </nav>
  );
}
