import { getI18n } from "@/lib/i18n/server";
import GlassCard from "@/components/ui/GlassCard";

export default async function FeatureGrid() {
  const { dict } = getI18n();
  const g = dict.featureGrid;

  return (
    <section className="mt-14">
      <div className="mx-auto max-w-7xl px-5">
        <div className="grid md:grid-cols-3 gap-4">
          <GlassCard className="p-5">
            <div className="flex items-start gap-3">
              <div className="text-primary">📰</div>
              <div>
                <h3 className="text-sm font-semibold">{g.a.title}</h3>
                <p className="text-sm text-white/70 mt-1">{g.a.desc}</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <div className="flex items-start gap-3">
              <div className="text-primary">🤖</div>
              <div>
                <h3 className="text-sm font-semibold">{g.b.title}</h3>
                <p className="text-sm text-white/70 mt-1">{g.b.desc}</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <div className="flex items-start gap-3">
              <div className="text-primary">📈</div>
              <div>
                <h3 className="text-sm font-semibold">{g.c.title}</h3>
                <p className="text-sm text-white/70 mt-1">{g.c.desc}</p>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </section>
  );
}
