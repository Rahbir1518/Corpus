"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Graph, GraphNode, DEMO_WORKSPACE } from "@/lib/graph";
import { useRealtimeCorpus } from "@/lib/useRealtimeCorpus";
import GraphView from "./GraphView";
import TokenPanel, { RecallStat } from "./TokenPanel";

// ~4 chars/token is a good enough estimate for the demo counter.
const estTokens = (s: string) => Math.max(1, Math.round(s.length / 4));

export default function Workspace() {
  const [graph, setGraph] = useState<Graph>({ nodes: [], edges: [] });
  const [highlight, setHighlight] = useState<Set<string>>(new Set());
  const [stat, setStat] = useState<RecallStat | null>(null);
  const [query, setQuery] = useState("");
  const [live, setLive] = useState(false);

  const loadGraph = useCallback(() => {
    fetch("/api/graph")
      .then((r) => r.json())
      .then(setGraph)
      .catch(() => {});
  }, []);

  useEffect(loadGraph, [loadGraph]);

  // Live: a corpus_recall from ANY tool (Claude Code, Cursor...) glows the graph
  // and updates the counter. corpus_remember grows the graph.
  useRealtimeCorpus({
    workspace: DEMO_WORKSPACE,
    onRecall: useCallback((e) => {
      setLive(true);
      setHighlight(new Set(e.node_ids));
      setStat({
        query: e.query,
        fullTokens: e.full_token_count,
        recallTokens: e.recall_token_count,
        nodeCount: e.node_ids.length,
      });
    }, []),
    onNodesChanged: useCallback(() => {
      setLive(true);
      loadGraph();
    }, [loadGraph]),
  });

  const fullTokens = useMemo(
    () => graph.nodes.reduce((sum, n) => sum + estTokens(n.title + n.body), 0),
    [graph],
  );

  // TEMP (Phase A): local keyword recall so the graph glows before MCP is wired.
  // Phase B/C replace this with real embeddings + a Realtime recall_events feed.
  function runLocalRecall(q: string) {
    if (!q.trim() || graph.nodes.length === 0) return;
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const score = (n: GraphNode) => {
      const hay = (n.title + " " + n.body + " " + n.tags.join(" ")).toLowerCase();
      return terms.reduce((s, t) => s + (hay.includes(t) ? 1 : 0), 0);
    };
    const seeds = graph.nodes
      .map((n) => ({ n, s: score(n) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 3)
      .map((x) => x.n.id);

    // Expand one hop along edges (the graph-aware part).
    const ids = new Set(seeds);
    for (const e of graph.edges) {
      if (ids.has(e.source_id)) ids.add(e.target_id);
      if (ids.has(e.target_id)) ids.add(e.source_id);
    }

    const recalled = graph.nodes.filter((n) => ids.has(n.id));
    const recallTokens = recalled.reduce((sum, n) => sum + estTokens(n.title + n.body), 0);

    setHighlight(ids);
    setStat({ query: q, fullTokens, recallTokens, nodeCount: recalled.length });
  }

  return (
    <div className="ws">
      <div className="ws-graph">
        {graph.nodes.length > 0 && <GraphView graph={graph} highlight={highlight} />}
      </div>

      <aside className="ws-side">
        {live && (
          <div className="ws-live">
            <span className="ws-live-dot" /> live · listening for MCP recalls
          </div>
        )}
        <TokenPanel stat={stat} />

        <div className="ws-recall">
          <label className="ws-recall-label">Try a recall</label>
          <div className="ws-recall-row">
            <input
              className="ws-input"
              placeholder="e.g. fix the stripe webhook"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runLocalRecall(query)}
            />
            <button className="btn btn-primary" onClick={() => runLocalRecall(query)}>
              Recall
            </button>
          </div>
          {highlight.size > 0 && (
            <button
              className="ws-clear"
              onClick={() => {
                setHighlight(new Set());
                setStat(null);
              }}
            >
              Clear
            </button>
          )}
        </div>

        <div className="ws-legend">
          {(["decision", "bug", "file", "preference", "task"] as const).map((t) => (
            <span key={t} className={`ws-legend-item ws-dot-${t}`}>
              {t}
            </span>
          ))}
        </div>
      </aside>
    </div>
  );
}
