"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import { useLang } from "@/components/providers/LangProvider";

type PlanKey = "starter" | "pro" | "terminal";
type Prices = Partial<Record<PlanKey, string>>;
type Status = { active: boolean; planKey: PlanKey | null };

export default function SubscriptionClient() {
  const { t, dict } = useLang();
  const [selected, setSelected] = useState<PlanKey>("pro");
  const [prices, setPrices] = useState<Prices>({});
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);
  const [status, setStatus] = useState<Status>({ active: false, planKey: null });

  const search = useSearchParams();
  const success = search.get("success") === "1";
  const canceled = search.get("canceled") === "1";
  const router = useRouter();

  const PLANS = useMemo(
    () => [
      { key: "starter" as PlanKey, name: dict.subscription.plans.starter.name, price: dict.subscription.plans.starter.price, tagline: dict.subscription.plans.starter.tagline },
      { key: "pro" as PlanKey, name: dict.subscription.plans.pro.name, price: dict.subscription.plans.pro.price, tagline: dict.subscription.plans.pro.tagline },
      { key: "terminal" as PlanKey, name: dict.subscription.plans.terminal.name, price: dict.subscription.plans.terminal.price, tagline: dict.subscription.plans.terminal.tagline },
    ],
    [dict]
  );

  const FEATURES = useMemo(
    () => [
      { key: "live_news", label: dict.subscription.table.live_news },
      { key: "econ_calendar", label: dict.subscription.table.econ_calendar },
      { key: "ai_sentiment", label: dict.subscription.table.ai_sentiment },
      { key: "ai_news", label: dict.subscription.table.ai_news },
      { key: "ai_social", label: dict.subscription.table.ai_social },
      { key: "seasonality", label: dict.subscription.table.seasonality },
      { key: "cot", label: dict.subscription.table.cot },
      { key: "orderflow", label: dict.subscription.table.orderflow },
      { key: "volume_profile", label: dict.subscription.table.volume_profile },
      { key: "company_fin", label: dict.subscription.table.company_fin },
      { key: "insiders", label: dict.subscription.table.insiders },
      { key: "sec", label: dict.subscription.table.sec },
      { key: "macro_timeline", label: dict.subscription.table.macro_timeline },
      { key: "dotplots", label: dict.subscription.table.dotplots },
      { key: "bank_reports", label: dict.subscription.table.bank_reports },
      { key: "alerts", label: dict.subscription.table.alerts },
    ],
    [dict]
  );

  const AVAIL: Record<string, Record<PlanKey, boolean>> = useMemo(
    () => ({
      live_news: { starter: true, pro: true, terminal: true },
      econ_calendar: { starter: true, pro: true, terminal: true },
      ai_sentiment: { starter: true, pro: true, terminal: true },
      ai_news: { starter: false, pro: true, terminal: true },
      ai_social: { starter: false, pro: true, terminal: true },
      seasonality: { starter: false, pro: true, terminal: true },
      cot: { starter: false, pro: true, terminal: true },
      orderflow: { starter: false, pro: false, terminal: true },
      volume_profile: { starter: false, pro: false, terminal: true },
      company_fin: { starter: false, pro: true, terminal: true },
      insiders: { starter: false, pro: true, terminal: true },
      sec: { starter: false, pro: true, terminal: true },
      macro_timeline: { starter: false, pro: true, terminal: true },
      dotplots: { starter: false, pro: true, terminal: true },
      bank_reports: { starter: false, pro: true, terminal: true },
      alerts: { starter: true, pro: true, terminal: true },
    }),
    []
  );

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/stripe/prices", { cache: "no-store" });
        const data = await res.json();
        if (res.ok) {
          setPrices({ starter: data.starter || "", pro: data.pro || "", terminal: data.terminal || "" });
        }
      } catch {}
      try {
        const r2 = await fetch("/api/subscription/status", { cache: "no-store" });
        const d2 = await r2.json();
        if (r2.ok) setStatus({ active: !!d2.active, planKey: d2.planKey ?? null });
      } catch {}
    })();
  }, []);

  const isCurrent = (plan: PlanKey) => status.active && status.planKey === plan;

  async function openPortal() {
    const res = await fetch("/api/stripe/portal");
    const data = await res.json();
    if (data?.url) window.location.href = data.url;
  }

  async function startCheckout(plan: PlanKey) {
    if (isCurrent(plan)) return openPortal();

    const priceId = prices[plan];
    if (!priceId) {
      alert("Price ID missing. Configure STRIPE_PRICE_* in Vercel.");
      return;
    }
    try {
      setLoadingPlan(plan);
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });

      if (res.status === 401) {
        router.push("/profile");
        return;
      }

      const data = await res.json();
      if (data?.url) window.location.href = data.url;
      else alert(data?.error || "Checkout error.");
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 space-y-10">
      <header className="text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold">{t("subscription.title")}</h1>
        <p className="text-white/70 mt-3">{t("subscription.subtitle")}</p>
        {success && <p className="mt-3 text-cyan">✅ {t("subscription.success")}</p>}
        {canceled && <p className="mt-3 text-red-400">❌ {t("subscription.canceled")}</p>}
      </header>

      {/* Cards */}
      <div className="grid md:grid-cols-3 gap-5">
        {PLANS.map((p) => {
          const current = isCurrent(p.key);
          const disabled = !prices[p.key] && !current;
          const btnLabel = current
            ? `${t("subscription.current", "Current")} — ${t("subscription.manage", "Manage")}`
            : loadingPlan === p.key
            ? "…"
            : `${t("subscription.start", "Start")} ${p.name}`;
          const onClick = () => (current ? openPortal() : startCheckout(p.key));

          return (
            <GlassCard key={p.key} className={`p-6 ${selected === p.key ? "ring-1 ring-primary/50" : ""}`}>
              <div className="flex items-baseline justify-between">
                <h2 className="text-xl font-semibold">{p.name}</h2>
                <div className="text-primary text-sm">{p.tagline}</div>
              </div>
              <div className="mt-2 text-3xl font-extrabold">{p.price}</div>
              <Button className="mt-4 w-full" onClick={onClick} disabled={disabled}>
                {btnLabel}
              </Button>
              {!prices[p.key] && !current && (
                <p className="mt-2 text-xs text-white/50">Configure STRIPE_PRICE_{p.key.toUpperCase()} in Vercel.</p>
              )}
              <button
                onClick={() => setSelected(p.key)}
                className="mt-3 text-xs text-white/60 hover:text-primary underline"
              >
                {t("subscription.compare", "Compare features")}
              </button>
            </GlassCard>
          );
        })}
      </div>

      {/* Table des features */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-separate border-spacing-y-2">
          <thead>
            <tr className="text-white/70">
              <th className="w-[40%] px-3 py-2">{t("subscription.features", "Features")}</th>
              {PLANS.map((p) => (
                <th key={p.key} className="px-3 py-2">{p.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((f) => (
              <tr key={f.key} className="glass rounded-xl">
                <td className="px-3 py-3 font-medium">{f.label}</td>
                {PLANS.map((p) => (
                  <td key={p.key} className="px-3 py-3">
                    {AVAIL[f.key]?.[p.key] ? (
                      <span className="text-green-400">✔</span>
                    ) : (
                      <span className="text-red-400">✖</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td />
              {PLANS.map((p) => {
                const current = isCurrent(p.key);
                const onClick = () => (current ? openPortal() : startCheckout(p.key));
                return (
                  <td key={p.key} className="py-3">
                    <Button onClick={onClick} className="w-full">
                      {current
                        ? `${t("subscription.current", "Current")} — ${t("subscription.manage", "Manage")}`
                        : `${t("subscription.start", "Start")} ${p.name}`}
                    </Button>
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
