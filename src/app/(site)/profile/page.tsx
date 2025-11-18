// path: src/app/(site)/profile/page.tsx
"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import Button from "@/components/ui/Button";
import { useLang } from "@/components/providers/LangProvider";

function initials(name?: string | null) {
  if (!name) return "U";
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0]!.charAt(0)?.toUpperCase() || "U";
  return (
    (parts[0]!.charAt(0) || "").toUpperCase() +
    (parts[1]!.charAt(0) || "").toUpperCase()
  );
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const { t } = useLang();

  const user = session?.user;
  const isLoading = status === "loading";
  const isLoggedIn = !!user;

  return (
    <main className="relative min-h-[calc(100vh-80px)] overflow-hidden py-10">
      {/* Neon background halos */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(900px 280px at 10% -10%, rgba(255,213,74,0.20), transparent 60%), radial-gradient(900px 280px at 90% 0%, rgba(34,211,238,0.20), transparent 60%), radial-gradient(900px 380px at 50% 110%, rgba(59,130,246,0.18), transparent 60%)",
        }}
      />

      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5">
        {/* Header */}
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-medium uppercase tracking-[.18em] text-white/70">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
              <span>Profile · Identity · Plan</span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
              {t("profile.title", "Your VTRQX profile")}
            </h1>
            <p className="max-w-xl text-sm text-white/70">
              {t(
                "profile.subtitle",
                "Manage your identity, terminal access and security in a single neon-lit cockpit."
              )}
            </p>
          </div>

          <div className="flex flex-col items-start gap-2 text-xs text-white/70 md:items-end">
            <div>
              {t("profile.status", "Status")}:{" "}
              <span className="font-medium text-emerald-300">
                {isLoading
                  ? t("profile.status.loading", "Loading…")
                  : isLoggedIn
                  ? t("profile.status.connected", "Connected")
                  : t("profile.status.guest", "Guest")}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-white/60">
                {t("profile.env", "Environment")}: PRODUCTION
              </span>
              <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-white/60">
                {t("profile.version", "Terminal build")}: v1.0.0
              </span>
            </div>
          </div>
        </header>

        {/* Main layout */}
        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          {/* Left column – identity, plan, connections */}
          <div className="space-y-6">
            {/* Identity card */}
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-neutral-900/90 via-neutral-900/70 to-neutral-800/60 shadow-[0_0_40px_rgba(0,0,0,0.7)] backdrop-blur-xl">
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-1 opacity-60 blur-2xl"
                style={{
                  background:
                    "radial-gradient(600px 200px at 0% 0%, rgba(255,213,74,0.16), transparent 60%), radial-gradient(600px 200px at 100% 0%, rgba(34,211,238,0.16), transparent 60%)",
                }}
              />
              <div className="relative flex flex-col gap-6 p-6 md:flex-row md:items-center md:gap-8">
                {/* Avatar */}
                <div className="relative self-start rounded-3xl border border-white/15 bg-gradient-to-br from-neutral-900 via-neutral-900/70 to-neutral-800 p-[2px] shadow-[0_0_30px_rgba(0,0,0,0.8)]">
                  <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl bg-neutral-950">
                    <div className="absolute inset-0 opacity-70" style={{ background: "radial-gradient(circle at 0% 0%, #FFD54A33, transparent 55%)" }} />
                    {user?.image ? (
                      // image externe potentielle ; Next/Image pas obligatoire ici
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.image}
                        alt={user.name || "Avatar"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="relative text-3xl font-semibold text-primary">
                        {initials(user?.name)}
                      </span>
                    )}
                  </div>
                  <div className="pointer-events-none absolute -right-2 -top-2 h-4 w-4 animate-ping rounded-full bg-emerald-400/80" />
                  <div className="pointer-events-none absolute -right-2 -top-2 h-4 w-4 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.9)]" />
                </div>

                {/* Identity details */}
                <div className="space-y-3 md:flex-1">
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      {user?.name || t("profile.guest", "Guest trader")}
                    </h2>
                    <p className="text-xs text-white/60">
                      {user?.email || t("profile.guest_desc", "Create an account to unlock the full VTRQX terminal.")}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="space-y-1 rounded-2xl bg-white/5 p-3">
                      <div className="flex items-center justify-between text-[11px] text-white/60">
                        <span>{t("profile.role", "Role")}</span>
                        <span className="rounded-full bg-neutral-900/60 px-2 py-0.5 text-[10px] text-white/70">
                          {t("profile.role.trader", "TRADER")}
                        </span>
                      </div>
                      <p className="text-sm text-white">
                        {user?.name ? t("profile.role.connected", "Connected to VTRQX terminal") : t("profile.role.anonymous", "Anonymous session")}
                      </p>
                    </div>
                    <div className="space-y-1 rounded-2xl bg-white/5 p-3">
                      <div className="flex items-center justify-between text-[11px] text-white/60">
                        <span>{t("profile.plan", "Plan")}</span>
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300 ring-1 ring-emerald-500/60">
                          {t("profile.plan.beta", "BETA ACCESS")}
                        </span>
                      </div>
                      <p className="text-sm text-white">
                        {t(
                          "profile.plan.desc",
                          "Early-access to news, sentiment, macro & positioning modules."
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs text-white/70">
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
                      {t("profile.badge.latency", "Latency-optimised feeds")}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
                      {t("profile.badge.ai", "AI sentiment engine")}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
                      {t("profile.badge.security", "Session secured")}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-1">
                    {isLoggedIn ? (
                      <>
                        <Link href="/boot">
                          <Button size="sm">
                            {t("profile.cta.open_terminal", "OPEN TERMINAL")}
                          </Button>
                        </Link>
                        <button
                          type="button"
                          onClick={() => signOut({ callbackUrl: "/" })}
                          className="text-xs text-white/70 underline-offset-4 hover:underline"
                        >
                          {t("profile.cta.logout", "Log out")}
                        </button>
                      </>
                    ) : (
                      <>
                        <Link href="/subscription">
                          <Button size="sm">
                            {t("profile.cta.get_access", "GET ACCESS")}
                          </Button>
                        </Link>
                        <Link
                          href="/api/auth/signin"
                          className="text-xs text-white/70 underline-offset-4 hover:underline"
                        >
                          {t("profile.cta.signin", "Already have an account? Sign in")}
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Terminal access status */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 shadow-[0_0_24px_rgba(16,185,129,0.45)]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-200">
                    Terminal
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
                </div>
                <p className="mt-2 text-sm text-white">
                  {t("profile.terminal.status", "Access to VTRQX terminal modules")}
                </p>
                <p className="mt-1 text-[11px] text-emerald-100/90">
                  {t(
                    "profile.terminal.desc",
                    "News · Sentiment · Macro · Dot Plots · Positioning (beta)."
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-sky-500/40 bg-sky-500/10 p-4 shadow-[0_0_24px_rgba(56,189,248,0.4)]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-sky-200">
                    News & Sentiment
                  </span>
                  <span className="text-[11px] text-sky-100">Live</span>
                </div>
                <p className="mt-2 text-sm text-white">
                  {t("profile.news.desc", "Access your AI-processed market news and sentiment history.")}
                </p>
              </div>

              <div className="rounded-2xl border border-violet-500/40 bg-violet-500/10 p-4 shadow-[0_0_24px_rgba(139,92,246,0.4)]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-violet-200">
                    Security
                  </span>
                  <span className="text-[10px] text-violet-100/90">
                    {isLoggedIn ? t("profile.security.on", "Session active") : t("profile.security.off", "No session")}
                  </span>
                </div>
                <p className="mt-2 text-sm text-white">
                  {t("profile.security.desc", "Authentication via NextAuth, session protected server-side.")}
                </p>
              </div>
            </div>
          </div>

          {/* Right column – session, preferences, quick links */}
          <div className="space-y-6">
            {/* Session diagnostics */}
            <div className="rounded-3xl border border-white/10 bg-neutral-950/80 p-5 shadow-[0_0_34px_rgba(0,0,0,0.8)] backdrop-blur-xl">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-white">
                  {t("profile.session.title", "Session & identity")}
                </h2>
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/60">
                  {status.toUpperCase()}
                </span>
              </div>

              <div className="mt-3 grid gap-3 text-xs text-white/75">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-white/60">
                    {t("profile.session.user_id", "User identifier")}
                  </span>
                  <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[11px] text-white/80">
                    {user?.email || "anonymous"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-white/60">
                    {t("profile.session.name", "Display name")}
                  </span>
                  <span className="truncate text-right text-white">
                    {user?.name || t("profile.session.no_name", "Not set")}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-white/60">
                    {t("profile.session.provider", "Auth provider")}
                  </span>
                  <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[11px] text-white/80">
                    {user ? t("profile.session.provider.oauth", "OAuth / NextAuth") : t("profile.session.provider.none", "none")}
                  </span>
                </div>
              </div>

              <div className="mt-4 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

              <div className="mt-3 space-y-2 text-[11px] text-white/60">
                <p className="font-medium text-white/80">
                  {t("profile.session.note.title", "Note")}
                </p>
                <p>
                  {t(
                    "profile.session.note.body",
                    "This page is purely client-side for now (no settings persisted yet). Future updates will let you manage advanced preferences directly from here."
                  )}
                </p>
              </div>
            </div>

            {/* Preferences / theme preview */}
            <div className="rounded-3xl border border-white/10 bg-neutral-950/85 p-5 shadow-[0_0_34px_rgba(0,0,0,0.8)] backdrop-blur-xl">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-white">
                  {t("profile.preferences.title", "Terminal preview")}
                </h2>
                <span className="text-[11px] text-white/60">
                  {t("profile.preferences.subtitle", "Neon trading cockpit")}
                </span>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-gradient-to-br from-neutral-900 via-neutral-900/80 to-neutral-800 p-4 shadow-inner">
                <div className="flex items-center justify-between text-[11px] text-white/60">
                  <span>{t("profile.preview.news", "News & Sentiment")}</span>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">
                    {t("profile.preview.live", "LIVE")}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] text-white/70">
                  <div className="rounded-xl bg-neutral-900/90 p-2">
                    <div className="mb-1 h-1.5 w-10 rounded-full bg-emerald-400/80" />
                    <p className="line-clamp-2">
                      Fed, macro data & risk-on flows summary.
                    </p>
                  </div>
                  <div className="rounded-xl bg-neutral-900/90 p-2">
                    <div className="mb-1 h-1.5 w-10 rounded-full bg-sky-400/80" />
                    <p className="line-clamp-2">
                      FX / rates sentiment map over the last 24h.
                    </p>
                  </div>
                  <div className="rounded-xl bg-neutral-900/90 p-2">
                    <div className="mb-1 h-1.5 w-10 rounded-full bg-violet-400/80" />
                    <p className="line-clamp-2">
                      Positioning, dot plots & macro surprises.
                    </p>
                  </div>
                </div>

                <div className="mt-3 h-14 rounded-xl border border-white/10 bg-neutral-950/90">
                  <div className="relative h-full w-full">
                    <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "linear-gradient(transparent, rgba(148,163,184,0.2))" }} />
                    <div className="absolute inset-x-0 bottom-1 flex items-end gap-[2px] px-2">
                      {Array.from({ length: 30 }).map((_, i) => (
                        <div
                          key={i}
                          className="w-[3%] max-w-[8px] flex-1 rounded-t-sm bg-gradient-to-t from-cyan-400/40 via-cyan-300/80 to-white"
                          style={{
                            height: `${30 + Math.sin(i / 2) * 12 + (i % 5) * 4}%`,
                            opacity: 0.4 + (i % 3) * 0.15,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-white/70">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
                    {t("profile.preferences.tag.latency", "Low-latency layouts")}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
                    {t("profile.preferences.tag.theme", "Neon / dark theme")}
                  </span>
                </div>
                <Link href="/boot" className="text-xs text-primary underline-offset-4 hover:underline">
                  {t("profile.preferences.cta.open", "Open the real terminal →")}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
