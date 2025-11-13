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
  conviction: number; // 0..10
  confidence: number; // 0..100
  reason: string;
  evidenceIds?: string[];
};

type AITheme = {
  label: string;
  weight: number; // 0..1
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
    clusters: [],
  });

  return { news, ai };
}

function hoursSince(iso: string) {
  if (!iso) return 9999;
  return (Date.now() - new Date(iso).getTime()) / 36e5;
}

function impactLabel(score?: number, publishedAt?: string) {
  const s = score ?? 0;
  const h = hoursSince(publishedAt || "");
  if (s >= 15 && h <= 24) return "High";
  if (s >= 8 && h <= 72) return "Medium";
  if (s >= 4) return "Low";
  return "Very low";
}

function impactClass(label: string) {
  switch (label) {
    case "High":
      return "bg-rose-500/20 text-rose-200 ring-1 ring-rose-500/50";
    case "Medium":
      return "bg-amber-500/20 text-amber-200 ring-1 ring-amber-500/40";
    case "Low":
      return "bg-sky-500/20 text-sky-200 ring-1 ring-sky-500/30";
    default:
      return "bg-neutral-700/40 text-neutral-300 ring-1 ring-neutral-600/50";
  }
}

function badgeDir(d: "BUY" | "SELL") {
  return d === "BUY"
    ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-600/40"
    : "bg-rose-500/20 text-rose-300 ring-1 ring-rose-600/40";
}

function badgeConf(c: number) {
  if (c >= 80) return "bg-green-500/20 text-green-300 ring-1 ring-green-600/40";
  if (c >= 60) return "bg-lime-500/20 text-lime-300 ring-1 ring-lime-600/40";
  if (c >= 40) return "bg-amber-500/20 text-amber-300 ring-1 ring-amber-600/40";
  return "bg-rose-500/20 text-rose-300 ring-1 ring-rose-600/40";
}

function inferMarketRegime(themes: AITheme[], actions: AIAction[]) {
  const text = (themes.map(t => t.label + " " + (t.summary || "")).join(" ") +
    " " +
    actions.map(a => a.reason).join(" ")
  ).toLowerCase();

  const hasDovish =
    text.includes("dovish") ||
    text.includes("assouplissement") ||
    text.includes("rate cut") ||
    text.includes("pivot");
  const hasHawkish =
    text.includes("hawkish") ||
    text.includes("durcissement") ||
    text.includes("rate hike") ||
    text.includes("tightening");
  const hasRiskOff =
    text.includes("tariff") ||
    text.includes("sanction") ||
    text.includes("embargo") ||
    text.includes("crisis") ||
    text.includes("shutdown") ||
    text.includes("default");
  const hasEnergyShock =
    text.includes("opec") ||
    text.includes("production cut") ||
    text.includes("refinery") ||
    text.includes("gas") ||
    text.includes("oil");

  if (hasDovish && !hasRiskOff && !hasHawkish) {
    return "Tendance plutôt risk-on : narratif d’assouplissement monétaire dominant.";
  }
  if (hasHawkish && !hasRiskOff) {
    return "Tendance plutôt risk-off : durcissement monétaire mis en avant.";
  }
  if (hasRiskOff || hasEnergyShock) {
    return "Tendance prudente : focus sur risques politiques, tarifs ou chocs d’offre.";
  }
  return "Régime neutre : news dispersées sans driver macro évident.";
}

function inferFocus(themes: AITheme[]) {
  if (!themes.length) return "Pas de cluster clair, flux de news dispersé.";
  const names = themes.slice(0, 3).map(t => t.label);
  return `Focales du moment : ${names.join(" · ")}.`;
}

export default async function NewsPage() {
  const { news, ai } = await getData();

  // index des articles par id
  const index = new Map(news.articles.map(a => [a.id, a]));

  // mapping articleId -> thèmes (labels)
  const articleThemes = new Map<string, string[]>();
  ai.mainThemes.forEach(t => {
    (t.evidenceIds || []).forEach(id => {
      if (!id) return;
      const list = articleThemes.get(id) || [];
      if (!list.includes(t.label)) list.push(t.label);
      articleThemes.set(id, list);
    });
  });

  // compte d’articles par thème
  const themeCounts: Record<string, number> = {};
  ai.mainThemes.forEach(t => {
    const n = (t.evidenceIds || []).filter(id => index.has(id)).length;
    themeCounts[t.label] = n;
  });

  // resume global
  const totalNews = news.articles.length;
  const totalThemes = ai.mainThemes.length;
  const totalActions = ai.actions.length;

  const regimeText = inferMarketRegime(ai.mainThemes, ai.actions);
  const focusText = inferFocus(ai.mainThemes);

  // news triées par date desc
  const sortedNews = [...news.articles].sort(
    (a, b) =>
      +new Date(b.publishedAt) - +new Date(a.publishedAt)
  );

  return (
    <main className="p-6 space-y-6">

      {/* ======= BANDEAU MARKET BRIEFING ======= */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl p-4 bg-gradient-to-br from-sky-900/60 via-sky-800/40 to-sky-600/10 ring-1 ring-sky-500/40">
          <div className="text-sm uppercase tracking-wide text-sky-300/80">
            Market briefing
          </div>
          <div className="mt-2 flex gap-6 text-sm text-sky-100">
            <div>
              <div className="text-2xl font-semibold">{totalNews}</div>
              <div className="text-xs text-sky-300/80">news “hot” du jour</div>
            </div>
            <div>
              <div className="text-2xl font-semibold">{totalThemes}</div>
              <div className="text-xs text-sky-300/80">thèmes IA</div>
            </div>
            <div>
              <div className="text-2xl font-semibold">{totalActions}</div>
              <div className="text-xs text-sky-300/80">idées de trade</div>
            </div>
          </div>
          <div className="mt-3 text-xs text-sky-200/80">
            Dernière collecte :{" "}
            {news.generatedAt
              ? new Date(news.generatedAt).toLocaleString()
              : "—"}
          </div>
        </div>

        <div className="rounded-2xl p-4 bg-gradient-to-br from-violet-900/60 via-violet-800/40 to-violet-600/10 ring-1 ring-violet-500/40">
          <div className="text-sm uppercase tracking-wide text-violet-300/80">
            Régime de marché (vue IA)
          </div>
          <p className="mt-2 text-sm text-violet-50">{regimeText}</p>
        </div>

        <div className="rounded-2xl p-4 bg-gradient-to-br from-emerald-900/60 via-emerald-800/40 to-emerald-600/10 ring-1 ring-emerald-500/40">
          <div className="text-sm uppercase tracking-wide text-emerald-300/80">
            Focales du moment
          </div>
          <p className="mt-2 text-sm text-emerald-50">{focusText}</p>
        </div>
      </section>

      {/* ======= LAYOUT 3 COLONNES ======= */}
      <section className="grid gap-6 lg:grid-cols-[2.2fr,1.9fr,1.7fr]">

        {/* === COLONNE 1 : NEWS STREAM === */}
        <section className="space-y-3">
          <div className="px-1 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-100">
              Flux d’actualités tradables
            </h2>
            <span className="text-xs text-neutral-400">
              Impact estimé par score + fraîcheur
            </span>
          </div>

          <ul className="space-y-2">
            {sortedNews.map((a) => {
              const impLabel = impactLabel(a.score, a.publishedAt);
              const themesForArticle = articleThemes.get(a.id) || [];
              return (
                <li
                  key={a.id}
                  className="p-4 rounded-xl bg-neutral-900/70 ring-1 ring-neutral-700/60 hover:ring-sky-500/60 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-neutral-100 hover:text-sky-200 hover:underline"
                      >
                        {a.title}
                      </a>
                      <div className="mt-1 text-xs text-neutral-400 flex flex-wrap items-center gap-2">
                        <span>{a.source}</span>
                        <span>— {new Date(a.publishedAt).toLocaleString()}</span>
                        {typeof a.score === "number" && (
                          <span className="px-1.5 py-0.5 rounded bg-neutral-800/80 text-neutral-200 ring-1 ring-neutral-600/60">
                            score {a.score}
                          </span>
                        )}
                      </div>
                    </div>

                    <span
                      className={
                        "text-xs px-2 py-1 rounded-full whitespace-nowrap " +
                        impactClass(impLabel)
                      }
                    >
                      Impact {impLabel}
                    </span>
                  </div>

                  {themesForArticle.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {themesForArticle.map((label, idxTheme) => (
                        <span
                          key={idxTheme}
                          className="text-[11px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-200 ring-1 ring-violet-600/40"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  )}

                  {a.hits && a.hits.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {a.hits.slice(0, 5).map((h, idxHit) => (
                        <span
                          key={idxHit}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-200 ring-1 ring-indigo-600/40"
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  )}

                  {a.description && (
                    <p className="mt-2 text-sm text-neutral-300 line-clamp-3">
                      {a.description}
                    </p>
                  )}
                </li>
              );
            })}

            {sortedNews.length === 0 && (
              <li className="text-sm text-neutral-400 px-1">
                Aucune actualité “hot” dans la fenêtre de temps actuelle.
              </li>
            )}
          </ul>
        </section>

        {/* === COLONNE 2 : RADAR DE THEMES === */}
        <section className="space-y-3">
          <div className="px-1 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-100">
              Radar de thèmes (IA)
            </h2>
            <span className="text-xs text-neutral-400">
              Pondération 0–1 basée sur le flux de titres
            </span>
          </div>

          <ul className="space-y-2">
            {ai.mainThemes.map((t, idxTheme) => {
              const w = Math.max(0.05, Math.min(1, t.weight || 0));
              const count = themeCounts[t.label] ?? 0;
              return (
                <li
                  key={idxTheme}
                  className="p-4 rounded-xl bg-neutral-900/70 ring-1 ring-neutral-700/60"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-neutral-100 font-semibold">
                        {t.label}
                      </div>
                      <div className="text-xs text-neutral-400">
                        {count} article(s) liés
                      </div>
                    </div>
                    <div className="text-xs text-neutral-300">
                      poids {(w * 100).toFixed(0)}/100
                    </div>
                  </div>

                  <div className="mt-2 h-2 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-emerald-400"
                      style={{ width: `${w * 100}%` }}
                    />
                  </div>

                  {t.summary && (
                    <p className="mt-2 text-sm text-neutral-300">
                      {t.summary}
                    </p>
                  )}
                </li>
              );
            })}

            {ai.mainThemes.length === 0 && (
              <li className="text-sm text-neutral-400 px-1">
                Aucun thème clé (hors datas macro brutes) détecté par l’IA.
              </li>
            )}
          </ul>
        </section>

        {/* === COLONNE 3 : DESK DE TRADES === */}
        <section className="space-y-3">
          <div className="px-1 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-100">
              Desk de trades (IA)
            </h2>
            <span className="text-xs text-neutral-400">
              Propositions basées sur les thèmes et news ci-contre
            </span>
          </div>

          <ul className="space-y-3">
            {ai.actions.map((x, idxAction) => {
              const proofs = (x.evidenceIds || [])
                .map(id => index.get(id))
                .filter(Boolean) as Article[];

              return (
                <li
                  key={idxAction}
                  className="p-4 rounded-xl bg-neutral-900/70 ring-1 ring-neutral-700/60"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div
                      className={
                        "text-xs px-2 py-1 rounded-full " + badgeDir(x.direction)
                      }
                    >
                      {x.direction}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs px-2 py-1 rounded-full bg-neutral-800 text-neutral-100">
                        {x.symbol}
                      </span>
                      <span
                        className={
                          "text-xs px-2 py-1 rounded-full " + badgeConf(x.confidence)
                        }
                      >
                        Confiance {x.confidence}/100
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 text-sm text-neutral-200">
                    Conviction {x.conviction}/10
                  </div>

                  <p className="mt-1 text-sm text-neutral-300">{x.reason}</p>

                  {proofs.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {proofs.slice(0, 5).map((p, idxProof) => (
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
              <li className="text-sm text-neutral-400 px-1">
                Aucune action proposée aujourd’hui (pas de signal suffisamment
                robuste). Utilise quand même le radar de thèmes comme lecture rapide
                du narratif de marché.
              </li>
            )}
          </ul>
        </section>
      </section>
    </main>
  );
}
