import GlassCard from "@/components/ui/GlassCard";
import { useLang } from "@/components/providers/LangProvider";

function Section({ title, subtitle, items }: { title: string; subtitle: string; items: { title: string; desc: string }[] }) {
  return (
    <GlassCard className="p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-white/70 text-sm mt-1">{subtitle}</p>
      <div className="mt-4 grid sm:grid-cols-2 gap-4">
        {items.map((it) => (
          <div key={it.title} className="rounded-lg border border-white/5 p-4 hover:border-blue/30 transition-colors">
            <p className="font-medium">{it.title}</p>
            <p className="text-white/70 text-sm mt-1">{it.desc}</p>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

export default function FeaturesPage() {
  // If this page is converted to client, we could use translations here. For now static copy (EN/FR brief).
  return (
    <div className="mx-auto max-w-7xl px-5 py-10 space-y-8">
      <header className="text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold">All Features</h1>
        <p className="text-white/70 mt-3">
          Institutional‑grade modules across news, macro, positioning and AI analysis.
        </p>
      </header>

      <div className="grid lg:grid-cols-2 gap-6">
        <Section
          title="Market Monitor"
          subtitle="Stay ahead of catalysts and volatility."
          items={[
            { title: "Live Headlines", desc: "Time‑sensitive news stream with smart filters." },
            { title: "Economic Calendar+", desc: "Consensus, surprises, impact heat, instant context." },
            { title: "Context per Asset", desc: "Why it moves: catalysts, themes, linked headlines." },
            { title: "AI Market Sentiment", desc: "Bull/Bear with momentum and narrative strength." },
          ]}
        />
        <Section
          title="Institutional Data"
          subtitle="What pros watch every day."
          items={[
            { title: "COT (CFTC)", desc: "Net positioning by cohort with trends." },
            { title: "Orderflow & Footprint", desc: "Tape‑reading, imbalance and absorption zones." },
            { title: "Volume Profile", desc: "Value areas, HVNs/LVNs and fair value zones." },
            { title: "Financials & Insiders", desc: "Company stats, ratings and insider flows." },
          ]}
        />
        <Section
          title="AI Modules"
          subtitle="Compress information, expand clarity."
          items={[
            { title: "AI News Analysis", desc: "Summaries, key bullets, relevance score." },
            { title: "AI Social Sentiment", desc: "Signal from the crowd with noise suppression." },
            { title: "Seasonality & Patterns", desc: "Historic tendency, regime‑aware." },
            { title: "Smart Alerts", desc: "Rules + AI triggers on price, data or news." },
          ]}
        />
        <Section
          title="Macro Terminals"
          subtitle="Top‑down context that drives markets."
          items={[
            { title: "Dot Plots (Fed, ECB, BoE…)", desc: "Track policy path projections across CBs." },
            { title: "Macro Timeline", desc: "Releases vs consensus with AI ‘why it matters’." },
            { title: "Positioning & Flows", desc: "Retail vs smart money, options gamma, OI." },
            { title: "Bank Research", desc: "Highlights from JPM, MS, GS, UBS, Citi, BofA… with AI summaries." },
          ]}
        />
      </div>
    </div>
  );
}
