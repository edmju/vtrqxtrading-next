"use client";

import { useState, useMemo } from "react";

export default function NewsClient({
  news,
  ai,
}: {
  news: any;
  ai: any;
}) {
  const [focusIds, setFocusIds] = useState<string[] | null>(null);

  const index = useMemo(() => {
    const idx = new Map();
    news.articles?.forEach((a: any) => idx.set(a.id, a));
    return idx;
  }, [news]);

  const openEvidence = (ids: string[]) => {
    setFocusIds(ids);
  };

  const badgeDir = (d: string) => {
    if (d === "BUY") return "bg-emerald-700/40 text-emerald-300";
    if (d === "SELL") return "bg-red-700/40 text-red-300";
    return "bg-neutral-600/40 text-neutral-300";
  };

  const badgeConf = (c: number) => {
    if (c >= 70) return "bg-emerald-700/40 text-emerald-300";
    if (c >= 45) return "bg-amber-700/40 text-amber-300";
    return "bg-red-700/40 text-red-300";
  };

  return (
    <div className="w-full flex gap-6">

      {/* ------------------ COLONNE NEWS ------------------ */}
      <div className="w-1/3 space-y-4">
        <div className="p-4 rounded-xl bg-[#002233]/60 ring-1 ring-neutral-800">
          <div className="text-lg font-semibold">News</div>
          <div className="text-sm text-neutral-400">
            Mise à jour: {news.generatedAt}
          </div>
        </div>

        {news.articles?.map((a: any, idxArt: number) => (
          <div
            key={idxArt}
            className="p-4 rounded-xl bg-neutral-900/60 ring-1 ring-neutral-700/40"
          >
            <div className="text-neutral-100 font-semibold">{a.title}</div>

            <div className="text-sm text-neutral-400 mt-1">
              {a.source} — {a.date}
            </div>

            {a.score && (
              <div className="text-xs mt-1 inline-block px-2 py-1 bg-neutral-800/60 rounded">
                score {a.score}
              </div>
            )}

            <p className="text-sm text-neutral-300 mt-2">{a.text}</p>
          </div>
        ))}
      </div>

      {/* ------------------ COLONNE THEMES ------------------ */}
      <div className="w-1/3 space-y-4">
        <div className="p-4 rounded-xl bg-[#250042]/60 ring-1 ring-neutral-800">
          <div className="text-lg font-semibold">News principales</div>
          <div className="text-sm text-neutral-400">IA: {ai.generatedAt}</div>
        </div>

        {/* --- THEMES PRINCIPAUX --- */}
        {ai.mainThemes?.length > 0 ? (
          <ul className="space-y-3">
            {ai.mainThemes.map((theme: any, idxTheme: number) => (
              <li
                key={idxTheme}
                className="p-3 rounded-xl bg-neutral-900/60 ring-1 ring-neutral-700/40"
              >
                <div className="flex items-center justify-between">
                  <span className="text-neutral-100">{theme.label}</span>
                  <span className="text-xs text-neutral-400">
                    {Math.round((theme.weight ?? 0) * 100)}/100
                  </span>
                </div>

                {theme.summary && (
                  <p className="text-sm text-neutral-300 mt-1">{theme.summary}</p>
                )}

                {theme.evidenceIds?.length > 0 && (
                  <button
                    onClick={() => openEvidence(theme.evidenceIds)}
                    className="text-xs text-violet-300 underline mt-2"
                  >
                    Voir preuves ({theme.evidenceIds.length})
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-neutral-400 text-sm px-2">
            Aucun thème clé (hors datas) généré.
          </div>
        )}

        {/* --- CLUSTERS (OPTION) --- */}
        {ai.clusters?.length > 0 && (
          <div className="pt-6">
            <div className="text-neutral-400 uppercase tracking-wide text-xs">
              Groupes identifiés
            </div>

            <div className="mt-2 space-y-3">
              {ai.clusters.map((cl: any, idxCluster: number) => (
                <div
                  key={idxCluster}
                  className="p-3 rounded-xl bg-neutral-900/60 ring-1 ring-neutral-700/40"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-100">{cl.label}</span>
                    <span className="text-xs text-neutral-400">
                      {cl.articleIds?.length} art.
                    </span>
                  </div>

                  <p className="text-sm text-neutral-300 mt-1">{cl.summary}</p>

                  {cl.articleIds?.length > 0 && (
                    <button
                      onClick={() => openEvidence(cl.articleIds)}
                      className="text-xs text-violet-300 underline mt-2"
                    >
                      focus ({cl.articleIds.length})
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ------------------ COLONNE ACTIONS ------------------ */}
      <div className="w-1/3 space-y-4">
        <div className="p-4 rounded-xl bg-[#003322]/60 ring-1 ring-neutral-800">
          <div className="text-lg font-semibold">Actions proposées</div>
        </div>

        {ai.actions?.length > 0 ? (
          <ul className="space-y-4">
            {ai.actions.map((act: any, idxAction: number) => {
              const proofs = (act.evidenceIds || [])
                .map((id: string) => index.get(id))
                .filter(Boolean);

              return (
                <li
                  key={idxAction}
                  className="p-4 rounded-xl bg-neutral-900/60 ring-1 ring-neutral-700/40"
                >
                  <div className="flex items-center justify-between">
                    <div className={`px-2 py-1 rounded ${badgeDir(act.direction)}`}>
                      {act.direction}
                    </div>

                    <div className={`px-2 py-1 rounded text-sm ${badgeConf(act.confidence)}`}>
                      Confiance {act.confidence}/100
                    </div>
                  </div>

                  <div className="mt-2 text-neutral-100 font-semibold">
                    {act.symbol}{' '}
                    <span className="text-neutral-400 font-normal">
                      • Conviction {act.conviction}/10
                    </span>
                  </div>

                  <p className="text-sm text-neutral-300 mt-1">{act.reason}</p>

                  {proofs.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {proofs.slice(0, 6).map((p: any, idxProof: number) => (
                        <li key={idxProof} className="text-xs text-neutral-400">
                          •{' '}
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
          </ul>
        ) : (
          <div className="text-neutral-400 text-sm px-2">
            Aucune action proposée aujourd’hui (pas de signal robuste).
          </div>
        )}
      </div>

      {/* ------------------ MODAL PREUVES ------------------ */}
      {focusIds && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6">
          <div className="bg-neutral-900 p-6 rounded-xl w-[600px] max-h-[80vh] overflow-y-auto ring-1 ring-neutral-700">
            <div className="text-xl font-semibold text-neutral-100 mb-4">
              Preuves / Sources
            </div>

            {(focusIds || []).map((id: string, idxPv: number) => {
              const p = index.get(id);
              if (!p) return null;
              return (
                <div key={idxPv} className="mb-4">
                  <a
                    className="text-violet-300 underline"
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {p.source}: {p.title}
                  </a>
                  <p className="text-neutral-400 text-sm mt-1">{p.text}</p>
                </div>
              );
            })}

            <button
              onClick={() => setFocusIds(null)}
              className="mt-4 px-4 py-2 bg-violet-700 hover:bg-violet-800 rounded text-white"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
