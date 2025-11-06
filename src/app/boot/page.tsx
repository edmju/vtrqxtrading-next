"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";

const DURATION_MS = 10_000; // 10s

export default function BootPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Redirige vers /profile si non connecté
  useEffect(() => {
    if (status === "unauthenticated") router.replace("/profile");
  }, [status, router]);

  // Progression lissée sur 10s
  const [progress, setProgress] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    let raf = 0;
    const loop = (ts: number) => {
      if (startRef.current == null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const pct = Math.min(100, (elapsed / DURATION_MS) * 100);
      setProgress(pct);
      if (pct >= 100) {
        router.replace("/dashboard");
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [router]);

  // Phrases qui tournent
  const phrases = useMemo(
    () => [
      "Retrieving market intelligence…",
      "Syncing alpha streams…",
      "Booting AI modules…",
      "Calibrating volatility sensors…",
      "Parsing macro calendar…",
      "Loading dot plots (Fed/ECB/BoE)…",
      "Aggregating prime desk reports…",
      "Scanning social sentiment…",
      "De-duplicating news bursts…",
      "Preparing your terminal…",
    ],
    []
  );

  const activeIndex = Math.min(
    phrases.length - 1,
    Math.floor((progress / 100) * phrases.length)
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#0a0f14] via-[#0b0e12] to-black">
      {/* Halo/Glow */}
      <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-[420px] w-[420px] rounded-full blur-[120px] opacity-30"
           style={{ background: "radial-gradient( circle at 50% 50%, #ffe08233, #00e5ff22, transparent 60%)" }} />

      {/* Grille animée */}
      <div className="absolute inset-0 [background:linear-gradient(#ffffff08_1px,transparent_1px),linear-gradient(90deg,#ffffff08_1px,transparent_1px)] [background-size:40px_40px] animate-[pulse_6s_ease-in-out_infinite] opacity-10" />

      {/* Ligne de scan */}
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#00e5ff22] to-transparent animate-[scan_2.4s_linear_infinite]" />

      {/* Contenu centré */}
      <div className="relative z-10 mx-auto max-w-3xl px-6 pt-32 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-4xl md:text-5xl font-extrabold tracking-tight text-white"
        >
          VTRQX Terminal
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="mt-3 text-white/70"
        >
          Initializing secure session. Please wait while we prepare your workspace.
        </motion.p>

        {/* Phrases tournantes */}
        <div className="relative mt-10 h-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
              transition={{ duration: 0.4 }}
              className="text-primary text-sm md:text-base"
            >
              {phrases[activeIndex]}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Barre de progression */}
        <div className="mt-8">
          <div className="glass rounded-full overflow-hidden h-3">
            <motion.div
              className="h-full bg-gradient-to-r from-yellow-300 via-yellow-200 to-cyan-300"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: "linear", duration: 0.1 }}
            />
          </div>
          <div className="mt-2 text-xs text-white/60">{Math.round(progress)}%</div>
        </div>

        {/* Indicateurs animés */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            "Latency: 12ms",
            "Feeds: 17 online",
            "Clusters: stable",
            "AI: calibrated",
          ].map((k, i) => (
            <motion.div
              key={k}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.05 }}
              className="terminal-glass rounded-lg py-2 text-xs text-white/70"
            >
              {k}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Styles clés */}
      <style jsx global>{`
        @keyframes scan {
          0% { transform: translateY(-32px); }
          100% { transform: translateY(110vh); }
        }
      `}</style>
    </div>
  );
}
