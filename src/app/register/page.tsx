// src/app/register/page.tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    setLoading(true);

    // 🔧 Route d’API d’inscription principale
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    setLoading(false);

    if (res.ok) {
      await signIn("credentials", { email, password, redirect: false });
      router.push("/profile");
    } else {
      const data = await res.json().catch(() => ({}));
      setError(
        data.message ||
          data.error ||
          "Erreur d’inscription. Merci de réessayer dans quelques secondes."
      );
    }
  };

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
            <span>Onboarding · Identity · Access</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
            Create your VTRQX access
          </h1>
          <p className="text-sm text-white/70 max-w-xl">
            One account to access all VTRQX terminals: news, sentiment, macro
            and positioning.
          </p>
        </header>

        {/* Carte principale */}
        <section className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
          {/* Formulaire d’inscription */}
          <div className="relative rounded-3xl border border-white/10 bg-gradient-to-br from-neutral-950/90 via-neutral-900/80 to-neutral-800/70 p-6 shadow-[0_0_40px_rgba(0,0,0,0.75)] backdrop-blur-xl">
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-1 opacity-60 blur-2xl"
              style={{
                background:
                  "radial-gradient(600px 200px at 0% 0%, rgba(255,213,74,0.15), transparent 60%), radial-gradient(600px 200px at 100% 0%, rgba(139,92,246,0.18), transparent 60%)",
              }}
            />
            <div className="relative space-y-5">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-white">
                  Set up your account
                </h2>
                <p className="text-sm text-white/70">
                  Use a work or trading email you actively monitor. We&apos;ll
                  send verification codes and security alerts there.
                </p>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
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
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-neutral-900/80 px-3 py-2.5 text-sm text-white placeholder:text-white/40 outline-none ring-0 focus:border-primary focus:ring-1 focus:ring-primary/60"
                    placeholder="At least 8 characters"
                  />
                </div>

                <div className="space-y-2 text-sm">
                  <label
                    htmlFor="confirm"
                    className="block text-xs font-medium uppercase tracking-[.18em] text-white/60"
                  >
                    Confirm password
                  </label>
                  <input
                    id="confirm"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-neutral-900/80 px-3 py-2.5 text-sm text-white placeholder:text-white/40 outline-none ring-0 focus:border-primary focus:ring-1 focus:ring-primary/60"
                    placeholder="Repeat your password"
                  />
                </div>

                {error && (
                  <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                    {error}
                  </p>
                )}

                <div className="pt-1">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full justify-center"
                  >
                    {loading ? "Creating your access…" : "Create my VTRQX account"}
                  </Button>
                </div>
              </form>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-white/70">
                <span className="text-white/60">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    Log in instead
                  </Link>
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px]">
                  Email-verified · Single access
                </span>
              </div>
            </div>
          </div>

          {/* Panneau latéral / info sécurité */}
          <div className="space-y-4 rounded-3xl border border-white/10 bg-neutral-950/85 p-5 shadow-[0_0_34px_rgba(0,0,0,0.85)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-white">
                Account & security
              </h2>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-200">
                SECURITY FIRST
              </span>
            </div>

            <ul className="space-y-3 text-xs text-white/75">
              <li className="flex items-start gap-2">
                <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                <div>
                  <p className="font-medium text-white">
                    Credential-based access
                  </p>
                  <p className="text-white/65">
                    Log in using secure credential flow powered by NextAuth and
                    Prisma.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.9)]" />
                <div>
                  <p className="font-medium text-white">
                    Verification & alerts
                  </p>
                  <p className="text-white/65">
                    Verification codes and reset flows are sent directly to your
                    inbox.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(139,92,246,0.9)]" />
                <div>
                  <p className="font-medium text-white">Subscription ready</p>
                  <p className="text-white/65">
                    Each account is wired to a subscription record for access
                    control and billing.
                  </p>
                </div>
              </li>
            </ul>

            <div className="mt-3 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

            <div className="space-y-2 text-[11px] text-white/65">
              <p className="font-medium text-white/80">Note</p>
              <p>
                Once your account is created, we automatically connect you and
                redirect you to your profile page so you can verify your access
                and open the terminal.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
