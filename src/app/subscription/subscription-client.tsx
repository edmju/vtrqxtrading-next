"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";

type PlanKey = "starter" | "pro" | "terminal";

const PRICE_IDS: Record<PlanKey, string> = {
  starter: "price_starter_replace_me",
  pro: "price_pro_replace_me",
  terminal: "price_terminal_replace_me",
};

const PLANS: { key: PlanKey; name: string; price: string; tagline: string }[] = [
  { key: "starter",  name: "Starter",  price: "€19 /mo",  tagline: "Bases solides, essentials" },
  { key: "pro",      name: "Pro",      price: "€49 /mo",  tagline: "Pro data & AI modules" },
  { key: "terminal", name: "Terminal", price: "€99 /mo",  tagline: "Tout le terminal" },
];

const FEATURES = [
  { key: "live_news", label: "Live Headlines temps réel" },
  { key: "econ_calendar", label: "Calendrier économique enrichi" },
  { key: "ai_sentiment", label: "AI Market Sentiment" },
  { key: "ai_news", label: "AI News Analysis" },
  { key: "ai_social", label: "AI Social Sentiment" },
  { key: "seasonality", label: "Seasonality / Pattern Scan" },
  { key: "cot", label: "COT (CFTC)" },
  { key: "orderflow", label: "Orderflow & Footprint" },
  { key: "volume_profile", label: "Volume Profile" },
  { key: "company_fin", label: "Company Financials + Ratings" },
  { key: "insiders", label: "Insider Positions" },
  { key: "sec", label: "SEC Filings / IPO / Earnings" },
  { key: "macro_timeline", label: "Macro Timeline (surprises vs consensus)" },
  { key: "dotplots", label: "Dot Plots (Fed/ECB/BoE/BoJ/RBA/RBNZ/SNB/BoC/PBoC)" },
  { key: "bank_reports", label: "Bank Reports (JPM, MS, GS, UBS, Citi, BofA…)" },
  { key: "alerts", label: "Alertes temps réel personnalisables" },
];

const AVAIL: Record<string, Record<PlanKey, boolean>> = {
  live_news:      { starter: true,  pro: true,  terminal: true  },
  econ_calendar:  { starter: true,  pro: true,  terminal: true  },
  ai_sentiment:   { starter: true,  pro: true,  terminal: true  },
  ai_news:        { starter: false, pro: true,  terminal: true  },
  ai_social:      { starter: false, pro: true,  terminal: true  },
  seasonality:    { starter: false, pro: true,  terminal: true  },
  cot:            { starter: false, pro: true,  terminal: true  },
  orderflow:      { starter: false, pro: false, terminal: true  },
  volume_profile: { starter: false, pro: false, terminal: true  },
  company_fin:    { starter: false, pro: true,  terminal: true  },
  insiders:       { starter: false, pro: true,  terminal: true  },
  sec:            { starter: false, pro: true,  terminal: true  },
  macro_timeline: { starter: false, pro: true,  terminal: true  },
  dotplots:       { starter: false, pro: true,  terminal: true  },
  bank_reports:   { starter: false, pro: true,  terminal: true  },
  alerts:         { starter: true,  pro: true,  terminal: true  },
};

export default function SubscriptionClient() {
  const [selected, setSelected] = useState<PlanKey>("pro");
  const search = useSearchParams();
  const success = search.get("success") === "1";
  const canceled = search.get("canceled") === "1";

  useEffect(() => {
    // bannière visible automatiquement, rien d’autre à faire
  }, [success, canceled]);

  const columns = useMemo(() => PLANS, []);

  async function startCheckout(plan: PlanKey) {
    const priceId = PRICE_IDS[plan];
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceId }),
    });
    const data = await res.json();
    if (data?.url) window.location.href = data.url;
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 space-y-10">
      <header className="text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold">Choose your plan</h1>
        <p className="text-white/70 mt-3">Upgrade anytime. You’ll remain on this page after checkout for clarity.</p>
        {success && <p className="mt-3 text-cyan">✅ Subscription active — welcome!</p>}
        {canceled && <p className="mt-3 text-red-400">❌ Checkout canceled.</p>}
      </header>

      <div className="grid md:grid-cols-3 gap-5">
        {columns.map((p) => (
          <GlassCard key={p.key} className={`p-6 ${selected === p.key ? "ring-1 ring-primary/50" : ""}`}>
            <div className="flex items-baseline justify-between">
              <h2 className="text-xl font-semibold">{p.name}</h2>
              <div className="text-primary text-sm">{p.tagline}</div>
            </div>
            <div className="mt-2 text-3xl font-extrabold">{p.price}</div>
            <Button className="mt-4 w-full" onClick={() => startCheckout(p.key)}>
              {p.key === "starter" ? "Start Starter" : p.key === "pro" ? "Start Pro" : "Start Terminal"}
            </Button>
            <button
              onClick={() => setSelected(p.key)}
              className="mt-3 text-xs text-white/60 hover:text-primary underline"
            >
              Compare features
            </button>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold">Feature comparison</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-white/70">
                <th className="py-2 pr-4">Feature</th>
                {columns.map((p) => (
                  <th key={p.key} className="py-2 px-4">{p.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((f) => (
                <tr key={f.key} className="border-t border-white/5">
                  <td className="py-2 pr-4">{f.label}</td>
                  {columns.map((p) => {
                    const ok = AVAIL[f.key][p.key];
                    return (
                      <td key={p.key} className="py-2 px-4">
                        {ok ? <span className="text-cyan">✔</span> : <span className="text-white/30">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* CTA sticky */}
      <div className="fixed bottom-4 inset-x-0 px-5">
        <div className="mx-auto max-w-7xl">
          <GlassCard className="p-4 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="text-sm text-white/70">
              Selected plan: <span className="text-primary font-semibold uppercase">{selected}</span>
            </div>
            <div className="flex items-center gap-3">
              {columns.map((p) => (
                <Button key={p.key} variant={selected === p.key ? "primary" : "ghost"} onClick={() => startCheckout(p.key)}>
                  {p.name}
                </Button>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
