"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

const protectedPaths = ["/", "/dashboard", "/screener", "/alerts", "/research"];

export default function Header() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const usp = new URLSearchParams(window.location.search);
    const n = usp.get("notice");
    if (n === "login_required") setNotice("Vous devez vous connecter pour accéder à cette page.");
    if (n === "subscribe_required") setNotice("Abonnement requis pour accéder à cette page.");
    if (n) {
      usp.delete("notice");
      const url = `${window.location.pathname}${usp.toString() ? "?" + usp.toString() : ""}`;
      window.history.replaceState({}, "", url);
    }
  }, [pathname]);

  const handleProtectedClick: React.MouseEventHandler<HTMLAnchorElement> = (e) => {
    const hasSession = !!session?.user?.email;
    const hasSub = (session as any)?.user?.hasActiveSub === true;
    if (!hasSession) {
      e.preventDefault();
      setNotice("Vous devez vous connecter pour accéder à cette page.");
      router.push("/profile");
      return;
    }
    if (!hasSub) {
      e.preventDefault();
      setNotice("Abonnement requis pour accéder à cette page.");
      router.push("/subscription");
    }
  };

  const LinkItem = (p: { href: string; label: string; protected?: boolean }) => (
    <Link
      href={p.href}
      onClick={p.protected ? handleProtectedClick : undefined}
      className={`px-3 text-sm font-medium tracking-wide ${
        pathname === p.href ? "text-yellow-300 underline underline-offset-4" : "text-yellow-400 hover:text-yellow-200"
      } transition-all duration-200`}
    >
      {p.label}
    </Link>
  );

  return (
    <>
      <header className="w-full border-b border-yellow-700/20 bg-black/70 backdrop-blur-md fixed top-0 left-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-14 px-6">
          <Link href="/" className="text-yellow-400 font-extrabold tracking-widest text-xl">
            VTRQX
          </Link>

          <nav className="flex items-center gap-2">
            <LinkItem href="/dashboard" label="Dashboard" protected />
            <LinkItem href="/screener" label="Screener" protected />
            <LinkItem href="/alerts" label="Alerts" protected />
            <LinkItem href="/research" label="Research" protected />
            <LinkItem href="/subscription" label="Subscription" />
            <LinkItem href="/profile" label="Profile" />
          </nav>

          <div className="text-xs text-gray-400 min-w-[160px] text-right">
            {session?.user?.email ? (
              <span className="text-yellow-300">{session.user.email}</span>
            ) : (
              <span className="text-gray-500 italic">Non connecté</span>
            )}
          </div>
        </div>
      </header>

      {notice && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-yellow-500 to-red-500 text-black font-semibold px-6 py-3 rounded-full shadow-lg animate-fadeInOut border border-yellow-300/30">
          {notice}
        </div>
      )}
    </>
  );
}
