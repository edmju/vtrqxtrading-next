import path from "path";
import { promises as fs } from "fs";
import OpenAI from "openai";

type Article = {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  description?: string;
  score?: number;
  hits?: string[];
};

type NewsBundle = {
  generatedAt: string;
  total: number;
  articles: Article[];
};

type AIAction = {
  symbol: string;
  direction: "BUY" | "SELL";
  conviction: number;
  confidence: number;
  reason: string;
  evidenceIds?: string[];

  explanation?: string;
  horizon?: string;
  themeLabel?: string;
  articleCount?: number;
};

type AITheme = {
  label: string;
  weight: number;
  summary?: string;
  evidenceIds?: string[];
};

type AICluster = {
  label: string;
  weight: number;
  summary: string;
  articleIds: string[];
};

type AIOutput = {
  generatedAt: string;
  mainThemes: AITheme[];
  actions: AIAction[];
  clusters?: AICluster[];
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function readJson<T>(rel: string, fallback: T): Promise<T> {
  try {
    const full = path.join(process.cwd(), "public", rel);
    const raw = await fs.readFile(full, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(rel: string, data: unknown) {
  const full = path.join(process.cwd(), "public", rel);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, JSON.stringify(data, null, 2), "utf8");
}

async function buildExplanation(
  action: AIAction,
  themes: AITheme[],
  news: NewsBundle
): Promise<string> {
  const topThemes = themes.slice(0, 3).map((t) => ({
    label: t.label,
    summary: t.summary,
  }));

  const sampleArticles = news.articles.slice(0, 8).map((a) => ({
    title: a.title,
    source: a.source,
    score: a.score,
  }));

  const directionFr = action.direction === "BUY" ? "achat" : "vente";

  const messages = [
    {
      role: "system" as const,
      content:
        "Tu es un assistant de trading macro ultra concis. " +
        "Tu génères une explication courte (max 3 phrases) en français expliquant pourquoi le trade proposé est logique. " +
        "Style demandé : 'il se passe ça + ça + ça → donc il faut faire ça car…'. " +
        "Pas de préambule, pas de listes à puces, pas de 'En tant qu'IA'. " +
        "Réponds en une seule explication fluide, smart, orientée pro-trader.",
    },
    {
      role: "user" as const,
      content: JSON.stringify(
        {
          trade: {
            direction: action.direction,
            direction_fr: directionFr,
            symbol: action.symbol,
            conviction: action.conviction,
            confidence: action.confidence,
          },
          themeLabel: action.themeLabel,
          articleCount: action.articleCount,
          baseReason: action.reason,
          topThemes,
          sampleArticles,
        },
        null,
        2
      ),
    },
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages,
    max_tokens: 180,
    temperature: 0.5,
  });

  const text =
    completion.choices[0]?.message?.content?.trim() ||
    "";

  return text;
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.warn(
      "[news:enrich] Aucun OPENAI_API_KEY défini, les explications IA ne seront pas générées."
    );
    return;
  }

  const news = await readJson<NewsBundle>("data/news/latest.json", {
    generatedAt: "",
    total: 0,
    articles: [],
  });

  const ai = await readJson<AIOutput>("data/ai/latest.json", {
    generatedAt: "",
    mainThemes: [],
    actions: [],
    clusters: [],
  });

  if (!ai.actions.length) {
    console.log("[news:enrich] Aucun trade IA à enrichir.");
    return;
  }

  for (const action of ai.actions) {
    if (action.explanation && action.explanation.trim().length > 0) {
      continue; // déjà expliqué
    }

    try {
      const exp = await buildExplanation(action, ai.mainThemes, news);
      action.explanation = exp;
      console.log(
        `[news:enrich] Explication IA générée pour ${action.symbol} ${action.direction}:`,
        exp
      );
    } catch (err) {
      console.error("[news:enrich] Erreur OpenAI pour un trade:", err);
    }
  }

  await writeJson("data/ai/latest.json", ai);
  console.log(
    "[news:enrich] Fichier public/data/ai/latest.json mis à jour avec les explications IA."
  );
}

main().catch((err) => {
  console.error("[news:enrich] Erreur fatale:", err);
  process.exit(1);
});
