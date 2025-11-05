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

  const authHref = session ? "/dashboard" : "/profile";
  const authLabel = session ? t("nav.dashboard", "DASHBOARD") : t("nav.signin", "SIGN IN");
  const ctaHref = session ? "/dashboard" : "/profile";
  const ctaLabel = session ? t("cta.open_terminal", "OPEN TERMINAL") : t("cta.get_started", "GET STARTED");

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
            <Link href={authHref} className="hidden sm:block text-sm text-white/80 hover:text-primary">
              {authLabel}
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
