import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { config, hasSupabase } from "./config.js";
import { Graph, CorpusNode, CorpusEdge } from "./types.js";
import { seedGraph, seedRawTokens } from "./seed.js";

let sb: SupabaseClient | null = null;
export function supabase(): SupabaseClient | null {
  if (!hasSupabase()) return null;
  if (!sb) sb = createClient(config.supabaseUrl, config.supabaseKey, { auth: { persistSession: false } });
  return sb;
}

// Full graph for a workspace: Supabase if configured (and non-empty), else seed.
export async function getGraph(ws: string): Promise<Graph> {
  const db = supabase();
  if (!db) return seedGraph();

  const [{ data: nodes }, { data: edges }] = await Promise.all([
    db.from("nodes").select("id,type,title,body,tags,session_id").eq("workspace_id", ws),
    db.from("edges").select("source_id,target_id,rel").eq("workspace_id", ws),
  ]);
  if (!nodes || nodes.length === 0) return seedGraph();
  return { nodes: nodes as CorpusNode[], edges: (edges ?? []) as CorpusEdge[] };
}

// Vector similarity search via the match_nodes RPC. Returns [] if unavailable.
export async function matchNodes(
  ws: string,
  embedding: number[],
  k: number,
): Promise<{ id: string; similarity: number }[]> {
  const db = supabase();
  if (!db) return [];
  const { data, error } = await db.rpc("match_nodes", {
    query_embedding: embedding,
    ws_id: ws,
    match_count: k,
  });
  if (error || !data) return [];
  return (data as { id: string; similarity: number }[]).map((r) => ({ id: r.id, similarity: r.similarity }));
}

// Expand a set of node ids exactly one hop along edges. Neighbors are computed
// from the ORIGINAL seed set so a single call never cascades past one hop.
export function expandOneHop(graph: Graph, seeds: Set<string>): Set<string> {
  const out = new Set(seeds);
  for (const e of graph.edges) {
    if (seeds.has(e.source_id)) out.add(e.target_id);
    if (seeds.has(e.target_id)) out.add(e.source_id);
  }
  return out;
}

// Total raw tokens ever ingested for a workspace — the honest denominator for
// "what re-reading the whole history would cost". Falls back to seed sessions.
export async function getRawHistoryTokens(ws: string): Promise<number> {
  const db = supabase();
  if (db) {
    const { data } = await db.from("sessions").select("raw_token_count").eq("workspace_id", ws);
    if (data && data.length) return data.reduce((s, r: any) => s + (r.raw_token_count ?? 0), 0);
  }
  return seedRawTokens();
}

// Record a recall so the dashboard can glow the cluster + update the counter.
export async function insertRecallEvent(
  ws: string,
  query: string,
  nodeIds: string[],
  fullTokens: number,
  recallTokens: number,
): Promise<void> {
  const db = supabase();
  if (!db) return;
  await db.from("recall_events").insert({
    workspace_id: ws,
    query,
    node_ids: nodeIds,
    full_token_count: fullTokens,
    recall_token_count: recallTokens,
  });
}

export interface EngramWrite {
  sessionId: string;
  sessionTitle: string;
  rawTokens: number;
  engramTokens: number;
  nodes: (CorpusNode & { embedding: number[] | null })[];
  edges: CorpusEdge[];
}

// Persist a captured session: session row + nodes (with vectors) + edges.
// Returns the ids of the inserted nodes.
export async function writeEngram(ws: string, e: EngramWrite): Promise<string[]> {
  const db = supabase();
  if (!db) return e.nodes.map((n) => n.id); // seed mode: nothing persisted

  await db.from("workspaces").upsert({ id: ws, name: ws }, { onConflict: "id" });
  await db.from("sessions").upsert({
    id: e.sessionId,
    workspace_id: ws,
    title: e.sessionTitle,
    raw_token_count: e.rawTokens,
    engram_token_count: e.engramTokens,
  });

  await db.from("nodes").upsert(
    e.nodes.map((n) => ({
      id: n.id,
      workspace_id: ws,
      type: n.type,
      title: n.title,
      body: n.body,
      tags: n.tags,
      session_id: e.sessionId,
      embedding: n.embedding,
    })),
  );

  if (e.edges.length) {
    await db.from("edges").upsert(
      e.edges.map((ed) => ({
        workspace_id: ws,
        source_id: ed.source_id,
        target_id: ed.target_id,
        rel: ed.rel,
      })),
      { onConflict: "source_id,target_id,rel" },
    );
  }

  return e.nodes.map((n) => n.id);
}
