// path: src/components/site/FeatureGrid.tsx
// (Feature grid – glassy + hover ring; contenu inchangé)
// Source d'origine: :contentReference[oaicite:7]{index=7}
import { getI18n } from "@/lib/i18n/server";
import GlassCard from "@/components/ui/GlassCard";

export default async function FeatureGrid() {
  const { dict } = getI18n();
  const g = dict.featureGrid;

  const Item = ({ title, desc, emoji }: { title: string; desc: string; emoji: string }) => (
    <GlassCard className="p-5 hover:ring-1 hover:ring-cyan/40 transition">
      <div className="flex items-start gap-3">
        <div className="text-primary text-xl">{emoji}</div>
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-sm text-white/70 mt-1">{desc}</p>
        </div>
      </div>
    </GlassCard>
  );

  return (
    <section className="mt-14">
      <div className="mx-auto max-w-7xl px-5">
        <div className="grid md:grid-cols-3 gap-4">
          <Item title={g.a.title} desc={g.a.desc} emoji="📰" />
          <Item title={g.b.title} desc={g.b.desc} emoji="🤖" />
          <Item title={g.c.title} desc={g.c.desc} emoji="📈" />
        </div>
      </div>
    </section>
  );
}
