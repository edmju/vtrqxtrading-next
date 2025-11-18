// path: src/components/site/Header.tsx
// (Header site public — glossy/glassy/néon, CTA & nav conservés)
// Source d'origine: :contentReference[oaicite:5]{index=5}
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

  const ctaHref = session ? "/boot" : "/profile";
  const ctaLabel = session ? t("cta.open_terminal", "OPEN TERMINAL") : t("nav.signup", "SIGN UP");

  return (
    <header className="sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-5 py-4">
        <div className="relative rounded-2xl border border-white/10 bg-gradient-to-r from-neutral-900/60 via-neutral-900/40 to-neutral-900/20 backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.6)] px-5 py-3">
          {/* halo */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-1 rounded-2xl blur-2xl opacity-50"
            style={{
              background:
                "radial-gradient(600px 200px at 10% -20%, rgba(255,213,74,0.2), transparent), radial-gradient(600px 200px at 100% 0%, rgba(34,211,238,0.2), transparent)",
            }}
          />
          <div className="relative flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="font-orbitron text-xl tracking-[0.2em] text-primary drop-shadow-[0_0_12px_rgba(255,213,74,0.35)]">VTRQX</span>
            </Link>

            <nav className="hidden md:flex items-center gap-8 text-xs text-white/80">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className={`hover:text-primary transition ${pathname === item.href ? "text-primary" : ""}`}>
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <Link href="/profile" aria-label="Profile" className="hidden sm:flex items-center">
                <span className="p-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition">
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
      </div>
    </header>
  );
}
