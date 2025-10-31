export default function Home() {
  return (
    <main className="flex flex-col justify-center items-center text-center px-6 min-h-screen">
      <h1 className="text-6xl md:text-8xl font-extrabold gradient-text animate-float font-orbitron">
        VTRQX AI TRADING
      </h1>
      <p className="text-text-dim mt-6 max-w-xl font-inter text-lg leading-relaxed">
        Analyse IA des marchés mondiaux, signaux précis, corrélations économiques et insights prédictifs.
      </p>

      <div className="flex gap-6 mt-10">
        <a href="/dashboard" className="cta px-8 py-4 text-lg shadow-glow">Accéder au Dashboard</a>
        <a href="/subscription" className="px-8 py-4 rounded-lg border border-neon-cyan text-neon-cyan hover:bg-neon-cyan hover:text-black transition-all duration-300">
          S’abonner
        </a>
      </div>

      <div className="mt-20 glass p-8 max-w-3xl w-full shadow-purple">
        <h2 className="text-neon-cyan text-2xl font-semibold mb-4 font-orbitron">Analyse en Direct</h2>
        <p className="text-text-main font-inter leading-relaxed">
          L’IA VTRQX identifie les tendances du marché en temps réel à partir de plus de 10 000 sources.
          Obtenez un avantage stratégique grâce à nos algorithmes de détection d’opportunités.
        </p>
      </div>
    </main>
  );
}
