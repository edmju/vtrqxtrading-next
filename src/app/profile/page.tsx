"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import { useLang } from "@/components/providers/LangProvider";

export default function ProfilePage() {
  const { t } = useLang();
  const sessionHook = useSession();
  const session = sessionHook?.data;
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [notice]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await signIn("credentials", { redirect: false, email, password });
    setLoading(false);
    if (res?.ok) {
      setNotice(t("profile.login_ok"));
      setTimeout(() => router.push("/dashboard"), 400);
    } else setNotice(t("profile.login_err"));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return setNotice(t("profile.mismatch"));
    const res = await fetch("/api/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      setNotice(t("profile.created"));
      setTimeout(() => setMode("login"), 400);
    } else setNotice(t("profile.register_err"));
  };

  if (session) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] px-5">
        <GlassCard className="p-8 w-full max-w-md text-center">
          <h1 className="text-2xl font-bold mb-2">{t("profile.welcome")}</h1>
          <p className="text-white/70 mb-6">{session.user?.email}</p>
          <div className="flex flex-col gap-3">
            <Button onClick={() => router.push("/dashboard")}>{t("cta.open_terminal")}</Button>
            <Button onClick={() => router.push("/subscription")} variant="ghost">{t("profile.manage")}</Button>
            <button
              onClick={() => signOut()}
              className="bg-red-500 hover:bg-red-400 text-white font-semibold py-2 rounded-md transition-transform hover:-translate-y-0.5"
            >
              {t("profile.logout")}
            </button>
          </div>
        </GlassCard>
        {notice && <div className="fixed bottom-6 right-6 bg-primary text-black px-5 py-2 rounded-lg shadow-glow">{notice}</div>}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[70vh] px-5">
      <GlassCard className="p-8 w-full max-w-md text-center">
        <h1 className="text-2xl font-bold mb-6">
          {mode === "login" ? t("profile.title_login") : t("profile.title_register")}
        </h1>

        <form onSubmit={mode === "login" ? handleLogin : handleRegister} className="flex flex-col gap-3">
          <input
            type="email" placeholder={t("profile.email")}
            className="w-full bg-neutral-800 text-gray-200 p-2 rounded-md border border-neutral-700 focus:border-primary focus:outline-none"
            value={email} onChange={(e) => setEmail(e.target.value)} required
          />
          <input
            type="password" placeholder={t("profile.password")}
            className="w-full bg-neutral-800 text-gray-200 p-2 rounded-md border border-neutral-700 focus:border-primary focus:outline-none"
            value={password} onChange={(e) => setPassword(e.target.value)} required
          />
          {mode === "register" && (
            <input
              type="password" placeholder={t("profile.confirm")}
              className="w-full bg-neutral-800 text-gray-200 p-2 rounded-md border border-neutral-700 focus:border-primary focus:outline-none"
              value={confirm} onChange={(e) => setConfirm(e.target.value)} required
            />
          )}
          <Button type="submit" className="mt-1" disabled={loading}>
            {loading ? "…" : mode === "login" ? t("profile.login") : t("profile.create")}
          </Button>
        </form>

        {mode === "login" ? (
          <p className="mt-4 text-gray-400 text-sm">
            {t("profile.title_register")} ?{" "}
            <span onClick={() => setMode("register")} className="text-primary cursor-pointer hover:underline">
              {t("profile.create")}
            </span>
          </p>
        ) : (
          <p className="mt-4 text-gray-400 text-sm">
            {t("profile.title_login")} ?{" "}
            <span onClick={() => setMode("login")} className="text-primary cursor-pointer hover:underline">
              {t("profile.login")}
            </span>
          </p>
        )}

        {mode === "login" && (
          <p onClick={() => router.push("/request-reset")} className="text-primary text-sm mt-3 cursor-pointer hover:underline">
            {t("profile.forgot")}
          </p>
        )}
      </GlassCard>

      {notice && <div className="fixed bottom-6 right-6 bg-primary text-black px-5 py-2 rounded-lg shadow-glow">{notice}</div>}
    </div>
  );
}
