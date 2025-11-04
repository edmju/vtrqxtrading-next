import GlassCard from "@/components/ui/GlassCard";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-10 space-y-8">
      <header className="text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold">About VTRQX Trading</h1>
        <p className="text-white/70 mt-3">Institutional‑grade data, AI insights, and a beautiful terminal.</p>
      </header>

      <GlassCard className="p-6">
        <h2 className="text-xl font-semibold">Who we are</h2>
        <p className="text-white/80 mt-2">
          VTRQX Trading est une plateforme d’analyse de marché alimentée par l’IA, conçue pour
          offrir au plus grand nombre des outils de niveau institutionnel : flux d’actualités en temps réel,
          données macro, positionnement, recherches de banques et analytics avancées.
        </p>
      </GlassCard>

      <GlassCard className="p-6">
        <h2 className="text-xl font-semibold">What we provide</h2>
        <ul className="list-disc list-inside text-white/80 mt-2 space-y-1">
          <li>Données multi‑actifs en temps réel & calendrier économique</li>
          <li>Modules IA : sentiment, résumés d’actualités, détection de patterns</li>
          <li>Terminals macro (Dot Plots, COT, flows, breadth, options, etc.)</li>
          <li>Recherche : résumés IA des rapports de banques et filings</li>
          <li>Alertes et watchlists synchronisées</li>
        </ul>
      </GlassCard>

      <GlassCard className="p-6">
        <h2 className="text-xl font-semibold">Disclaimer</h2>
        <p className="text-white/80 mt-2">
          VTRQX Trading n’est <strong>pas</strong> un conseiller financier et ne fournit <strong>aucune</strong> recommandation
          d’investissement personnalisée. Les informations disponibles sur la plateforme sont
          fournies à titre informatif et éducatif uniquement. Les utilisateurs sont responsables
          de leurs décisions et comprennent que tout investissement comporte des risques,
          incluant la perte en capital. Les performances passées ne préjugent pas des
          performances futures.
        </p>
      </GlassCard>
    </div>
  );
}
