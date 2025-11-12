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
};

type AIOutput = {
  generatedAt: string;
  mainThemes: { label: string; weight: number }[];
  actions: AIAction[];
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
  return d === "BUY"
    ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-600/30"
    : "bg-rose-500/15 text-rose-300 ring-1 ring-rose-600/30";
}

function badgeConf(c: number) {
  if (c >= 80) return "bg-green-500/20 text-green-300 ring-1 ring-green-600/40";
  if (c >= 60) return "bg-lime-500/20 text-lime-300 ring-1 ring-lime-600/40";
  if (c >= 40) return "bg-amber-500/20 text-amber-300 ring-1 ring-amber-600/40";
  return "bg-rose-500/20 text-rose-300 ring-1 ring-rose-600/40";
}

export default async function NewsPage() {
  const { news, ai } = await getData();

  // Index des articles par id
  const index = new Map(news.articles.map(a => [a.id, a]));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">

      {/* ========== COLONNE NEWS ========== */}
      <section className="lg:col-span-1 space-y-3">
        <div className="rounded-xl p-4 bg-gradient-to-b from-sky-900/30 to-sky-600/10 ring-1 ring-sky-500/20">
          <h2 className="text-xl font-semibold text-sky-200">News</h2>
          <p className="text-sm text-sky-300/70">
            {news.generatedAt
              ? `Mise à jour: ${new Date(news.generatedAt).toLocaleString()}`
              : "Aucune donnée chargée"}
          </p>
        </div>

        <ul className="space-y-2">
          {news.articles.map((a) => (
            <li
              key={a.id}
              className="p-4 rounded-xl bg-neutral-900/60 ring-1 ring-neutral-700/40 hover:ring-sky-500/40 transition"
            >
              <a
                href={a.url}
                target="_blank"
                rel="noreferrer"
                className="font-semibold hover:underline text-neutral-100"
              >
                {a.title}
              </a>

              <div className="text-xs text-neutral-400 mt-1 flex flex-wrap items-center gap-2">
                <span>{a.source}</span>
                <span>— {new Date(a.publishedAt).toLocaleString()}</span>
                {typeof a.score === "number" && (
                  <span className="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-300 ring-1 ring-sky-600/30">
                    score {a.score}
                  </span>
                )}
              </div>

              {a.hits && a.hits.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {a.hits.slice(0, 6).map((h, idxHit) => (
                    <span
                      key={idxHit}
                      className="text-xs px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 ring-1 ring-indigo-600/30"
                    >
                      {h}
                    </span>
                  ))}
                </div>
              )}

              {a.description && (
                <p className="text-sm text-neutral-300 mt-2 line-clamp-3">
                  {a.description}
                </p>
              )}
            </li>
          ))}

          {news.articles.length === 0 && (
            <li className="text-sm text-neutral-400">
              Aucune actualité “hot” pour l’instant.
            </li>
          )}
        </ul>
      </section>

      {/* ========== COLONNE THEMES IA ========== */}
      <section className="lg:col-span-1 space-y-3">
        <div className="rounded-xl p-4 bg-gradient-to-b from-violet-900/30 to-violet-600/10 ring-1 ring-violet-500/20">
          <h2 className="text-xl font-semibold text-violet-200">News principales</h2>
          {ai.generatedAt && (
            <p className="text-sm text-violet-300/70">
              IA: {new Date(ai.generatedAt).toLocaleString()}
            </p>
          )}
        </div>

        <ul className="space-y-2">
          {ai.mainThemes.map((t, idxTheme) => (
            <li
              key={idxTheme}
              className="p-3 rounded-xl bg-neutral-900/60 ring-1 ring-neutral-700/40 flex items-center justify-between"
            >
              <span className="text-neutral-100">{t.label}</span>
              <span className="text-xs text-neutral-400">{t.weight}</span>
            </li>
          ))}

          {ai.mainThemes.length === 0 && (
            <li className="text-sm text-neutral-400 p-3">
              Aucun thème clé (hors datas) généré.
            </li>
          )}
        </ul>
      </section>

      {/* ========== COLONNE ACTIONS ========== */}
      <section className="lg:col-span-1 space-y-3">
        <div className="rounded-xl p-4 bg-gradient-to-b from-emerald-900/30 to-emerald-600/10 ring-1 ring-emerald-500/20">
          <h2 className="text-xl font-semibold text-emerald-200">Actions proposées</h2>
        </div>

        <ul className="space-y-2">
          {ai.actions.map((x, idxAction) => {
            const proofs = (x.evidenceIds || [])
              .map(id => index.get(id))
              .filter(Boolean) as Article[];

            return (
              <li
                key={idxAction}
                className="p-4 rounded-xl bg-neutral-900/60 ring-1 ring-neutral-700/40"
              >
                <div className="flex items-center justify-between">
                  <div className={`px-2 py-1 rounded ${badgeDir(x.direction)}`}>
                    {x.direction}
                  </div>

                  <div className={`px-2 py-1 rounded text-sm ${badgeConf(x.confidence)}`}>
                    Confiance {x.confidence}/100
                  </div>
                </div>

                <div className="mt-2 text-neutral-100 font-semibold">
                  {x.symbol}
                  <span className="text-neutral-400 font-normal">
                    • Conviction {x.conviction}/10
                  </span>
                </div>

                <p className="text-sm text-neutral-300 mt-1">{x.reason}</p>

                {proofs.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {proofs.map((p, idxProof) => (
                      <li key={idxProof} className="text-xs text-neutral-400">
                        •{" "}
                        <a
                          className="underline hover:text-neutral-200"
                          href={p.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {p.source}: {p.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}

          {ai.actions.length === 0 && (
            <li className="text-sm text-neutral-400 p-3">
              Aucune action proposée aujourd’hui (pas de signal robuste).
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
