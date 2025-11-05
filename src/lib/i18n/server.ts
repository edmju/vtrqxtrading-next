import { cookies } from "next/headers";
import en from "@/i18n/en";
import fr from "@/i18n/fr";

function get(obj: any, path: string) {
  return path.split(".").reduce((acc, k) => (acc ? acc[k] : undefined), obj);
}
function fmt(str: string, params?: Record<string, string | number>) {
  if (!str || !params) return str;
  return Object.entries(params).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, String(v)), str);
}

export function getI18n() {
  const cookie = cookies().get("vtrqx_lang")?.value;
  const lang = cookie === "fr" ? "fr" : "en";
  const dict = lang === "fr" ? fr : en;

  function t(key: string, fallback = "", params?: Record<string, string | number>) {
    const s = get(dict, key);
    if (typeof s === "string") return fmt(s, params);
    return fallback || key;
  }

  return { lang, dict, t };
}
