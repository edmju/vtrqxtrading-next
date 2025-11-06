// src/app/(site)/profile/page.tsx
"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import { useLang } from "@/components/providers/LangProvider";

type PlanKey = "starter" | "pro" | "terminal";

export default function ProfilePage() {
  const { t } = useLang();
  const { data: session } = useSession();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [plan, setPlan] = useState<PlanKey | null>(null);
  const [verified, setVerified] = useState<boolean>(false);
  const [code, setCode] = useState("");

  useEffect(() => {
    if (!session?.user?.email) return;
    (async () => {
      try {
        const r1 = await fetch("/api/subscription/status", { cache: "no-store" });
        const d1 = await r1.json();
        if (r1.ok) setPlan(d1.planKey ?? null);
      } catch {}
      try {
        const r2 = await fetch("/api/me", { cache: "no-store" });
        const d2 = await r2.json();
        if (r2.ok) setVerified(!!d2.verified);
      } catch {}
    })();
  }, [session?.user?.email]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await signIn("credentials", { redirect: false, email, password });
    setLoading(false);
    if (res?.ok) {
      setNotice(t("profile.login_ok", "Logged in"));
      // ► redirection demandée : revenir sur PRICING pour voir Current/Manage
      setTimeout(() => router.push("/subscription"), 300);
    } else setNotice(t("profile.login_err", "Login failed"));
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) return setNotice(t("profile.mismatch", "Passwords do not match"));
    setLoading(true);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (res.ok) {
      setNotice(t("profile.created", "Account created. Check your email for the code."));
      try {
        await fetch("/api/auth/send-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
      } catch {}
      setTimeout(() => setMode("login"), 300);
    } else {
      setNotice(t("profile.register_err", "Registration error"));
    }
  }

  async function sendCode() {
    const em = session?.user?.email;
    if (!em) return;
    await fetch("/api/auth/send-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: em }),
    });
    setNotice(t("profile.code_sent", "Verification code sent by email"));
  }

  async function confirmCode() {
    const em = session?.user?.email;
    if (!em || !code) return;
    const res = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: em, code }),
    });
    if (res.ok) {
      setVerified(true);
      setNotice(t("profile.verified", "User verified"));
    } else {
      setNotice(t("profile.bad_code", "Invalid code"));
    }
  }

  if (session) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] px-5">
        <GlassCard className="p-8 w-full max-w-2xl">
          <h1 className="text-3xl font-extrabold mb-2">{t("profile.welcome", "Welcome")}</h1>
          <p className="text-white/70 mb-6">{session.user?.email}</p>

          <div className="grid md:grid-cols-2 gap-5">
            <div className="glass p-4 rounded-xl">
              <h2 className="font-semibold mb-2">{t("profile.plan", "Plan")}</h2>
              <p className="text-white/70 mb-3">{plan ?? t("profile.none", "None")}</p>
              <Button onClick={() => router.push("/subscription")}>
                {t("profile.manage", "Manage subscription")}
              </Button>
            </div>

            <div className="glass p-4 rounded-xl">
              <h2 className="font-semibold mb-2">{t("profile.security", "Security")}</h2>
              {verified ? (
                <p className="text-green-400">{t("profile.user_verified", "User verified")}</p>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      placeholder={t("profile.enter_code", "Enter code")}
                      className="flex-1 bg-neutral-800 text-gray-200 p-2 rounded-md border border-neutral-700 focus:border-primary focus:outline-none"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                    />
                    <Button onClick={confirmCode}>{t("profile.verify", "Verify")}</Button>
                  </div>
                  <button onClick={sendCode} className="text-xs text-white/60 hover:text-primary">
                    {t("profile.resend", "Resend code")}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 mt-6">
            <Button onClick={() => router.push("/dashboard")}>
              {t("cta.open_terminal", "OPEN TERMINAL")}
            </Button>
            <button
              onClick={() => signOut()}
              className="bg-red-500 hover:bg-red-400 text-white font-semibold py-2 px-4 rounded-md transition-transform hover:-translate-y-0.5"
            >
              {t("profile.logout", "Logout")}
            </button>
          </div>

          {notice && (
            <div className="fixed bottom-6 right-6 bg-primary text-black px-5 py-2 rounded-lg shadow-glow">
              {notice}
            </div>
          )}
        </GlassCard>
      </div>
    );
  }

  // Non connecté : login / register
  return (
    <div className="flex items-center justify-center min-h-[70vh] px-5">
      <GlassCard className="p-8 w-full max-w-md text-center">
        <h1 className="text-2xl font-bold mb-6">
          {mode === "login" ? t("profile.title_login", "Sign in") : t("profile.title_register", "Create account")}
        </h1>

        <form onSubmit={mode === "login" ? handleLogin : handleRegister} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder={t("profile.email", "Email")}
            className="w-full bg-neutral-800 text-gray-200 p-2 rounded-md border border-neutral-700 focus:border-primary focus:outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder={t("profile.password", "Password")}
            className="w-full bg-neutral-800 text-gray-200 p-2 rounded-md border border-neutral-700 focus:border-primary focus:outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {mode === "register" && (
            <input
              type="password"
              placeholder={t("profile.confirm", "Confirm password")}
              className="w-full bg-neutral-800 text-gray-200 p-2 rounded-md border border-neutral-700 focus:border-primary focus:outline-none"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          )}
          <Button type="submit" className="mt-1" disabled={loading}>
            {loading ? "…" : mode === "login" ? t("profile.login", "Sign in") : t("profile.create", "Create")}
          </Button>
        </form>

        {mode === "login" ? (
          <p className="mt-4 text-gray-400 text-sm">
            {t("profile.title_register", "No account")}{" "}
            <span onClick={() => setMode("register")} className="text-primary cursor-pointer hover:underline">
              {t("profile.create", "Create")}
            </span>
          </p>
        ) : (
          <p className="mt-4 text-gray-400 text-sm">
            {t("profile.title_login", "Already have an account")}{" "}
            <span onClick={() => setMode("login")} className="text-primary cursor-pointer hover:underline">
              {t("profile.login", "Sign in")}
            </span>
          </p>
        )}
      </GlassCard>
    </div>
  );
}
