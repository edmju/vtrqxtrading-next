async function fetchJSON(url: string) {
  const r = await fetch(url, { cache: "no-store" });
  return r.json();
}

export default async function AdminMetricsPage() {
  const metrics = await fetchJSON("http://localhost:3000/api/insights?scope=GLOBAL");
  const total = metrics?.data?.length || 0;
  const last = metrics?.data?.[0];

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <h1 className="text-2xl font-bold">Admin Metrics</h1>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-xl bg-neutral-900 p-4 border border-neutral-800">
          <div className="text-sm opacity-70">Total Insights</div>
          <div className="text-3xl font-bold">{total}</div>
        </div>

        <div className="rounded-xl bg-neutral-900 p-4 border border-neutral-800">
          <div className="text-sm opacity-70">Dernier scope</div>
          <div className="text-3xl font-bold">{last?.scope || "—"}</div>
        </div>

        <div className="rounded-xl bg-neutral-900 p-4 border border-neutral-800">
          <div className="text-sm opacity-70">Derni�re MAJ</div>
          <div className="text-3xl font-bold">
            {last?.asof ? new Date(last.asof).toLocaleString("fr-FR") : "—"}
          </div>
        </div>
      </div>
    </main>
  );
}

