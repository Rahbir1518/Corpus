"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { WorkspaceGraph, WorkspaceNode } from "@/lib/similarity";
import { useRealtimeCorpus } from "@/lib/useRealtimeCorpus";
import GraphView, { workspaceColor } from "./GraphView";
import WorkspaceModal from "./WorkspaceModal";

interface GraphPayload extends WorkspaceGraph {
  demo: boolean;
  stats: { events: number; actualTokens: number; baselineTokens: number } | null;
}

export default function Workspace() {
  const [payload, setPayload] = useState<GraphPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<WorkspaceNode | null>(null);

  const loadGraph = useCallback(() => {
    fetch("/api/corpus/graph")
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => null))?.error ?? r.statusText);
        return r.json();
      })
      .then((json) => {
        setPayload(json);
        setError(null);
      })
      .catch((e) => setError(String(e.message ?? e)));
  }, []);

  useEffect(loadGraph, [loadGraph]);

  // Any agent writing memory (or another tab editing a doc) refreshes the graph live.
  const live = useRealtimeCorpus(loadGraph);

  // Keyword search over workspace names, TF-IDF keywords and document names.
  const searching = query.trim().length > 0;
  const highlight = useMemo(() => {
    const ids = new Set<string>();
    if (!payload || !searching) return ids;
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    for (const n of payload.nodes) {
      const hay = (n.name + " " + n.id + " " + n.keywords.join(" ") + " " + n.docNames.join(" "))
        .toLowerCase();
      if (terms.some((t) => hay.includes(t))) ids.add(n.id);
    }
    return ids;
  }, [payload, query, searching]);

  const stats = payload?.stats ?? null;
  const savedPct =
    stats && stats.baselineTokens > 0
      ? Math.max(0, Math.round((1 - stats.actualTokens / stats.baselineTokens) * 100))
      : null;

  return (
    <div className="relative flex-1 min-h-0 overflow-hidden corpus-starfield">
      {/* Graph canvas */}
      <div className="absolute inset-0">
        {payload && payload.nodes.length > 0 && (
          <GraphView
            graph={payload}
            highlight={highlight}
            searching={searching}
            onNodeClick={setSelected}
          />
        )}
      </div>

      {/* Search — floating glass pill, landing-nav style */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 w-[min(480px,90%)] z-10">
        <div className="liquid-glass rounded-full border border-white/10 bg-white/[0.03] flex items-center gap-3 px-5 py-3">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="text-muted-foreground shrink-0"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search workspaces by keyword — e.g. webhook, auth, tokens"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground/70"
          />
          {searching && (
            <button
              onClick={() => setQuery("")}
              className="text-muted-foreground hover:text-foreground text-xs shrink-0 transition-colors"
            >
              clear
            </button>
          )}
        </div>
        {searching && (
          <p className="text-center text-xs text-muted-foreground mt-2.5">
            {highlight.size === 0
              ? "No workspaces match."
              : `${highlight.size} workspace${highlight.size === 1 ? "" : "s"} lit up`}
          </p>
        )}
      </div>

      {/* Status badges — top right */}
      <div className="absolute top-7 right-6 z-10 flex items-center gap-2">
        {payload?.demo && (
          <span className="liquid-glass rounded-full px-3.5 py-1.5 text-[11px] font-mono uppercase tracking-widest text-amber-300/90 border border-amber-300/20">
            demo data
          </span>
        )}
        {live && (
          <span className="liquid-glass rounded-full px-3.5 py-1.5 text-[11px] font-mono uppercase tracking-widest text-emerald-400 border border-emerald-400/20 inline-flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
            live
          </span>
        )}
      </div>

      {/* Token savings — bottom left, the hero number */}
      {stats && (
        <div className="absolute bottom-6 left-6 z-10 liquid-glass rounded-3xl border border-white/10 bg-white/[0.02] px-6 py-5 w-[240px]">
          <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-2">
            Tokens saved
          </p>
          {savedPct !== null ? (
            <>
              <p className="font-display text-5xl tracking-tight leading-none">{savedPct}%</p>
              <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                <span className="line-through decoration-red-400/50">
                  {stats.baselineTokens.toLocaleString()}
                </span>{" "}
                → <span className="text-emerald-400">{stats.actualTokens.toLocaleString()}</span> tok
                <br />
                across {stats.events.toLocaleString()} tool calls
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">No measured recalls yet.</p>
          )}
        </div>
      )}

      {/* Hint / legend — bottom right */}
      <div className="absolute bottom-6 right-6 z-10 text-right">
        <p className="text-xs text-muted-foreground">
          Each dot is a workspace · edges share keywords · click to open its documents
        </p>
        {selectedLegend(payload)}
      </div>

      {/* Empty / error states */}
      {!payload && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-muted-foreground animate-pulse">Mapping your memory…</p>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {selected && (
        <WorkspaceModal
          workspace={selected}
          color={workspaceColor(selected.id)}
          onClose={() => setSelected(null)}
          onSaved={loadGraph}
        />
      )}
    </div>
  );
}

// Tiny color legend for the largest workspaces (keeps the graphify feel honest).
function selectedLegend(payload: GraphPayload | null) {
  if (!payload) return null;
  const top = [...payload.nodes].sort((a, b) => b.docCount - a.docCount).slice(0, 4);
  return (
    <div className="flex items-center justify-end gap-3 mt-2">
      {top.map((n) => (
        <span
          key={n.id}
          className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono"
        >
          <span className="w-2 h-2 rounded-full" style={{ background: workspaceColor(n.id) }} />
          {n.name.length > 14 ? n.name.slice(0, 13) + "…" : n.name}
        </span>
      ))}
    </div>
  );
}
