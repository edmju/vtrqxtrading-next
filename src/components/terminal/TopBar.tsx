"use client";

import Link from "next/link";
import { useLang } from "@/components/providers/LangProvider";

export default function TopBar() {
  const { t } = useLang();
  return (
    <div className="fixed top-0 inset-x-0 z-50">
      <div className="mx-auto max-w-[1400px] px-4 py-3">
        <div className="terminal-glass flex items-center justify-between rounded-xl border border-white/10">
          <Link href="/" className="terminal-chip">
            ← {t("nav.back_site", "BACK TO SITE")}
          </Link>
          <div className="hidden md:flex items-center gap-3 pr-2 text-xs text-white/60">
            <span className="h-2 w-2 rounded-full bg-cyan animate-pulse" />
            <span>Realtime</span>
          </div>
        </div>
      </div>
    </div>
  );
}
