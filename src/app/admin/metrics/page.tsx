export default async function AdminMetricsPage() {
  return (
    <section className="max-w-5xl mx-auto bg-[#111] p-6 rounded-2xl border border-yellow-500/30">
      <h1 className="text-3xl font-bold text-yellow-400 mb-4">Admin Metrics</h1>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-[#0a0a0a] border border-yellow-500/20 rounded-xl p-4">
          <div className="text-sm text-gray-400">Dernière mise à jour</div>
          <div className="text-xl text-yellow-400 font-semibold">
            {new Date().toLocaleString("fr-FR")}
          </div>
        </div>
        <div className="bg-[#0a0a0a] border border-yellow-500/20 rounded-xl p-4">
          <div className="text-sm text-gray-400">Tâches cron exécutées</div>
          <div className="text-xl text-yellow-400 font-semibold">? Toutes opérationnelles</div>
        </div>
      </div>
    </section>
  );
}
