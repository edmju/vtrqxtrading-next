import OpenAI from "openai";
import { AiOutputs, RawArticle } from "./types";
import { writeJSON } from "../../src/lib/news/fs";

// ---------- Heuristique fallback (sans IA) ----------
function norm(s: string) {
  return (s || "")
    .toLowerCase()
    .replace(/[’‘´`]/g, "'")
    .normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{Letter}\p{Number}\s%]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type ThemeRule = { label: string; weight: number; includes: string[]; excludes?: string[] };
const THEME_RULES: ThemeRule[] = [
  { label: "Tarifs & contrôles export", weight: 1, includes: ["tariff","tariffs","export control","sanction","sanctions","embargo","blacklist","entity list"] },
  { label: "Pivot/Assouplissement monétaire", weight: 1, includes: ["rate cut","rate cuts","pivot","dovish","easing"] },
  { label: "Durcissement monétaire", weight: 1, includes: ["rate hike","rate hikes","hawkish","tightening","qt"] },
  { label: "Guidance & profits", weight: 1, includes: ["guidance raised","guidance cut","profit warning","earnings beat","earnings miss","revenue beat"] },
  { label: "M&A / Antitrust / Litiges", weight: 1, includes: ["merger","acquisition","takeover","buyout","antitrust","lawsuit","class action","fine","settlement","ec investigation","doj","ftc","sec probe"] },
  { label: "Énergie & offre", weight: 1, includes: ["opec","opec+","production cut","output cut","supply disruption","inventory draw","brent","wti","refinery outage","gas pipeline"] },
  { label: "Cybersécurité & ruptures", weight: 1, includes: ["data breach","hack","ransomware","shutdown","plant shutdown","supply chain disruption"] },
];

const DATA_WORDS = ["cpi","ppi","pce","nfp","payrolls","gdp","pmi","ism","survey","calendar"];

function makeHeuristicThemes(articles: RawArticle[], topN: number): { label: string; weight: number }[] {
  const cnt: Record<string, number> = {};
  for (const a of articles) {
    const t = norm(`${a.title} ${a.description || ""}`);
    for (const r of THEME_RULES) {
      if (r.includes.some(k => t.includes(norm(k))) && !(r.excludes || []).some(e => t.includes(norm(e)))) {
        cnt[r.label] = (cnt[r.label] || 0) + r.weight;
      }
    }
  }
  const themes = Object.entries(cnt)
    .map(([label, w]) => ({ label, weight: Math.round(w * 100) / 100 }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, topN);
  // Retire les thèmes “données” si jamais détectés indirectement
  return themes.filter(th => !DATA_WORDS.some(dw => norm(th.label).includes(dw)));
}

function pickSymbol(candidates: string[], pool: string[]) {
  for (const c of candidates) {
    const hit = pool.find(s => s.toUpperCase() === c.toUpperCase());
    if (hit) return hit;
  }
  return pool[0]; // fallback au 1er instrument disponible
}

function makeHeuristicActions(articles: RawArticle[], ftmo: string[], watch: string[], want = 4) {
  const text = norm(articles.map(a => a.title).join(" · "));
  if (ftmo.length === 0) return [];

  const actions: { symbol: string; direction: "BUY" | "SELL"; conviction: number; reason: string }[] = [];

  const has = (k: string) => text.includes(norm(k));

  // Tarifs / sanctions → risque macro : SELL US500 ou BUY XAUUSD
  if (has("tariff") || has("sanction") || has("embargo") || has("export control")) {
    const s = pickSymbol(["US500","NAS100","GER30","DE40","UK100","SPX500.cash"], ftmo);
    actions.push({ symbol: s, direction: "SELL", conviction: 6, reason: "Tarifs/sanctions réduisent la visibilité et le risque augmente." });
    const g = pickSymbol(["XAUUSD","GOLD"], ftmo);
    if (g) actions.push({ symbol: g, direction: "BUY", conviction: 6, reason: "Couverture macro face aux tensions commerciales." });
  }

  // Dovish / rate cuts → BUY indices, SELL USD
  if (has("rate cut") || has("dovish") || has("easing") || has("pivot")) {
    const s = pickSymbol(["US500","NAS100","GER30","DE40","UK100","SPX500.cash"], ftmo);
    actions.push({ symbol: s, direction: "BUY", conviction: 7, reason: "Assouplissement monétaire: soutien aux actifs risqués." });
    const fx = pickSymbol(["EURUSD","GBPUSD","AUDUSD"], ftmo);
    if (fx) actions.push({ symbol: fx, direction: "BUY", conviction: 5, reason: "Baisse attendue du USD en scénario dovish." });
  }

  // Hawkish / rate hikes → SELL indices, BUY USD
  if (has("rate hike") || has("hawkish") || has("tightening") || has("qt")) {
    const s = pickSymbol(["US500","NAS100","GER30","DE40","UK100","SPX500.cash"], ftmo);
    actions.push({ symbol: s, direction: "SELL", conviction: 7, reason: "Durcissement monétaire: pression sur valorisations." });
    const fx = pickSymbol(["EURUSD","GBPUSD","AUDUSD","USDJPY"], ftmo);
    if (fx) actions.push({ symbol: fx, direction: fx === "USDJPY" ? "BUY" : "SELL", conviction: 5, reason: "USD soutenu par un biais hawkish." });
  }

  // Énergie: coupures d’offre → BUY pétrole
  if (has("opec") || has("production cut") || has("output cut") || has("refinery outage")) {
    const oil = pickSymbol(["USOIL","UKOIL","WTI","BRENT"], ftmo);
    if (oil) actions.push({ symbol: oil, direction: "BUY", conviction: 6, reason: "Réduction d’offre: pression haussière sur le brut." });
  }

  // Évite > want
  return actions.slice(0, want);
}

// ---------- IA (OpenAI) + Fallback ----------
export async function analyzeWithAI(
  articles: RawArticle[],
  opts: { topThemes: number; ftmoSymbols: string[]; watchlist: string[] }
): Promise<AiOutputs> {
  const topThemes = Math.max(1, Number(opts.topThemes || 3));

  // Fallback si pas de clé → thèmes + actions heuristiques
  if (!process.env.OPENAI_API_KEY) {
    const themes = makeHeuristicThemes(articles, topThemes);
    const actions = makeHeuristicActions(articles, opts.ftmoSymbols, opts.watchlist);
    return {
      generatedAt: new Date().toISOString(),
      mainThemes: themes,
      actions
    };
  }

  // OpenAI dispo
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  const model = process.env.OPENAI_NEWS_MODEL || "gpt-4o-mini";

  const titles = articles.slice(0, 80).map(a => `- ${a.title}`).join("\n");

  const sys =
`You are a market analyst. From the list of headlines, extract ONLY structural market themes
(policy shifts, regulation, M&A, sanctions, tariffs, litigation, guidance, supply shocks, leadership change, antitrust, export controls).
EXCLUDE macro data releases (CPI, PPI, NFP, PMI, GDP prints), calendars or surveys from the themes.

Then suggest up to 4 trading actions on these instruments: ${opts.ftmoSymbols.join(", ")}.
Each action must include a direction (BUY/SELL), a short reason, and a conviction on a 0..10 scale.
Respond as a JSON object: { "mainThemes":[{"label":string,"weight":number}], "actions":[{"symbol":string,"direction":"BUY"|"SELL","conviction":number,"reason":string}] }`;

  const user = `Headlines:\n${titles}\nWatchlist priority: ${opts.watchlist.join(", ")}`;

  try {
    const r = await client.chat.completions.create({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user }
      ]
    });

    let out: AiOutputs = {
      generatedAt: new Date().toISOString(),
      mainThemes: [],
      actions: []
    };

    try {
      out = JSON.parse(r.choices[0]?.message?.content || "{}");
      out.generatedAt = new Date().toISOString();
    } catch {
      // Si parsing KO → bascule heuristique
      out = {
        generatedAt: new Date().toISOString(),
        mainThemes: makeHeuristicThemes(articles, topThemes),
        actions: makeHeuristicActions(articles, opts.ftmoSymbols, opts.watchlist)
      };
    }

    // Normalisation conviction 0..10 + trim
    out.actions = (out.actions || [])
      .filter(a => a?.symbol && a?.direction)
      .slice(0, 4)
      .map(a => ({
        symbol: String(a.symbol).toUpperCase(),
        direction: (String(a.direction).toUpperCase() === "SELL" ? "SELL" : "BUY") as "BUY" | "SELL",
        conviction: Math.max(0, Math.min(10, Number(a.conviction ?? 6))),
        reason: String(a.reason || "").slice(0, 240)
      }));

    out.mainThemes = (out.mainThemes || []).slice(0, topThemes);

    return out;
  } catch {
    // Si appel OpenAI échoue → heuristique
    return {
      generatedAt: new Date().toISOString(),
      mainThemes: makeHeuristicThemes(articles, topThemes),
      actions: makeHeuristicActions(articles, opts.ftmoSymbols, opts.watchlist)
    };
  }
}

export function persistAI(out: any, outFile: string) {
  writeJSON(outFile, out);
}
