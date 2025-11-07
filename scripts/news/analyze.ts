import OpenAI from "openai";
import { AiOutputs, RawArticle } from "./types";
import { writeJSON } from "../../src/lib/news/fs";

export async function analyzeWithAI(
  articles: RawArticle[],
  opts: { topThemes: number; ftmoSymbols: string[]; watchlist: string[] }
): Promise<AiOutputs> {
  const hasOpenAI = !!process.env.OPENAI_API_KEY;

  // Si pas de clé OpenAI, on renvoie un résultat minimal sans appeler l'API
  if (!hasOpenAI) {
    return {
      generatedAt: new Date().toISOString(),
      mainThemes: [],
      actions: []
    };
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  const model = process.env.OPENAI_NEWS_MODEL || "gpt-4o-mini";

  const titles = articles.slice(0, 120).map(a => `- ${a.title}`).join("\n");
  const sys = `Tu es un analyste marchés. Regroupe les titres en ${opts.topThemes} thèmes (≤5 mots chacun), puis propose jusqu'à 4 trades sur ${opts.ftmoSymbols.join(
    ", "
  )}. Réponds en JSON avec {mainThemes:[{label,weight}], actions:[{symbol,direction,conviction,reason}]}.`;
  const user = `Titres récents:\n${titles}\nWatchlist prioritaire: ${opts.watchlist.join(", ")}`;

  const r = await client.chat.completions.create({
    model,
    temperature: 0.3,
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
  } catch {
    // en cas d'erreur de parsing, on garde un résultat vide
  }

  parsed.actions = (parsed.actions || [])
    .filter(a => a?.symbol && a?.direction)
    .slice(0, 4)
    .map(a => ({
      symbol: String(a.symbol).toUpperCase(),
      direction: (String(a.direction).toUpperCase() === "SELL" ? "SELL" : "BUY") as "BUY" | "SELL",
      conviction: Math.max(0, Math.min(100, Number(a.conviction ?? 60))),
      reason: String(a.reason || "").slice(0, 240)
    }));

  parsed.mainThemes = (parsed.mainThemes || []).slice(0, Number(process.env.NEWS_TOP_THEMES || 3));

  return parsed;
}

export function persistAI(out: any, outFile: string) {
  writeJSON(outFile, out);
}
