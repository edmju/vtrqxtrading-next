"use client";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/features", label: "FEATURES" },
  { href: "/subscription", label: "PRICING" },
  { href: "/about", label: "ABOUT" },
];

export default function Header() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-5 py-4">
        <div className="neon-ring glass rounded-xl2 px-5 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-[var(--font-orbitron)] text-xl tracking-[0.2em] text-primary">VTRQX</span>
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
            <Link href="/profile" className="hidden sm:block text-sm text-white/80 hover:text-primary">SIGN IN</Link>
            <Link href="/profile">
              <Button>GET STARTED</Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
