import GlassCard from "@/components/ui/GlassCard";

export default function DotPlotsPage() {
  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <h2 className="text-xl font-semibold">Dot Plots</h2>
        <p className="text-white/70 mt-2">
          Fed, ECB, BoE, BoJ, RBA, RBNZ, SNB, BoC, PBoC — historiques + projections.
        </p>
      </GlassCard>
    </div>
  );
}
