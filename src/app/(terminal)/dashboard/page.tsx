export const dynamic = "force-dynamic";

import GlassCard from "@/components/ui/GlassCard";

function Panel({ title, children }: any) {
  return (
    <div className="terminal-panel p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold tracking-wider text-white/90">{title}</h3>
        <div className="text-[10px] text-white/40">LIVE</div>
      </div>
      {children}
    </div>
  );
}

export default async function Dashboard() {
  return (
    <main className="space-y-6">
      <div className="grid lg:grid-cols-3 gap-6">
        <Panel title="AI Sentiment">
          <div className="h-40 grid grid-cols-3 gap-3">
            <GlassCard className="p-3 flex flex-col justify-between">
              <div className="text-xs text-white/60">S&P 500</div>
              <div className="text-2xl font-bold text-cyan">Bullish</div>
            </GlassCard>
            <GlassCard className="p-3 flex flex-col justify-between">
              <div className="text-xs text-white/60">EURUSD</div>
              <div className="text-2xl font-bold text-primary">Neutral</div>
            </GlassCard>
            <GlassCard className="p-3 flex flex-col justify-between">
              <div className="text-xs text-white/60">BTCUSD</div>
              <div className="text-2xl font-bold text-blue">Bearish</div>
            </GlassCard>
          </div>
        </Panel>

        <Panel title="News Stream">
          <ul className="space-y-2 max-h-40 overflow-auto pr-2">
            <li className="text-sm"><span className="text-cyan">[Breaking]</span> ISM beat estimates; rates pop.</li>
            <li className="text-sm"><span className="text-primary">[Fed]</span> Governor hints data‑dependence.</li>
            <li className="text-sm"><span className="text-blue">[Tech]</span> AI chip supplier raises guidance.</li>
          </ul>
        </Panel>

        <Panel title="Macro Timeline">
          <div className="h-40 flex items-center justify-center text-white/50 text-sm">
            Releases vs consensus (timeline graph placeholder)
          </div>
        </Panel>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Panel title="Dot Plots">
          <div className="h-64 flex items-center justify-center text-white/50 text-sm">
            Fed / ECB / BoE projections (placeholder)
          </div>
        </Panel>
        <Panel title="Positioning & Flows">
          <div className="h-64 flex items-center justify-center text-white/50 text-sm">
            Retail vs smart money, gamma, OI (placeholder)
          </div>
        </Panel>
      </div>
    </main>
  );
}
