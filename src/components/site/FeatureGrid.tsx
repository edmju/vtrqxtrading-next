import GlassCard from "@/components/ui/GlassCard";
import { ReactNode } from "react";

function Item({ title, desc, icon }: { title: string; desc: string; icon: ReactNode }) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-start gap-3">
        <div className="text-primary">{icon}</div>
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-sm text-white/70 mt-1">{desc}</p>
        </div>
      </div>
    </GlassCard>
  );
}

export default function FeatureGrid() {
  return (
    <section className="mt-14">
      <div className="mx-auto max-w-7xl px-5">
        <div className="grid md:grid-cols-3 gap-4">
          <Item
            title="Live Headlines + Calendar"
            desc="Reste en avance avec des news filtrées et un calendrier macro temps‑réel."
            icon={<span>📰</span>}
          />
          <Item
            title="AI Sentiment"
            desc="Décodage haussier/baissier et contexte par actif pour éviter les pièges."
            icon={<span>🤖</span>}
          />
          <Item
            title="Institutional Data"
            desc="COT, flux, positions, rapports — pour transformer l’info en trades."
            icon={<span>📈</span>}
          />
        </div>
      </div>
    </section>
  );
}
