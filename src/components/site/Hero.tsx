"use client";
import Button from "@/components/ui/Button";
import GlassCard from "@/components/ui/GlassCard";
import Sparkline from "@/components/charts/Sparkline";
import Link from "next/link";

const chart = [24,22,23,25,26,27,25,26,29,30,33,31,36,39,38,41,45,48,47,50];

export default function Hero() {
  return (
    <section className="mt-8 md:mt-12">
      <div className="mx-auto max-w-7xl px-5 grid md:grid-cols-2 gap-8 items-stretch">
        {/* Texte */}
        <div className="flex flex-col justify-center">
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight">
            <span className="block">AI‑POWERED</span>
            <span className="block text-white/90">TRADING</span>
          </h1>
          <p className="mt-4 text-white/70 max-w-xl">
            Take your trading to the next level using institutional‑grade data and AI insights.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <Link href="/profile"><Button>GET STARTED</Button></Link>
            <a href="/features" className="text-sm text-primary hover:underline">Explore features →</a>
          </div>
        </div>

        {/* Carte Chart */}
        <GlassCard className="p-6 md:p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-white/70 text-sm">VTRQX Index</p>
                <p className="text-2xl font-bold">38,748.23</p>
                <p className="text-cyan text-xs mt-1">+2.16%</p>
              </div>
              <div className="text-right text-xs text-white/50">
                <p>AI sentiment</p>
                <p className="text-primary">Bullish</p>
              </div>
            </div>
            <div className="mt-6 -mx-2">
              <Sparkline values={chart} width={520} height={160} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-6">
            <GlassCard className="p-4">
              <p className="text-xs text-white/60">BALANCE</p>
              <p className="text-xl md:text-2xl font-bold text-cyan">$25,670.90</p>
            </GlassCard>
            <GlassCard className="p-4">
              <p className="text-xs text-white/60">P&L (30D)</p>
              <p className="text-xl md:text-2xl font-bold text-primary">+312.56</p>
            </GlassCard>
          </div>
        </GlassCard>
      </div>
    </section>
  );
}
