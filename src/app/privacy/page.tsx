import GlassCard from "@/components/ui/GlassCard";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-10 space-y-6">
      <h1 className="text-3xl font-bold">Privacy Policy</h1>
      <GlassCard className="p-6">
        <p className="text-white/80">
          We collect only what’s necessary to operate the service (account, billing, usage analytics).
          We don’t sell your data. You can request deletion at any time.
        </p>
      </GlassCard>
      <GlassCard className="p-6">
        <h2 className="text-xl font-semibold">Cookies</h2>
        <p className="text-white/80 mt-2">
          We use essential cookies (auth/session) and a language preference cookie (vtrqx_lang).
        </p>
      </GlassCard>
    </div>
  );
}
