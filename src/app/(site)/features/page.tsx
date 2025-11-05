import GlassCard from "@/components/ui/GlassCard";
import { getI18n } from "@/lib/i18n/server";

function Section({
  title, subtitle, items
}: {
  title: string; subtitle: string; items: { title: string; desc: string }[];
}) {
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
  const { t, dict } = getI18n();
  const g = dict.featuresPage.groups;

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 space-y-8">
      <header className="text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold">{t("featuresPage.title")}</h1>
        <p className="text-white/70 mt-3">{t("featuresPage.subtitle")}</p>
      </header>

      <div className="grid lg:grid-cols-2 gap-6">
        <Section
          title={g.market.title}
          subtitle={g.market.subtitle}
          items={[
            g.market.items.live,
            g.market.items.calendar,
            g.market.items.context,
            g.market.items.sentiment,
          ]}
        />
        <Section
          title={g.institutional.title}
          subtitle={g.institutional.subtitle}
          items={[
            g.institutional.items.cot,
            g.institutional.items.orderflow,
            g.institutional.items.volprof,
            g.institutional.items.fin,
          ]}
        />
        <Section
          title={g.ai.title}
          subtitle={g.ai.subtitle}
          items={[
            g.ai.items.aiNews,
            g.ai.items.aiSocial,
            g.ai.items.seasonal,
            g.ai.items.alerts,
          ]}
        />
        <Section
          title={g.macro.title}
          subtitle={g.macro.subtitle}
          items={[
            g.macro.items.dots,
            g.macro.items.timeline,
            g.macro.items.pos,
            g.macro.items.banks,
          ]}
        />
      </div>
    </div>
  );
}
