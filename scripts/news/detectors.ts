// Logique "dure": détection d'événements réellement tradables + scoring robuste.

import { RawArticle } from "./types";

type Region = "US" | "EU" | "Asia" | "Global" | "Other";
export type Signal = {
  key: string;
  label: string;
  region: Region;
  strength: number;         // 0..1
  evidences: RawArticle[];  // articles qui justifient le signal
};

const SRC_W: Record<string, number> = {
  "Reuters": 1.00,
  "Financial Times": 0.95,
  "CNBC": 0.85,
  "MarketWatch": 0.80,
  "Yahoo Finance": 0.75,
  "AP News": 0.72,
};

function norm(s: string) {
  return (s || "")
    .toLowerCase()
    .replace(/[’‘´`]/g, "'")
    .normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{Letter}\p{Number}\s%]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hoursSince(d: string) {
  return (Date.now() - new Date(d).getTime()) / 36e5;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

const KW = {
  fed: ["fed","federal reserve","fomc","powell","treasury"],
  ecb: ["ecb","lagarde","european central bank"],
  boe: ["boe","bank of england"],
  boj: ["boj","bank of japan","ycc","yield curve control"],
  dovish: ["rate cut","rate cuts","pivot","dovish","easing","qe","accommodative"],
  hawkish: ["rate hike","rate hikes","hawkish","tightening","qt","balance sheet reduction"],
  tariffs: ["tariff","tariffs","export control","export controls","sanction","sanctions","embargo","blacklist","retaliation","customs"],
  energy: ["opec","opec+","production cut","output cut","supply disruption","refinery outage","refinery fire","pipeline","gas pipeline","inventory draw"],
  usdWeak: ["usd slumps","dollar weakens","dollar falls","usd drops"],
  usdStrong: ["usd surges","dollar strengthens","usd jumps","dollar rises"]
};

function anyIn(text: string, keys: string[]) {
  const t = norm(text);
  return keys.some(k => t.includes(norm(k)));
}

function filterRecent(fin: RawArticle[]) {
  const lookback = Number(process.env.NEWS_LOOKBACK_HOURS || 96);
  return fin.filter(a => hoursSince(a.publishedAt) <= lookback);
}

function computeStrength(arts: RawArticle[], kw: string[], gate?: (t: string)=>boolean) {
  const recents = filterRecent(arts);
  const matched = recents.filter(a => {
    const t = `${a.title} ${a.description || ""}`;
    if (gate && !gate(t)) return false;
    return anyIn(t, kw);
  });
  if (!matched.length) return { s: 0, ev: [] as RawArticle[] };

  let src = 0, fresh = 0;
  for (const a of matched) {
    src += SRC_W[a.source] ?? 0.6;
    const h = hoursSince(a.publishedAt);
    fresh += h <= 24 ? 1 : h <= 48 ? 0.6 : 0.3;
  }
  const hitRatio = matched.length / Math.max(10, recents.length);
  const srcAvg   = src / matched.length;   // ~0.6..1
  const freshAvg = fresh / matched.length; // 0.3..1
  const s = 0.5*hitRatio + 0.3*(srcAvg - 0.5) + 0.2*(freshAvg);
  return { s: clamp(s, 0, 1), ev: matched.slice(0, 6) };
}

const gateUS   = (t: string) => anyIn(t, [...KW.fed, "u.s.","united states","washington"]);
const gateEU   = (t: string) => anyIn(t, [...KW.ecb, ...KW.boe, "eurozone","europe","uk"]);
const gateAsia = (t: string) => anyIn(t, [...KW.boj, "japan","tokyo","china","beijing","india","mumbai","shanghai"]);

export function detectDovishUS(arts: RawArticle[]): Signal {
  const { s, ev } = computeStrength(arts, KW.dovish, gateUS);
  return { key: "dovish_us", label: "Assouplissement monétaire (US)", region: "US", strength: s, evidences: ev };
}
export function detectHawkishUS(arts: RawArticle[]): Signal {
  const { s, ev } = computeStrength(arts, KW.hawkish, gateUS);
  return { key: "hawkish_us", label: "Durcissement monétaire (US)", region: "US", strength: s, evidences: ev };
}
export function detectTariffsUS(arts: RawArticle[]): Signal {
  const gate = (t: string) => anyIn(t, ["u.s.","united states","china","imports","exports","customs","white house"]);
  const { s, ev } = computeStrength(arts, KW.tariffs, gate);
  return { key: "tariffs_us", label: "Tarifs / Contrôles export (US/Chine)", region: "US", strength: s, evidences: ev };
}
export function detectEnergySupply(arts: RawArticle[]): Signal {
  const { s, ev } = computeStrength(arts, KW.energy);
  return { key: "energy_supply", label: "Chocs d’offre énergie (OPEC/refineries)", region: "Global", strength: s, evidences: ev };
}
export function detectUSDWeak(arts: RawArticle[]): Signal {
  const { s, ev } = computeStrength(arts, KW.usdWeak, gateUS);
  return { key: "usd_weak", label: "USD en repli", region: "US", strength: s, evidences: ev };
}
export function detectUSDStrong(arts: RawArticle[]): Signal {
  const { s, ev } = computeStrength(arts, KW.usdStrong, gateUS);
  return { key: "usd_strong", label: "USD en hausse", region: "US", strength: s, evidences: ev };
}

export function runAllDetectors(arts: RawArticle[]): Signal[] {
  return [
    detectDovishUS(arts),
    detectHawkishUS(arts),
    detectTariffsUS(arts),
    detectEnergySupply(arts),
    detectUSDWeak(arts),
    detectUSDStrong(arts),
  ];
}
