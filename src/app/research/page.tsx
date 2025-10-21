import { generateResearch } from "@/lib/research";

export default async function ResearchPage() {
  const analysis = await generateResearch();

  return (
    <main className="space-y-6">
      <h1 className="text-3xl font-bold text-yellow-400">🧠 Research & Insights</h1>
      <div className="bg-neutral-900 p-6 rounded-xl border border-yellow-500/20 whitespace-pre-wrap">
        {analysis}
      </div>
    </main>
  );
}
