import React from "react";
import path from "path";
import { promises as fs } from "fs";

export const dynamic = "force-dynamic";

type Article = {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  description?: string;
};

type NewsBundle = {
  generatedAt: string;
  total: number;
  articles: Article[];
};

type AIOutput = {
  generatedAt: string;
  mainThemes: { label: string; weight: number }[];
  actions: {
    symbol: string;
    direction: "BUY" | "SELL";
    conviction: number;
    reason: string;
  }[];
};

async function readJson<T>(rel: string, fallback: T): Promise<T> {
  try {
    const full = path.join(process.cwd(), "public", rel);
    const raw = await fs.readFile(full, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function getData() {
  const news = await readJson<NewsBundle>("data/news/latest.json", {
    generatedAt: "",
    total: 0,
    articles: [],
  });
  const ai = await readJson<AIOutput>("data/ai/latest.json", {
    generatedAt: "",
    mainThemes: [],
    actions: [],
  });
  return { news, ai };
}

export default async function NewsPage() {
  const { news, ai } = await getData();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-4">
      {/* Colonne 1 : News brutes */}
      <section className="lg:col-span-1 space-y-3">
        <div>
          <h2 className="text-xl font-semibold">News</h2>
          {news.generatedAt ? (
            <p className="text-sm opacity-70">
              Mise à jour: {new Date(news.generatedAt).toLocaleString()}
            </p>
          ) : (
            <p className="text-sm opacity-70">Aucune donnée chargée</p>
          )}
        </div>

        <ul className="space-y-2">
          {news.articles.slice(0, 150).map((a) => (
            <li key={a.id} className="p-3 rounded border terminal-panel">
              <a
                href={a.url}
                target="_blank"
                rel="noreferrer"
                className="font-medium hover:underline"
              >
                {a.title}
              </a>
              <div className="text-xs opacity-70 mt-1">
                {a.source} — {new Date(a.publishedAt).toLocaleString()}
              </div>
              {a.description ? (
                <p className="text-sm opacity-80 mt-2 line-clamp-3">{a.description}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      {/* Colonne 2 : Thèmes IA */}
      <section className="lg:col-span-1 space-y-3">
        <div>
          <h2 className="text-xl font-semibold">News principales</h2>
          {ai.generatedAt ? (
            <p className="text-sm opacity-70">
              IA: {new Date(ai.generatedAt).toLocaleString()}
            </p>
          ) : null}
        </div>

        <ul className="space-y-2">
          {ai.mainThemes.map((t, i) => (
            <li
              key={i}
              className="p-3 rounded border terminal-panel flex items-center justify-between"
            >
              <span>{t.label}</span>
              <span className="text-xs opacity-70">
                {typeof t.weight === "number" ? Math.round(t.weight * 100) / 100 : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Colonne 3 : Actions proposées */}
      <section className="lg:col-span-1 space-y-3">
        <h2 className="text-xl font-semibold">Actions proposées</h2>
        <ul className="space-y-2">
          {ai.actions.map((x, i) => (
            <li key={i} className="p-3 rounded border terminal-panel">
              <div className="font-semibold">
                {x.symbol} — {x.direction} — {x.conviction}/100
              </div>
              <p className="text-sm opacity-80 mt-1">{x.reason}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
