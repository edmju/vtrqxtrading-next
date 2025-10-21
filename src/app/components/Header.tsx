"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

const links = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Screener", href: "/screener" },
  { name: "Alerts", href: "/alerts" },
  { name: "Research", href: "/research" },
  { name: "Subscription", href: "/subscription" },
  { name: "Profile", href: "/profile" },
  { name: "Admin", href: "/admin" },
];

export default function Header() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [notice, setNotice] = useState("");

  function handleClick(e: any, href: string) {
    e.preventDefault();
    if (
      href === "/subscription" ||
      href === "/profile" ||
      href === "/" ||
      href === ""
    ) {
      window.location.href = href;
      return;
    }
    // bloque accès
    setNotice("🚫 Vous devez être abonné pour accéder à cette page.");
    setTimeout(() => setNotice(""), 3000);
  }

  return (
    <header className="fixed top-0 left-0 right-0 bg-black/80 backdrop-blur-md border-b border-yellow-500/30 z-50">
      <nav className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3">
        <Link href="/" className="text-2xl font-bold text-yellow-400">
          VTRQX
        </Link>
        <ul className="flex items-center space-x-6 text-gray-300">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                onClick={(e) => handleClick(e, l.href)}
                className={`hover:text-yellow-400 transition ${
                  pathname === l.href ? "text-yellow-400" : ""
                }`}
              >
                {l.name}
              </a>
            </li>
          ))}
          {session?.user?.email ? (
            <>
              <li className="text-xs text-gray-400 hidden sm:block">
                ({session.user.email})
              </li>
              <li>
                <button
                  onClick={() => signOut({ callbackUrl: "/profile" })}
                  className="px-3 py-1 rounded bg-neutral-800 border border-neutral-700 hover:bg-neutral-700"
                >
                  Se déconnecter
                </button>
              </li>
            </>
          ) : null}
        </ul>
      </nav>

      {notice && (
        <div className="absolute top-full left-0 right-0 bg-yellow-600 text-black text-center py-2 text-sm font-semibold animate-pulse">
          {notice}
        </div>
      )}
    </header>
  );
}
