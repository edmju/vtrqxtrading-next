import OpenAI from "openai";
import { AiOutputs, RawArticle } from "./types";
import { writeJSON } from "../../src/lib/news/fs";

export async function analyzeWithAI(
  articles: RawArticle[],
  opts: { topThemes: number; ftmoSymbols: string[]; watchlist: string[] }
): Promise<AiOutputs> {
  if (!process.env.OPENAI_API_KEY) {
    return {
      generatedAt: new Date().toISOString(),
      mainThemes: [],
      actions: []
    };
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  const model = process.env.OPENAI_NEWS_MODEL || "gpt-4o-mini";

  const titles = articles.slice(0, 80).map(a => `- ${a.title}`).join("\n");

  // IMPORTANT : on exclut les "data releases" (CPI, NFP, PMI...) des thèmes.
  const sys =
`You are a market analyst. From the list of headlines, extract ONLY structural market themes
(policy shifts, regulation, M&A, sanctions, tariffs, litigation, guidance, supply shocks, leadership change, antitrust, export controls).
EXCLUDE macro data releases (CPI, PPI, NFP, PMI, GDP prints), calendars or surveys from the themes.

Then suggest up to 4 trading actions on these instruments: ${opts.ftmoSymbols.join(", ")}.
Each action must include a direction (BUY/SELL), a short reason, and a conviction on a 0..10 scale.
Respond as a JSON object: { "mainThemes":[{"label":string,"weight":number}], "actions":[{"symbol":string,"direction":"BUY"|"SELL","conviction":number,"reason":string}] }`;

  const user = `Headlines:\n${titles}\nWatchlist priority: ${opts.watchlist.join(", ")}`;

  const r = await client.chat.completions.create({
    model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: sys },
      { role: "user", content: user }
    ]
  });

  let parsed: AiOutputs = {
    generatedAt: new Date().toISOString(),
    mainThemes: [],
    actions: []
  };

  try {
    parsed = JSON.parse(r.choices[0]?.message?.content || "{}");
    parsed.generatedAt = new Date().toISOString();
  } catch {}

  // Normalisation: conviction 0..10
  parsed.actions = (parsed.actions || [])
    .filter(a => a?.symbol && a?.direction)
    .slice(0, 4)
    .map(a => ({
      symbol: String(a.symbol).toUpperCase(),
      direction: (String(a.direction).toUpperCase() === "SELL" ? "SELL" : "BUY") as "BUY" | "SELL",
      conviction: Math.max(0, Math.min(10, Number(a.conviction ?? 6))),
      reason: String(a.reason || "").slice(0, 240)
    }));

  parsed.mainThemes = (parsed.mainThemes || []).slice(0, Number(process.env.NEWS_TOP_THEMES || 3));

  return parsed;
}

export function persistAI(out: any, outFile: string) {
  writeJSON(outFile, out);
}
