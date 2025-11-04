export const dynamic = "force-dynamic";

import GlassCard from "@/components/ui/GlassCard";

export default async function Dashboard() {
  return (
    <main className="space-y-6">
      <GlassCard className="p-6">
        <h1 className="text-2xl font-bold">Terminal Overview</h1>
        <p className="text-white/70 mt-2">
          Accès rapide aux flux, sentiment, macro et research. Utilise le menu à gauche.
        </p>
      </GlassCard>
    </main>
  );
}
