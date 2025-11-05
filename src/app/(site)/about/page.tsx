import GlassCard from "@/components/ui/GlassCard";
import { getI18n } from "@/lib/i18n/server";

export default function AboutPage() {
  const { dict } = getI18n();
  const a = dict.about;

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 space-y-8">
      <header className="text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold">{a.title}</h1>
        <p className="text-white/70 mt-3">{a.subtitle}</p>
      </header>

      <GlassCard className="p-6">
        <h2 className="text-xl font-semibold">{a.who.title}</h2>
        <p className="text-white/80 mt-2">{a.who.p}</p>
      </GlassCard>

      <GlassCard className="p-6">
        <h2 className="text-xl font-semibold">{a.what.title}</h2>
        <ul className="list-disc list-inside text-white/80 mt-2 space-y-1">
          <li>{a.what.a}</li>
          <li>{a.what.b}</li>
          <li>{a.what.c}</li>
          <li>{a.what.d}</li>
          <li>{a.what.e}</li>
        </ul>
      </GlassCard>

      <GlassCard className="p-6">
        <h2 className="text-xl font-semibold">{a.disclaimer.title}</h2>
        <p className="text-white/80 mt-2">{a.disclaimer.p}</p>
      </GlassCard>
    </div>
  );
}
