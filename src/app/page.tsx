export default function Home() {
  return (
    <main className="min-h-screen flex flex-col justify-center items-center text-center px-6">
      <h1 className="text-6xl md:text-7xl font-extrabold gradient-title font-orbitron mb-6">
        AI-POWERED TRADING
      </h1>
      <p className="text-text-secondary max-w-xl leading-relaxed mb-10 font-inter">
        Prenez une longueur d’avance sur les marchés avec l’intelligence artificielle.
      </p>
      <button className="cta px-10 py-4 text-lg">DÉMARRER</button>

      <div className="mt-16 glass p-8 rounded-xl shadow-glow w-full max-w-2xl text-left">
        <h2 className="text-neon-cyan mb-4 text-lg font-semibold font-orbitron">Aperçu IA</h2>
        <p className="text-text-secondary font-inter">
          Analyse en temps réel des tendances macroéconomiques mondiales, signaux IA et performance.
        </p>
      </div>
    </main>
  );
}
