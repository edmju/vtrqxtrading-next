// src/app/(terminal)/dashboard/news/NewsClient.tsx
"use client";

import { useMemo, useState } from "react";
import type { RawArticle, AiOutputs, AiTheme, AiAction } from "@/lib/news/types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

/* -------------------------------------------------------------------------- */
/*  Types locaux                                                              */
/* -------------------------------------------------------------------------- */

type Article = RawArticle & {
  score?: number;
  impactScore?: number;
  hot?: boolean;
};

type Theme = AiTheme & {
  summary?: string;
};

type Action = AiAction & {
  symbol: string;
  direction: "BUY" | "SELL";
};

type NewsBundle = {
  generatedAt: string;
  total: number;
  articles: Article[];
};

type NewsClientProps = {
  news: NewsBundle;
  ai: AiOutputs | null;
};

/* -------------------------------------------------------------------------- */
/*  Helpers UI                                                                 */
/* -------------------------------------------------------------------------- */

function cls(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

function formatDate(d: string) {
  try {
    return format(new Date(d), "dd/MM/yyyy, HH:mm:ss", { locale: fr });
  } catch {
    return d;
  }
}

function impactLabel(score: number | undefined) {
  if (score == null) return "Impact Low";
  if (score >= 18) return "Impact High";
  if (score >= 10) return "Impact Medium";
  return "Impact Low";
}

function impactColor(score: number | undefined) {
  if (score == null) return "bg-sky-900/40 text-sky-200 border-sky-500/40";
  if (score >= 18) return "bg-rose-900/40 text-rose-100 border-rose-500/60";
  if (score >= 10) return "bg-amber-900/40 text-amber-100 border-amber-500/60";
  return "bg-sky-900/40 text-sky-200 border-sky-500/40";
}

function confidenceColor(c: number) {
  if (c >= 80) return "bg-emerald-900/60 text-emerald-100 border-emerald-400/70";
  if (c >= 60) return "bg-emerald-900/40 text-emerald-100 border-emerald-400/50";
  if (c >= 40) return "bg-amber-900/40 text-amber-100 border-amber-400/60";
  return "bg-rose-900/40 text-rose-100 border-rose-500/60";
}

function themeWeightColor(w: number) {
  if (w >= 0.8) return "from-indigo-400 via-sky-400 to-emerald-300";
  if (w >= 0.6) return "from-sky-400 via-emerald-400 to-lime-300";
  if (w >= 0.4) return "from-emerald-400 via-lime-400 to-amber-300";
  return "from-slate-500 via-slate-400 to-slate-300";
}

function timeframeLabel(tf?: string): string {
  switch (tf) {
    case "intraday-1j":
      return "Intraday – 1 jour";
    case "1-3j":
      return "1 à 3 jours";
    case "1-2sem":
      return "1 à 2 semaines";
    case "2-4sem":
      return "2 à 4 semaines";
    case "1-3mois":
      return "1 à 3 mois";
    default:
      return "Horizon non spécifié";
  }
}

function hoursSince(d: string) {
  return (Date.now() - new Date(d).getTime()) / 36e5;
}

/** heuristique si l’IA ne renvoie pas de timeframe */
function inferTimeframeFromProofs(proofs: Article[]): string {
  if (!proofs.length) return "1-2sem";
  const ages = proofs.map((a) => hoursSince(a.publishedAt));
  const minAge = Math.min(...ages, 72);
  if (minAge <= 12) return "intraday-1j";
  if (minAge <= 48) return "1-3j";
  if (minAge <= 168) return "1-2sem";
  if (minAge <= 336) return "2-4sem";
  return "1-3mois";
}

/* -------------------------------------------------------------------------- */
/*  Composants UI                                                             */
/* -------------------------------------------------------------------------- */

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cls(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        className
      )}
    >
      {children}
    </span>
  );
}

function ProgressBar({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cls("h-1.5 w-full rounded-full bg-slate-800/80", className)}>
      <div
        className={cls(
          "h-full rounded-full bg-gradient-to-r from-sky-400 via-indigo-400 to-violet-400 transition-all duration-500",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      layout
      className={cls(
        "relative rounded-2xl border border-white/5 bg-slate-900/70 p-4 shadow-[0_0_40px_rgba(15,23,42,0.9)] backdrop-blur-xl",
        className
      )}
    >
      {children}
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Flux d’actualités                                                         */
/* -------------------------------------------------------------------------- */

function NewsList({
  articles,
}: {
  articles: Article[];
}) {
  const [showAllNews, setShowAllNews] = useState(false);

  const sortedNews = useMemo(
    () =>
      [...articles].sort((a, b) => {
        const sA = a.impactScore ?? a.score ?? 0;
        const sB = b.impactScore ?? b.score ?? 0;
        return sB - sA;
      }),
    [articles]
  );

  const visibleNews = showAllNews ? sortedNews : sortedNews.slice(0, 6);

  return (
    <Card className="col-span-4 flex flex-col gap-2 lg:col-span-4 xl:col-span-4">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-200">
            Flux d’actualités tradables
          </h3>
          <p className="text-[11px] text-slate-400">
            Impact estimé par score + fraîcheur
          </p>
        </div>
      </div>

      <div className="relative">
        <ul
          className={cls(
            "space-y-3 pr-1 transition-all",
            showAllNews ? "max-h-none" : "max-h-[620px]",
            "overflow-y-auto"
          )}
        >
          <AnimatePresence initial={false}>
            {visibleNews.map((a) => (
              <motion.li
                key={a.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                <article className="group rounded-2xl border border-white/5 bg-gradient-to-br from-slate-900/80 via-slate-900/90 to-slate-950/90 p-4 shadow-[0_0_25px_rgba(15,23,42,0.65)]">
                  <header className="mb-1 flex items-start justify-between gap-3">
                    <h4 className="max-w-[75%] text-[13px] font-semibold leading-snug text-slate-100 group-hover:text-sky-100">
                      <Link
                        href={a.url}
                        target="_blank"
                        className="underline-offset-2 hover:underline"
                      >
                        {a.title}
                      </Link>
                    </h4>
                    <Badge className={impactColor(a.impactScore ?? a.score)}>
                      {impactLabel(a.impactScore ?? a.score)}
                    </Badge>
                  </header>

                  <div className="mb-1.5 flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="font-medium text-slate-300">{a.source}</span>
                    <span className="h-1 w-1 rounded-full bg-slate-500" />
                    <span>{formatDate(a.publishedAt)}</span>
                    <span className="h-1 w-1 rounded-full bg-slate-500" />
                    <span className="rounded-full bg-slate-800/80 px-1.5 py-0.5 text-[10px] text-slate-300">
                      score {a.score ?? 0}
                    </span>
                  </div>

                  {a.description && (
                    <p className="line-clamp-3 text-[12px] leading-relaxed text-slate-300">
                      {a.description}
                    </p>
                  )}

                  <div className="mt-2 flex flex-wrap gap-1">
                    {(a.hits || []).slice(0, 3).map((h) => (
                      <Badge
                        key={h}
                        className="border-sky-500/40 bg-sky-900/30 text-[10px] text-sky-100"
                      >
                        {h}
                      </Badge>
                    ))}
                  </div>
                </article>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        {!showAllNews && sortedNews.length > visibleNews.length && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent" />
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowAllNews((s) => !s)}
        className="mt-2 inline-flex items-center justify-center gap-2 self-center rounded-full border border-slate-600/60 bg-slate-900/80 px-3 py-1 text-[11px] font-medium text-slate-100 hover:border-sky-500/70 hover:text-sky-100"
      >
        {showAllNews ? "Réduire le flux" : "Dérouler toutes les news"}
      </button>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*  Radar de thèmes                                                           */
/* -------------------------------------------------------------------------- */

function ThemeCard({ theme }: { theme: Theme }) {
  const pct = Math.round(theme.weight * 100);

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-[13px] font-semibold text-slate-100">
            {theme.label}
          </h4>
          <p className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-sky-300">
            Synthèse IA du narratif
          </p>
        </div>
        <div className="text-right text-[11px] text-slate-400">
          <div className="font-semibold text-slate-100">
            poids {pct}/100
          </div>
        </div>
      </div>

      <ProgressBar value={pct} className="mt-1" />

      {theme.summary && (
        <p className="mt-1 text-[12px] leading-relaxed text-slate-200">
          {theme.summary}
        </p>
      )}
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*  Desk de trades (IA)                                                       */
/* -------------------------------------------------------------------------- */

function ActionCard({
  action,
  proofs,
}: {
  action: Action;
  proofs: Article[];
}) {
  const proofCount = proofs.length;
  const tfCode = action.timeframe || inferTimeframeFromProofs(proofs);
  const tfLabel = timeframeLabel(tfCode);

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge
            className={cls(
              "px-3 py-1 text-xs font-semibold",
              action.direction === "BUY"
                ? "border-emerald-400/70 bg-emerald-900/60 text-emerald-100"
                : "border-rose-400/70 bg-rose-900/60 text-rose-100"
            )}
          >
            {action.direction}
          </Badge>
          <span className="rounded-full border border-sky-500/50 bg-sky-900/40 px-3 py-0.5 text-[11px] font-semibold text-sky-100">
            {action.symbol}
          </span>
        </div>
        <Badge className={confidenceColor(action.confidence)}>
          Confiance {action.confidence}/100
        </Badge>
      </div>

      <div className="mt-1 text-[12px] leading-relaxed text-slate-200">
        <p className="font-semibold text-slate-100">
          Conviction {action.conviction}/10
        </p>
        <p className="mt-1 text-slate-200">{action.reason}</p>
        <p className="mt-1 text-[11px] text-slate-400">
          Horizon indicatif&nbsp;: <span className="font-medium text-slate-100">{tfLabel}</span>
        </p>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-400">
        <span>
          Basé sur{" "}
          <span className="font-semibold text-slate-100">
            {proofCount} sources
          </span>
        </span>
      </div>

      <details className="mt-1 group">
        <summary className="flex cursor-pointer items-center justify-between rounded-full border border-slate-600/70 bg-slate-900/80 px-3 py-1 text-[11px] text-slate-200 transition-colors group-open:border-sky-500/70 group-open:text-sky-100">
          <span>Voir la liste des sources</span>
          <span className="text-xs opacity-70 group-open:rotate-180 transition-transform">
            ▾
          </span>
        </summary>
        <ul className="mt-2 space-y-1 text-[11px] text-slate-300">
          {proofs.slice(0, 20).map((p) => (
            <li key={p.id} className="flex gap-2">
              <span className="mt-[2px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-500" />
              <Link
                href={p.url}
                target="_blank"
                className="underline-offset-2 hover:text-sky-200 hover:underline"
              >
                {p.title}{" "}
                <span className="text-slate-400">
                  ({p.source}, {formatDate(p.publishedAt)})
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </details>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*  Composant principal                                                       */
/* -------------------------------------------------------------------------- */

export default function NewsClient({ news, ai }: NewsClientProps) {
  const bundle = news;
  const articles = bundle.articles || [];
  const mainThemes: Theme[] = ai?.mainThemes || [];
  const actions: Action[] = (ai?.actions || []) as Action[];

  const clustersByLabel = useMemo(() => {
    const map = new Map<string, Article[]>();
    const clusters = ai?.clusters || [];
    for (const c of clusters) {
      map.set(
        c.label,
        c.articleIds
          .map((id) => articles.find((a) => a.id === id))
          .filter(Boolean) as Article[]
      );
    }
    return map;
  }, [ai, articles]);

  const marketStats = useMemo(() => {
    const hotNews = articles.filter((a) => a.hot);
    const themesCount = mainThemes.length;
    const ideasCount = actions.length;
    return {
      hotCount: hotNews.length,
      themesCount,
      ideasCount,
    };
  }, [articles, mainThemes, actions]);

  const regimeText = useMemo(() => {
    if (!mainThemes.length) {
      return "Régime neutre : flux de news dispersé, pas de thème dominant.";
    }
    const top = mainThemes[0];
    if (top.weight >= 0.8) {
      return `Marché très concentré sur « ${top.label} », narratif dominant clair.`;
    }
    if (top.weight >= 0.6) {
      return `Narratif principal autour de « ${top.label} », mais avec quelques thèmes secondaires.`;
    }
    return "Régime plutôt neutre : plusieurs thèmes coexistent sans driver unique.";
  }, [mainThemes]);

  const focalesText = useMemo(() => {
    if (!mainThemes.length) {
      return "Pas de cluster clair, flux de news diversifié.";
    }
    const labels = mainThemes.map((t) => t.label);
    if (!labels.length) return "Flux de news dispersé.";
    if (labels.length === 1) {
      return `Focale du moment : ${labels[0]}.`;
    }
    if (labels.length === 2) {
      return `Focales du moment : ${labels[0]} & ${labels[1]}.`;
    }
    return `Focales du moment : ${labels.slice(0, 3).join(" / ")}.`;
  }, [mainThemes]);

  const firstGenerated =
    articles.length > 0 ? articles[0].publishedAt : bundle.generatedAt;

  const firstHot =
    articles.find((a) => a.hot)?.publishedAt || bundle.generatedAt;

  const generatedAt = ai?.generatedAt || bundle.generatedAt;

  const actionsWithProofs = useMemo(
    () =>
      actions.map((a) => {
        const ids = a.evidenceIds || [];
        const proofs =
          ids.length > 0
            ? ids
                .map((id) => articles.find((ar) => ar.id === id))
                .filter(Boolean)
            : articles.slice(0, 20);
        return { action: a, proofs: proofs as Article[] };
      }),
    [actions, articles]
  );

  return (
    <div className="flex flex-1 flex-col gap-5 overflow-hidden px-4 pb-6 pt-3 lg:px-6">
      {/* Top summary row */}
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-3">
        {/* Market briefing */}
        <Card className="bg-gradient-to-br from-sky-900/70 via-slate-900/80 to-slate-950/90">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-200">
            Market briefing
          </p>
          <div className="mt-3 flex items-end justify-between gap-4">
            <div className="flex gap-6 text-slate-100">
              <div>
                <div className="text-2xl font-bold text-sky-100">
                  {marketStats.hotCount}
                </div>
                <div className="text-[11px] text-slate-300">
                  news “hot” du jour
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-indigo-100">
                  {marketStats.themesCount}
                </div>
                <div className="text-[11px] text-slate-300">thèmes IA</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-emerald-100">
                  {marketStats.ideasCount}
                </div>
                <div className="text-[11px] text-slate-300">idées de trade</div>
              </div>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-slate-400">
            Première news : {formatDate(firstGenerated)} • Dernière collecte :{" "}
            {formatDate(bundle.generatedAt)} • IA : {formatDate(generatedAt)}
          </p>
        </Card>

        {/* Regime de marché */}
        <Card className="bg-gradient-to-br from-violet-900/70 via-slate-900/80 to-slate-950/90">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-200">
            Régime de marché (vue IA)
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-slate-100">
            {regimeText}
          </p>
          <p className="mt-3 text-[11px] text-slate-400">
            Lecture basée sur la pondération des thèmes & la fraîcheur du flux.
            Première news “hot” : {formatDate(firstHot)}.
          </p>
        </Card>

        {/* Focales du moment */}
        <Card className="bg-gradient-to-br from-emerald-900/70 via-slate-900/80 to-slate-950/90">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">
            Focales du moment
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-slate-100">
            {focalesText}
          </p>
          <p className="mt-3 text-[11px] text-slate-400">
            Basé sur les thèmes IA les plus pondérés et le clustering des
            articles liés.
          </p>
        </Card>
      </div>

      {/* Main content row */}
      <div className="grid flex-1 grid-cols-12 gap-4 overflow-hidden">
        {/* Flux d’actualités */}
        <NewsList articles={articles} />

        {/* Radar + desk de trades */}
        <div className="col-span-8 grid grid-cols-1 gap-4 lg:grid-cols-5">
          {/* Radar de thèmes */}
          <div className="col-span-3 flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-200">
                  Radar de thèmes (IA)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Pondération 0–1 basée sur le flux de titres
                </p>
              </div>
            </div>

            <div className="grid gap-3">
              {mainThemes.map((t) => {
                const th = t as Theme;
                return <ThemeCard key={th.label} theme={th} />;
              })}
              {!mainThemes.length && (
                <p className="text-[12px] text-slate-400">
                  Aucun thème clé détecté pour l’instant.
                </p>
              )}
            </div>
          </div>

          {/* Desk de trades */}
          <div className="col-span-2 flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-200">
                  Desk de trades (IA)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Propositions basées sur les thèmes et news ci-contre
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {actionsWithProofs.length ? (
                actionsWithProofs.map(({ action, proofs }) => (
                  <ActionCard
                    key={`${action.symbol}-${action.direction}-${action.reason}`}
                    action={action}
                    proofs={proofs}
                  />
                ))
              ) : (
                <Card className="border-dashed bg-slate-950/60">
                  <p className="text-[12px] leading-relaxed text-slate-300">
                    Aucune action proposée aujourd’hui (pas de signal
                    suffisamment robuste). Utilise quand même le radar de thèmes
                    comme lecture rapide du narratif de marché.
                  </p>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
