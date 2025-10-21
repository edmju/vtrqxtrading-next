"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function ScreenerPage() {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    fetch("/data/macroData.json")
      .then((res) => res.json())
      .then((d) => setRows(d.sources));
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="py-8 space-y-6"
    >
      <h1 className="text-4xl font-bold text-yellow-400 text-center mb-8">Screener</h1>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-yellow-400 text-black">
              <th className="p-3 text-left">Indicateur</th>
              <th className="p-3 text-left">Valeur</th>
              <th className="p-3 text-left">Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-yellow-600/20 hover:bg-[#111]">
                <td className="p-3">{r.source}</td>
                <td className="p-3 font-bold">{r.value}</td>
                <td className="p-3 text-sm opacity-70">{r.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
