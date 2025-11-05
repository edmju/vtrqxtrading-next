import GlassCard from "@/components/ui/GlassCard";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-10 space-y-6">
      <h1 className="text-3xl font-bold">Terms & Conditions</h1>
      <GlassCard className="p-6">
        <p className="text-white/80">
          By accessing VTRQX Trading you agree to our terms of service. The platform is provided “as is” without
          warranties of any kind. We may update these terms from time to time.
        </p>
      </GlassCard>
      <GlassCard className="p-6">
        <h2 className="text-xl font-semibold">Use of Service</h2>
        <p className="text-white/80 mt-2">
          You must comply with applicable laws and refrain from abusing rate limits, scraping without permission
          or redistributing data beyond your license.
        </p>
      </GlassCard>
    </div>
  );
}
