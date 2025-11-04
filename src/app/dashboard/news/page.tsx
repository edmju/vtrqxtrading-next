import GlassCard from "@/components/ui/GlassCard";

export default function NewsPage() {
  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <h2 className="text-xl font-semibold">Live Headlines</h2>
        <p className="text-white/70 mt-2">Flux d’actualités (provider à brancher) + résumés IA.</p>
      </GlassCard>
    </div>
  );
}
