"use client";

import React from "react";

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
type AITheme = { label: string; weight: number; summary?: string; evidenceIds?: string[] };
type AIAction = { symbol: string; direction: "BUY" | "SELL"; conviction: number; confidence: number; reason: string; evidenceIds?: string[] };
type AICluster = { label: string; weight: number; summary: string; articleIds: string[] };
type AIOutput = {
  generatedAt: string;
  mainThemes: AITheme[];
  actions: AIAction[];
  clusters?: AICluster[];
};

function badgeDir(d: "BUY" | "SELL") {
  return d === "BUY" ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-600/30" : "bg-rose-500/15 text-rose-300 ring-1 ring-rose-600/30";
}
function badgeConf(c: number) {
  if (c >= 80) return "bg-green-500/20 text-green-300 ring-1 ring-green-600/40";
  if (c >= 60) return "bg-lime-500/20 text-lime-300 ring-1 ring-lime-600/40";
  if (c >= 40) return "bg-amber-500/20 text-amber-300 ring-1 ring-amber-600/40";
  return "bg-rose-500/20 text-rose-300 ring-1 ring-rose-600/40";
}

export default function NewsClient({ news, ai }: { news: NewsBundle; ai: AIOutput }) {
  const [q, setQ] = React.useState("");
  const [source, setSource] = React.useState<string>("all");
  const [hours, setHours] = React.useState<number>(48);
  const [focusIds, setFocusIds] = React.useState<string[]>([]);
  const index = React.useMemo(() => new Map(news.articles.map(a => [a.id, a])), [news.articles]);

  const sources = React.useMemo(
    () => Array.from(new Set(news.articles.map(a => a.source))).sort(),
    [news.articles]
  );

  const filtered = React.useMemo(() => {
    const now = Date.now();
    const match = (a: Article) => {
      if (source !== "all" && a.source !== source) return false;
      if (hours && now - new Date(a.publishedAt).getTime() > hours * 3600_000) return false;
      if (q) {
        const s = (a.title + " " + (a.description || "") + " " + (a.hits || []).join(" ")).toLowerCase();
        if (!s.includes(q.toLowerCase())) return false;
      }
      if (focusIds.length && !focusIds.includes(a.id)) return false;
      return true;
    };
    return news.articles.filter(match);
  }, [news.articles, q, source, hours, focusIds]);

  const openEvidence = (ids: string[] | undefined) => {
    setFocusIds((ids || []).filter(Boolean));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 p-6">
      {/* Left: filters + headlines */}
      <div className="xl:col-span-5 space-y-3">
        <div className="rounded-xl p-4 bg-gradient-to-b from-sky-900/30 to-sky-600/10 ring-1 ring-sky-500/20">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-sky-200">News</h2>
              <p className="text-sm text-sky-300/70">Mise à jour: {news.generatedAt ? new Date(news.generatedAt).toLocaleString() : "-"}</p>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="filtrer (mot)"
                className="px-2 py-1 rounded bg-black/40 text-sky-100 ring-1 ring-sky-700/40"
              />
              <select value={source} onChange={e => setSource(e.target.value)} className="px-2 py-1 rounded bg-black/40 text-sky-100 ring-1 ring-sky-700/40">
                <option value="all">sources: toutes</option>
                {sources.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={String(hours)} onChange={e => setHours(Number(e.target.value))} className="px-2 py-1 rounded bg-black/40 text-sky-100 ring-1 ring-sky-700/40">
                <option value="12">12h</option>
                <option value="24">24h</option>
                <option value="48">48h</option>
                <option value="96">96h</option>
                <option value="0">tout</option>
              </select>
            </div>
          </div>
        </div>

        <ul className="space-y-2">
          {filtered.map((a) => (
            <li key={a.id} className="p-4 rounded-xl bg-neutral-900/60 ring-1 ring-neutral-700/40 hover:ring-sky-500/40 transition">
              <a href={a.url} target="_blank" rel="noreferrer" className="font-semibold hover:underline text-neutral-100">
                {a.title}
              </a>
              <div className="text-xs text-neutral-400 mt-1 flex flex-wrap items-center gap-2">
                <span>{a.source}</span>
                <span>— {new Date(a.publishedAt).toLocaleString()}</span>
                {typeof a.score === "number" && <span className="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-300 ring-1 ring-sky-600/30">score {a.score}</span>}
              </div>
              {a.hits && a.hits.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {a.hits.slice(0, 8).map((h, idx) => (
                    <span key={idx} className="text-xs px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 ring-1 ring-indigo-600/30">{h}</span>
                  ))}
                </div>
              )}
              {a.description ? <p className="text-sm text-neutral-300 mt-2 line-clamp-3">{a.description}</p> : null}
            </li>
          ))}
          {filtered.length === 0 && <li className="text-sm text-neutral-400">Aucune actualité à afficher avec ces filtres.</li>}
        </ul>
      </div>

      {/* Middle: AI themes + clusters */}
      <div className="xl:col-span-3 space-y-3">
        <div className="rounded-xl p-4 bg-gradient-to-b from-violet-900/30 to-violet-600/10 ring-1 ring-violet-500/20">
          <h2 className="text-xl font-semibold text-violet-200">News principales</h2>
          <p className="text-sm text-violet-300/70">IA: {ai.generatedAt ? new Date(ai.generatedAt).toLocaleString() : "-"}</p>
        </div>

        {/* Themes */}
        <ul className="space-y-2">
          {ai.mainThemes.map((t, i) => (
            <li key={i} className="p-3 rounded-xl bg-neutral-900/60 ring-1 ring-neutral-700/40">
              <div className="flex items-center justify-between">
                <span className="text-neutral-100">{t.label}</span>
                <span className="text-xs text-neutral-400">{Math.round((t.weight ?? 0) * 100)}/100</span>
              </div>
              {t.summary && <p className="text-sm text-neutral-300 mt-1">{t.summary}</p>}
              {(t.evidenceIds && t.evidenceIds.length > 0) && (
                <button onClick={() => openEvidence(t.evidenceIds)} className="text-xs text-violet-300 underline mt-2">voir preuves ({t.evidenceIds.length})</button>
              )}
            </li>
          ))}
          {ai.mainThemes.length === 0 && <li className="text-sm text-neutral-400 p-3">Aucun thème clé (hors datas) généré.</li>}
        </ul>

        {/* Clusters */}
        {ai.clusters && ai.clusters.length > 0 && (
          <div className="space-y-2">
            <div className="text-violet-200 font-semibold mt-4">Clusters</div>
            {ai.clusters.map((c, i) => (
              <div key={i} className="p-3 rounded-xl bg-neutral-900/60 ring-1 ring-neutral-700/40">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-100">{c.label}</span>
                  <span className="text-xs text-neutral-400">{(c.articleIds || []).length} art.</span>
                </div>
                <p className="text-sm text-neutral-300 mt-1">{c.summary}</p>
                {(c.articleIds && c.articleIds.length > 0) && (
                  <button onClick={() => openEvidence(c.articleIds)} className="text-xs text-violet-300 underline mt-2">focus ({c.articleIds.length})</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: AI actions */}
      <div className="xl:col-span-4 space-y-3">
        <div className="rounded-xl p-4 bg-gradient-to-b from-emerald-900/30 to-emerald-600/10 ring-1 ring-emerald-500/20">
          <h2 className="text-xl font-semibold text-emerald-200">Actions proposées</h2>
        </div>
        <ul className="space-y-2">
          {ai.actions.map((x, i) => {
            const proofs = (x.evidenceIds || []).map(id => index.get(id)).filter(Boolean) as Article[];
            return (
              <li key={i} className="p-4 rounded-xl bg-neutral-900/60 ring-1 ring-neutral-700/40">
                <div className="flex items-center justify-between">
                  <div className={`px-2 py-1 rounded ${badgeDir(x.direction)}`}>{x.direction}</div>
                  <div className={`px-2 py-1 rounded text-sm ${badgeConf(x.confidence)}`}>Confiance {x.confidence}/100</div>
                </div>
                <div className="mt-2 text-neutral-100 font-semibold">
                  {x.symbol} <span className="text-neutral-400 font-normal">• Conviction {x.conviction}/10</span>
                </div>
                <p className="text-sm text-neutral-300 mt-1">{x.reason}</p>
                {proofs.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {proofs.slice(0, 6).map((p, k) => (
                      <li key={k} className="text-xs text-neutral-400">
                        • <a className="underline hover:text-neutral-200" href={p.url} target="_blank" rel="noreferrer">{p.source}: {p.title}</a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
          {ai.actions.length === 0 && <li className="text-sm text-neutral-400 p-3">Aucune action proposée (pas de signal robuste).</li>}
        </ul>
      </div>
    </div>
  );
}
