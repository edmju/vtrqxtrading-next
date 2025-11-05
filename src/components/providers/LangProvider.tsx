"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Lang = "en" | "fr";
type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: string, fallback?: string) => string };

const LangContext = createContext<Ctx | null>(null);

const STRINGS: Record<string, { en: string; fr: string }> = {
  "nav.features": { en: "FEATURES", fr: "FONCTIONNALITÉS" },
  "nav.pricing": { en: "PRICING", fr: "TARIFS" },
  "nav.about": { en: "ABOUT", fr: "À PROPOS" },
  "nav.signin": { en: "SIGN IN", fr: "CONNEXION" },
  "nav.dashboard": { en: "DASHBOARD", fr: "TABLEAU DE BORD" },
  "cta.get_started": { en: "GET STARTED", fr: "COMMENCER" },
  "cta.open_terminal": { en: "OPEN TERMINAL", fr: "OUVRIR LE TERMINAL" },
  "footer.terms": { en: "Terms", fr: "Conditions" },
  "footer.privacy": { en: "Privacy", fr: "Confidentialité" },
  "footer.contact": { en: "Contact", fr: "Contact" },
  "footer.language": { en: "Language", fr: "Langue" },
  "footer.en": { en: "English", fr: "Anglais" },
  "footer.fr": { en: "French", fr: "Français" },
  "features.title": { en: "All Features", fr: "Toutes les fonctionnalités" },
  "features.subtitle": {
    en: "Everything you need to trade with institutional‑grade clarity.",
    fr: "Tout ce dont vous avez besoin pour trader avec une clarté de niveau institutionnel."
  },
  "subscription.title": { en: "Choose your plan", fr: "Choisissez votre offre" },
  "subscription.subtitle": {
    en: "Upgrade anytime. You’ll remain on this page after checkout for clarity.",
    fr: "Changez d’offre à tout moment. Vous resterez sur cette page après le paiement."
  },
  "subscription.success": { en: "Subscription active — welcome!", fr: "Abonnement actif — bienvenue !" },
  "subscription.canceled": { en: "Checkout canceled.", fr: "Paiement annulé." },
  "subscription.compare": { en: "Compare features", fr: "Comparer les fonctionnalités" },
  "subscription.selected": { en: "Selected plan", fr: "Offre sélectionnée" },
};

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const m = document.cookie.match(/(?:^|; )vtrqx_lang=([^;]+)/);
    const c = (m?.[1] as Lang | undefined) || "en";
    setLangState(c === "fr" ? "fr" : "en");
  }, []);

  const setLang = (l: Lang) => {
    document.cookie = `vtrqx_lang=${l}; path=/; max-age=31536000; SameSite=Lax`;
    window.location.reload();
  };

  const t = (k: string, fallback = "") => STRINGS[k]?.[lang] ?? fallback;

  const value = useMemo<Ctx>(() => ({ lang, setLang, t }), [lang]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within LangProvider");
  return ctx;
}
