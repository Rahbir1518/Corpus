import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { getSupabase } from "@/lib/supabase";
import { buildWorkspaceGraph, WorkspaceDoc, WorkspaceMeta } from "@/lib/similarity";
import { DEMO_DOCS, DEMO_WORKSPACES } from "@/lib/demoData";

export interface GraphStats {
  events: number;
  actualTokens: number; // tokens spent on calls that have a measured baseline
  baselineTokens: number; // what those same calls would have cost without Corpus
}

// GET /api/corpus/graph → { demo, nodes, edges, stats }
// Nodes are workspaces; edges are TF-IDF keyword similarity between the
// markdown documents each workspace contains (see lib/similarity.ts).
export async function GET() {
  const session = await auth0.getSession();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sb = getSupabase();
  if (!sb) return NextResponse.json(demoPayload());

  const [wsRes, docRes, statRes] = await Promise.all([
    sb.from("workspaces").select("slug,name"),
    sb.from("documents").select("project,name,content,updated_at"),
    sb.from("usage_stats").select("event_count,total_tokens,total_baseline_tokens,baseline_event_count"),
  ]);

  const workspaces = (wsRes.data ?? []) as WorkspaceMeta[];
  const docs = (docRes.data ?? []) as WorkspaceDoc[];

  // Keep the demo alive if the DB is reachable but empty / mis-migrated.
  if (wsRes.error || docRes.error || (workspaces.length === 0 && docs.length === 0)) {
    return NextResponse.json(demoPayload());
  }

  let stats: GraphStats | null = null;
  if (!statRes.error && statRes.data) {
    stats = { events: 0, actualTokens: 0, baselineTokens: 0 };
    for (const row of statRes.data) {
      stats.events += row.event_count ?? 0;
      // Savings are only meaningful on calls with a measured baseline.
      if ((row.baseline_event_count ?? 0) > 0) {
        stats.actualTokens += row.total_tokens ?? 0;
        stats.baselineTokens += row.total_baseline_tokens ?? 0;
      }
    }
  }

  const graph = buildWorkspaceGraph(workspaces, docs);
  return NextResponse.json({ demo: false, ...graph, stats });
}

function demoPayload() {
  const graph = buildWorkspaceGraph(DEMO_WORKSPACES, DEMO_DOCS);
  return {
    demo: true,
    ...graph,
    stats: { events: 128, actualTokens: 41_320, baselineTokens: 236_900 },
  };
}
