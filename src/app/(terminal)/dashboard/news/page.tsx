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
  actions: { symbol: string; direction: "BUY" | "SELL"; conviction: number; reason: string }[];
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

function badgeDir(d: "BUY" | "SELL") {
  return d === "BUY" ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-600/30" : "bg-rose-500/15 text-rose-300 ring-1 ring-rose-600/30";
}

export default async function NewsPage() {
  const { news, ai } = await getData();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
      {/* Col 1: News (déjà filtrées 'hot') */}
      <section className="lg:col-span-1 space-y-3">
        <div className="rounded-xl p-4 bg-gradient-to-b from-sky-900/30 to-sky-600/10 ring-1 ring-sky-500/20">
          <h2 className="text-xl font-semibold text-sky-200">News</h2>
          <p className="text-sm text-sky-300/70">
            {news.generatedAt ? `Mise à jour: ${new Date(news.generatedAt).toLocaleString()}` : "Aucune donnée chargée"}
          </p>
        </div>
        <ul className="space-y-2">
          {news.articles.map((a) => (
            <li key={a.id} className="p-4 rounded-xl bg-neutral-900/60 ring-1 ring-neutral-700/40 hover:ring-sky-500/40 transition">
              <a href={a.url} target="_blank" rel="noreferrer" className="font-semibold hover:underline text-neutral-100">
                {a.title}
              </a>
              <div className="text-xs text-neutral-400 mt-1">
                {a.source} — {new Date(a.publishedAt).toLocaleString()}
              </div>
              {a.description ? (
                <p className="text-sm text-neutral-300 mt-2 line-clamp-3">{a.description}</p>
              ) : null}
            </li>
          ))}
          {news.articles.length === 0 && (
            <li className="text-sm text-neutral-400">Aucune actualité “hot” pour l’instant.</li>
          )}
        </ul>
      </section>

      {/* Col 2: Thèmes IA (hors datas) */}
      <section className="lg:col-span-1 space-y-3">
        <div className="rounded-xl p-4 bg-gradient-to-b from-violet-900/30 to-violet-600/10 ring-1 ring-violet-500/20">
          <h2 className="text-xl font-semibold text-violet-200">News principales</h2>
          {ai.generatedAt && (
            <p className="text-sm text-violet-300/70">IA: {new Date(ai.generatedAt).toLocaleString()}</p>
          )}
        </div>
        <ul className="space-y-2">
          {ai.mainThemes.map((t, i) => (
            <li key={i} className="p-3 rounded-xl bg-neutral-900/60 ring-1 ring-neutral-700/40 flex items-center justify-between">
              <span className="text-neutral-100">{t.label}</span>
              <span className="text-xs text-neutral-400">{typeof t.weight === "number" ? Math.round(t.weight * 100) / 100 : ""}</span>
            </li>
          ))}
          {ai.mainThemes.length === 0 && (
            <li className="text-sm text-neutral-400 p-3">Aucun thème clé (hors datas) généré.</li>
          )}
        </ul>
      </section>

      {/* Col 3: Actions proposées (/10) */}
      <section className="lg:col-span-1 space-y-3">
        <div className="rounded-xl p-4 bg-gradient-to-b from-emerald-900/30 to-emerald-600/10 ring-1 ring-emerald-500/20">
          <h2 className="text-xl font-semibold text-emerald-200">Actions proposées</h2>
        </div>
        <ul className="space-y-2">
          {ai.actions.map((x, i) => (
            <li key={i} className="p-4 rounded-xl bg-neutral-900/60 ring-1 ring-neutral-700/40">
              <div className="flex items-center justify-between">
                <div className={`px-2 py-1 rounded ${badgeDir(x.direction)}`}>{x.direction}</div>
                <div className="text-sm text-neutral-300">Conviction: <span className="font-semibold">{x.conviction}/10</span></div>
              </div>
              <div className="mt-2 text-neutral-100 font-semibold">{x.symbol}</div>
              <p className="text-sm text-neutral-300 mt-1">{x.reason}</p>
            </li>
          ))}
          {ai.actions.length === 0 && (
            <li className="text-sm text-neutral-400 p-3">Aucune action proposée aujourd’hui.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
