import path from "path";
import { promises as fs } from "fs";

type MacroData = {
  updated?: string;
  data?: any[];
};

async function loadMacroData(): Promise<MacroData> {
  try {
    const filePath = path.join(process.cwd(), "src", "data", "macroData_Global.json");
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed?.data) return parsed;
    if (parsed?.sources) return { updated: parsed.updated, data: parsed.sources };
    return { updated: parsed?.updated, data: [] };
  } catch {
    return { updated: undefined, data: [] };
  }
}

export default async function Dashboard() {
  const macro = await loadMacroData();
  const rows = Array.isArray(macro.data) ? macro.data : [];

  return (
    <main className="space-y-8">
      <section className="rounded-2xl bg-neutral-900/70 border border-neutral-800 p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Macro Feed IA 🧠</h1>
          <div className="text-sm opacity-70">
            {macro.updated ? (
              <>Maj : {new Date(macro.updated).toLocaleString("fr-FR")}</>
            ) : (
              "Maj : —"
            )}
          </div>
        </div>
        <p className="mt-3 opacity-80">
          Données consolidées (fichier local mis à jour par cron) — lecture côté serveur, pas d’appels API côté client.
        </p>
      </section>

      <section className="rounded-2xl bg-neutral-900/70 border border-neutral-800 p-6 shadow-lg">
        <h2 className="text-xl font-semibold mb-4">Screener (exposition des données)</h2>
        {rows.length === 0 ? (
          <div className="opacity-70">Aucune donnée pour le moment. Le cron mettra à jour le fichier JSON.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left">
                <tr className="border-b border-neutral-800">
                  <th className="py-2 pr-3">Pays / Source</th>
                  <th className="py-2 pr-3">Série</th>
                  <th className="py-2 pr-3">Valeur</th>
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2">Meta</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any, i: number) => (
                  <tr key={i} className="border-b border-neutral-900 hover:bg-neutral-900/40 transition-colors">
                    <td className="py-2 pr-3">{r.country || r.region || "—"}</td>
                    <td className="py-2 pr-3">{r.series || r.source || "—"}</td>
                    <td className="py-2 pr-3">{r.value ?? r.latest ?? "—"}</td>
                    <td className="py-2 pr-3">
                      {r.date ? new Date(r.date).toLocaleDateString("fr-FR") : "—"}
                    </td>
                    <td className="py-2 text-neutral-400">
                      {r.meta ? JSON.stringify(r.meta) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
