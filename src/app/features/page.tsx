import GlassCard from "@/components/ui/GlassCard";

const GROUPS: { title: string; items: string[] }[] = [
  {
    title: "Market Monitor",
    items: [
      "Live Headlines (temps réel)",
      "Calendrier économique enrichi",
      "Contexte par actif (catalyseurs, thèmes)",
      "AI Market Sentiment (bull/bear, momentum)",
    ],
  },
  {
    title: "Institutional Data",
    items: [
      "COT (Commitment of Traders)",
      "Orderflow & Footprint",
      "Volume Profile",
      "ETF & Fund Flows",
      "Company Financials, Ratings, Insiders",
      "SEC Filings & Calendriers IPO/Earnings",
    ],
  },
  {
    title: "AI Modules",
    items: [
      "AI News Analysis",
      "AI Social Sentiment",
      "AI Pattern & Seasonality",
      "Alertes AI multi‑sources",
    ],
  },
  {
    title: "Macro Terminals",
    items: [
      "Dot Plots — Fed, ECB, BoE, BoJ, RBA, RBNZ, SNB, BoC, PBoC",
      "Macro Timeline (surprises vs consensus)",
      "Breadth/Positioning (Retail vs Smart Money)",
      "Options/Gamma & OI Futures",
    ],
  },
  {
    title: "Research",
    items: [
      "Bank Reports (JPM, MS, GS, UBS, Citi, BofA…)",
      "Smart Money Reports",
      "Insider Positions",
      "Search plein‑texte + résumés IA",
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-10 space-y-10">
      <header className="text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold">All Features</h1>
        <p className="text-white/70 mt-3">Everything you need to trade with institutional‑grade clarity.</p>
      </header>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {GROUPS.map((g) => (
          <GlassCard key={g.title} className="p-6">
            <h2 className="text-lg font-semibold">{g.title}</h2>
            <ul className="mt-3 space-y-2 text-white/80 text-sm list-disc list-inside">
              {g.items.map((it) => (
                <li key={it}>{it}</li>
              ))}
            </ul>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
