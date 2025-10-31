"use client";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function Header() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (notice) setTimeout(() => setNotice(null), 3000);
  }, [notice]);

  return (
    <>
      <header className="fixed top-0 w-full z-50 bg-black/50 backdrop-blur-md border-b border-neon-cyan/20 shadow-glow">
        <div className="max-w-6xl mx-auto flex justify-between items-center h-16 px-6">
          <Link href="/" className="font-orbitron text-2xl font-extrabold gradient-text">VTRQX</Link>
          <nav className="flex gap-5 text-sm font-medium font-inter">
            {[
              { href: "/dashboard", label: "Dashboard" },
              { href: "/screener", label: "Screener" },
              { href: "/alerts", label: "Alerts" },
              { href: "/research", label: "Research" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`transition-all ${
                  pathname === l.href
                    ? "text-neon-cyan border-b-2 border-neon-cyan"
                    : "text-text-main hover:text-neon-yellow"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="text-xs font-inter text-text-dim min-w-[160px] text-right">
            {session?.user?.email ? (
              <span className="text-neon-yellow">{session.user.email}</span>
            ) : (
              <Link href="/profile" className="text-neon-cyan hover:text-neon-yellow">Connexion</Link>
            )}
          </div>
        </div>
      </header>

      {notice && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 bg-neon-yellow text-black px-4 py-2 rounded-lg shadow-yellow z-50 animate-float">
          {notice}
        </div>
      )}
    </>
  );
}
