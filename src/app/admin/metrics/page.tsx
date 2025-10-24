"use client";

import { useEffect, useState } from "react";

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const res = await fetch("/api/admin/metrics");
        if (!res.ok) throw new Error("Erreur lors du chargement des métriques");
        const data = await res.json();
        setMetrics(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
  }, []);

  if (loading) {
    return <div className="p-4 text-gray-500">Chargement des métriques...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Tableau des métriques</h1>
      <table className="min-w-full border border-gray-300 text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2 text-left">Nom</th>
            <th className="border p-2 text-left">Valeur</th>
          </tr>
        </thead>
        <tbody>
          {metrics.length > 0 ? (
            metrics.map((metric, index) => (
              <tr key={index}>
                <td className="border p-2">{metric.name}</td>
                <td className="border p-2">{metric.value}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td className="border p-2 text-gray-500" colSpan={2}>
                Aucune métrique trouvée.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
