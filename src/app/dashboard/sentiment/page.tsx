import GlassCard from "@/components/ui/GlassCard";

export default function SentimentPage() {
  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <h2 className="text-xl font-semibold">AI Market Sentiment</h2>
        <p className="text-white/70 mt-2">Bull/Bear par actif, momentum & contexte.</p>
      </GlassCard>
    </div>
  );
}
