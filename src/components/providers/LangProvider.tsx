"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import en from "@/i18n/en";
import fr from "@/i18n/fr";

type Lang = "en" | "fr";
type Dict = typeof en;

type Ctx = {
  lang: Lang;
  dict: Dict;
  setLang: (l: Lang) => void;
  t: (key: string, fallback?: string, params?: Record<string, string | number>) => string;
};

const LangContext = createContext<Ctx | null>(null);

function get(obj: any, path: string) {
  return path.split(".").reduce((acc, k) => (acc ? acc[k] : undefined), obj);
}
function fmt(str: string, params?: Record<string, string | number>) {
  if (!str || !params) return str;
  return Object.entries(params).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, String(v)), str);
}

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  const [dict, setDict] = useState<Dict>(en);

  useEffect(() => {
    const m = document.cookie.match(/(?:^|; )vtrqx_lang=([^;]+)/);
    const c = (m?.[1] as Lang | undefined) || "en";
    const l = c === "fr" ? "fr" : "en";
    setLangState(l);
    setDict(l === "fr" ? fr : en);
  }, []);

  const setLang = (l: Lang) => {
    document.cookie = `vtrqx_lang=${l}; path=/; max-age=31536000; SameSite=Lax`;
    window.location.reload();
  };

  const t = (key: string, fallback = "", params?: Record<string, string | number>) => {
    const s = get(dict, key);
    if (typeof s === "string") return fmt(s, params);
    return fallback || key;
  };

  const value = useMemo<Ctx>(() => ({ lang, dict, setLang, t }), [lang, dict]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within LangProvider");
  return ctx;
}
