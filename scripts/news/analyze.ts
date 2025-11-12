// Analyse => thèmes + trades cohérents (logique dure, sans IA obligatoire)
import { AiOutputs, AiAction, RawArticle } from "./types";
import { runAllDetectors, Signal } from "./detectors";

function clamp(n: number, a: number, b: number) { return Math.max(a, Math.min(b, n)); }
function confPct(s: number) { return Math.round(Math.max(25, Math.min(95, 25 + s*70))); }
function pick(pool: string[], prefs: string[]) {
  for (const p of prefs) {
    const x = pool.find(s => s.toUpperCase() === p.toUpperCase());
    if (x) return x;
  }
  return pool[0] || "US500";
}
function defaultPool(ftmo: string[]) {
  const base = ["US500","NAS100","XAUUSD","EURUSD","USDJPY","USOIL","UKOIL","DE40","UK100"];
  return ftmo.length ? ftmo : base;
}
function reasonFrom(sig: Signal) {
  const tag = `${sig.label}`;
  const srcs = Array.from(new Set(sig.evidences.map(e => e.source))).slice(0,3).join("/");
  return `${tag} • sources: ${srcs}`;
}

function mapSignalsToActions(sigs: Signal[], pool: string[], maxOut = 4): AiAction[] {
  const minS = Number(process.env.NEWS_ACTION_MIN_STRENGTH || 0.35);

  const out: AiAction[] = [];
  const get = (k: string) => sigs.find(s => s.key === k)!;

  const dov = get("dovish_us");
  const haw = get("hawkish_us");
  const trf = get("tariffs_us");
  const eng = get("energy_supply");
  const uWeak = get("usd_weak");
  const uStr  = get("usd_strong");

  if (dov.strength >= Math.max(haw.strength, minS)) {
    const s = confPct(dov.strength);
    out.push({ symbol: pick(pool, ["US500","NAS100","DE40"]), direction: "BUY",  conviction: clamp(Math.round(6 + (dov.strength-0.5)*6),1,10), confidence: s, reason: reasonFrom(dov) });
    out.push({ symbol: pick(pool, ["EURUSD","GBPUSD","AUDUSD"]), direction: "BUY", conviction: clamp(Math.round(5 + (dov.strength-0.5)*5),1,10), confidence: s, reason: reasonFrom(dov) });
  }

  if (haw.strength > dov.strength && haw.strength >= minS) {
    const s = confPct(haw.strength);
    out.push({ symbol: pick(pool, ["US500","NAS100"]), direction: "SELL", conviction: clamp(Math.round(7 + (haw.strength-0.5)*5),1,10), confidence: s, reason: reasonFrom(haw) });
    out.push({ symbol: pick(pool, ["USDJPY","EURUSD"]), direction: pick(pool, ["USDJPY"]) ? "BUY" : "SELL", conviction: clamp(Math.round(5 + (haw.strength-0.5)*5),1,10), confidence: s, reason: reasonFrom(haw) });
  }

  if (trf.strength >= minS) {
    const s = confPct(trf.strength);
    out.push({ symbol: pick(pool, ["US500"]), direction: "SELL", conviction: clamp(Math.round(6 + (trf.strength-0.5)*6),1,10), confidence: s, reason: reasonFrom(trf) });
    out.push({ symbol: pick(pool, ["XAUUSD"]), direction: "BUY",  conviction: clamp(Math.round(5 + (trf.strength-0.5)*5),1,10), confidence: s, reason: reasonFrom(trf) });
  }

  if (eng.strength >= minS) {
    const s = confPct(eng.strength);
    out.push({ symbol: pick(pool, ["USOIL","UKOIL"]), direction: "BUY", conviction: clamp(Math.round(6 + (eng.strength-0.5)*5),1,10), confidence: s, reason: reasonFrom(eng) });
  }

  if (uWeak.strength >= minS && (!dov || uWeak.strength > haw.strength)) {
    const s = confPct(uWeak.strength);
    out.push({ symbol: pick(pool, ["EURUSD","GBPUSD"]), direction: "BUY", conviction: clamp(Math.round(5 + (uWeak.strength-0.5)*5),1,10), confidence: s, reason: reasonFrom(uWeak) });
  }
  if (uStr.strength >= minS && (!dov || uStr.strength > uWeak.strength)) {
    const s = confPct(uStr.strength);
    out.push({ symbol: pick(pool, ["EURUSD"]), direction: "SELL", conviction: clamp(Math.round(5 + (uStr.strength-0.5)*5),1,10), confidence: s, reason: reasonFrom(uStr) });
  }

  // dédoublonnage → garder l'action la plus confiante par symbole
  const best = new Map<string, AiAction>();
  for (const a of out) {
    const prev = best.get(a.symbol);
    if (!prev || a.confidence > prev.confidence) best.set(a.symbol, a);
  }
  return Array.from(best.values()).sort((a,b)=>b.confidence-a.confidence).slice(0, maxOut);
}

export async function analyzeWithAI(
  articles: RawArticle[],
  opts: { topThemes: number; ftmoSymbols: string[]; watchlist: string[] }
): Promise<AiOutputs> {
  const pool = (opts.ftmoSymbols && opts.ftmoSymbols.length) ? opts.ftmoSymbols : ["US500","NAS100","XAUUSD","EURUSD","USDJPY","USOIL","UKOIL","DE40","UK100"];

  const sigs = runAllDetectors(articles);
  const themes = sigs
    .filter(s => s.strength > 0)
    .sort((a,b)=>b.strength-a.strength)
    .slice(0, Math.max(1, Number(opts.topThemes || 3)))
    .map(s => ({ label: s.label, weight: Math.round(s.strength*100)/100 }));

  const actions = mapSignalsToActions(sigs, pool, Number(process.env.NEWS_ACTIONS_MAX || 4));

  return {
    generatedAt: new Date().toISOString(),
    mainThemes: themes,
    actions
  };
}

export function persistAI(out: any, outFile: string) {
  // conservé pour compat
  const { writeFileSync } = await import("fs");
  writeFileSync(outFile, JSON.stringify(out, null, 2));
}
