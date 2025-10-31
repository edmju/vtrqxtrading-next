"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

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
        pathname === p.href
          ? "text-neon-yellow underline underline-offset-4"
          : "text-text-primary hover:text-neon-cyan"
      } transition-all duration-300`}
    >
      {p.label}
    </Link>
  );

  return (
    <>
      <header className="fixed top-0 left-0 w-full z-50 bg-black/30 backdrop-blur-md border-b border-yellow-700/20 shadow-yellow">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-16 px-6">
          <Link href="/" className="text-neon-yellow font-extrabold tracking-widest text-xl glow-text font-orbitron">
            VTRQX
          </Link>

          <nav className="flex items-center gap-4 font-inter">
            <LinkItem href="/dashboard" label="Dashboard" protected />
            <LinkItem href="/screener" label="Screener" protected />
            <LinkItem href="/alerts" label="Alerts" protected />
            <LinkItem href="/research" label="Research" protected />
            <LinkItem href="/subscription" label="Subscription" />
            <LinkItem href="/profile" label="Profile" />
          </nav>

          <div className="text-xs text-gray-400 min-w-[160px] text-right">
            {session?.user?.email ? (
              <span className="text-neon-cyan">{session.user.email}</span>
            ) : (
              <span className="text-gray-500 italic">Non connecté</span>
            )}
          </div>
        </div>
      </header>

      {notice && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 bg-neon-yellow text-black px-4 py-2 rounded-lg shadow-yellow z-50 animate-pulse">
          {notice}
        </div>
      )}
    </>
  );
}
