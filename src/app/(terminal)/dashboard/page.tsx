// path: src/app/(terminal)/dashboard/page.tsx
// (Accueil dashboard — grosses cartes glossy, liens modules)
// Source d'origine: :contentReference[oaicite:3]{index=3}
import Link from "next/link";

const Card = ({
  href,
  title,
  desc,
  badge,
}: {
  href: string;
  title: string;
  desc: string;
  badge?: string;
}) => (
  <Link
    href={href}
    className="group rounded-2xl border border-neutral-800/70 bg-gradient-to-br from-neutral-950/90 via-neutral-900/70 to-neutral-800/40 hover:from-neutral-900/90 hover:to-neutral-800/30 hover:border-cyan/50 transition shadow-[0_0_40px_rgba(0,0,0,0.55)] p-5 block"
  >
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-lg font-semibold">{title}</h3>
      {badge && (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan/15 text-cyan ring-1 ring-cyan/40">
          {badge}
        </span>
      )}
    </div>
    <p className="text-sm text-white/70">{desc}</p>
    <div className="mt-4 h-1 rounded-full bg-neutral-800 overflow-hidden">
      <div className="h-full w-[40%] group-hover:w-[80%] bg-gradient-to-r from-violet-400 via-sky-400 to-cyan-300 transition-all" />
    </div>
  </Link>
);

export default function DashboardHome() {
  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-white/10 bg-gradient-to-r from-cyan-900/20 via-neutral-900/40 to-indigo-900/20 p-6 shadow-[0_0_60px_rgba(0,0,0,0.6)]">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">VTRQX Terminal</h1>
        <p className="text-white/70 mt-1 text-sm">Choisissez un module : News, Sentiment, Macro, Dot Plots, Positioning.</p>
      </header>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        <Card href="/dashboard/news" title="News" desc="Flux tradable, clustering & desk de trades IA." badge="Live" />
        <Card href="/dashboard/sentiment" title="Sentiment" desc="Lecture multi‑actifs + historique & drivers." />
        <Card href="/dashboard/macro" title="Macro" desc="Timeline d’événements & drivers macro." />
        <Card href="/dashboard/dotplots" title="Dot Plots" desc="Vision banques centrales (Fed/ECB…)" />
        <Card href="/dashboard/positioning" title="Positioning" desc="COT / positionnement institutionnel." />
        <Card href="/dashboard" title="Plus à venir" desc="Orderflow, seasonality, alerts…" />
      </div>
    </div>
  );
}
