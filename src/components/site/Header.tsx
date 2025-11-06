"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Button from "@/components/ui/Button";
import { useSession } from "next-auth/react";
import { useLang } from "@/components/providers/LangProvider";

export default function Header() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { t } = useLang();

  const NAV = [
    { href: "/features", label: t("nav.features", "FEATURES") },
    { href: "/subscription", label: t("nav.pricing", "PRICING") },
    { href: "/about", label: t("nav.about", "ABOUT") },
  ];

  const ctaHref = session ? "/dashboard" : "/profile";
  const ctaLabel = session
    ? t("cta.open_terminal", "OPEN TERMINAL")
    : t("nav.signup", "SIGN UP");

  return (
    <header className="sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-5 py-4">
        <div className="neon-ring glass rounded-xl2 px-5 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-orbitron text-xl tracking-[0.2em] text-primary">VTRQX</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs text-white/80">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`hover:text-primary ${pathname === item.href ? "text-primary" : ""}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {/* Icône profil */}
            <Link href="/profile" aria-label="Profile" className="hidden sm:flex items-center">
              <span className="p-2 rounded-lg glass hover:ring-1 hover:ring-primary/40 transition">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M4 20c1.5-3.5 4.8-5.5 8-5.5s6.5 2 8 5.5" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </span>
            </Link>

            <Link href={ctaHref}>
              <Button>{ctaLabel}</Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
