// src/app/login/page.tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const callbackUrl = searchParams?.get("callbackUrl") || "/subscribe";

      await signIn("credentials", {
        redirect: true,
        email,
        password,
        callbackUrl,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden py-10">
      {/* Fond néon */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(900px 280px at 10% -10%, rgba(255,213,74,0.20), transparent 60%), radial-gradient(900px 280px at 90% 0%, rgba(34,211,238,0.20), transparent 60%), radial-gradient(900px 380px at 50% 110%, rgba(59,130,246,0.18), transparent 60%)",
        }}
      />

      <div className="mx-auto flex max-w-4xl flex-col gap-8 px-5">
        {/* Header */}
        <header className="mt-4 space-y-2 text-center md:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-medium uppercase tracking-[.18em] text-white/70">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
            <span>Access · Identity · Terminal</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
            Log in to VTRQX
          </h1>
          <p className="text-sm text-white/70 max-w-xl">
            Connect to your VTRQX cockpit to unlock the news, sentiment and
            macro terminals.
          </p>
        </header>

        {/* Carte principale */}
        <section className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
          {/* Formulaire login */}
          <div className="relative rounded-3xl border border-white/10 bg-gradient-to-br from-neutral-950/90 via-neutral-900/80 to-neutral-800/70 p-6 shadow-[0_0_40px_rgba(0,0,0,0.75)] backdrop-blur-xl">
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-1 opacity-60 blur-2xl"
              style={{
                background:
                  "radial-gradient(600px 200px at 0% 0%, rgba(255,213,74,0.15), transparent 60%), radial-gradient(600px 200px at 100% 0%, rgba(56,189,248,0.15), transparent 60%)",
              }}
            />
            <div className="relative space-y-5">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-white">
                  Welcome back, trader
                </h2>
                <p className="text-sm text-white/70">
                  Enter your credentials to reconnect to the terminal. Your
                  session is secured via NextAuth.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2 text-sm">
                  <label
                    htmlFor="email"
                    className="block text-xs font-medium uppercase tracking-[.18em] text-white/60"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-neutral-900/80 px-3 py-2.5 text-sm text-white placeholder:text-white/40 outline-none ring-0 focus:border-primary focus:ring-1 focus:ring-primary/60"
                    placeholder="you@desk.fund"
                  />
                </div>

                <div className="space-y-2 text-sm">
                  <label
                    htmlFor="password"
                    className="block text-xs font-medium uppercase tracking-[.18em] text-white/60"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-neutral-900/80 px-3 py-2.5 text-sm text-white placeholder:text-white/40 outline-none ring-0 focus:border-primary focus:ring-1 focus:ring-primary/60"
                    placeholder="••••••••"
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-white/65">
                  <Link
                    href="/request-reset"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>

                <div className="pt-1">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full justify-center"
                  >
                    {loading ? "Connecting…" : "Log in to terminal"}
                  </Button>
                </div>
              </form>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-white/70">
                <span className="text-white/60">
                  No account yet?{" "}
                  <Link
                    href="/register"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    Create one in 30 seconds
                  </Link>
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px]">
                  Session protected · JWT
                </span>
              </div>
            </div>
          </div>

          {/* Panneau latéral / pitch */}
          <div className="space-y-4 rounded-3xl border border-white/10 bg-neutral-950/85 p-5 shadow-[0_0_34px_rgba(0,0,0,0.85)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-white">
                What you get with VTRQX
              </h2>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-200">
                BETA ACCESS
              </span>
            </div>

            <ul className="space-y-3 text-xs text-white/75">
              <li className="flex items-start gap-2">
                <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                <div>
                  <p className="font-medium text-white">
                    News & sentiment aggregation
                  </p>
                  <p className="text-white/65">
                    Curated macro, credit, FX and equities flows into a single
                    cockpit.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.9)]" />
                <div>
                  <p className="font-medium text-white">
                    Dot plots & positioning
                  </p>
                  <p className="text-white/65">
                    Visualise rate expectations, risk sentiment and flow
                    imbalances.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(139,92,246,0.9)]" />
                <div>
                  <p className="font-medium text-white">Secure access layer</p>
                  <p className="text-white/65">
                    NextAuth-based authentication, JWT sessions and server-side
                    guards.
                  </p>
                </div>
              </li>
            </ul>

            <div className="mt-3 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

            <div className="space-y-2 text-[11px] text-white/65">
              <p className="font-medium text-white/80">Tip</p>
              <p>
                If you&apos;re redirected back here, check that your credentials
                are correct or reset your password. Once authenticated, you will
                be redirected to your target module automatically.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
