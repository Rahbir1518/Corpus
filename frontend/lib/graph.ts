import seed from "@/data/seed.json";
import { getSupabase } from "@/lib/supabase";

export type NodeType = "decision" | "bug" | "file" | "preference" | "task";
export type RelType = "caused" | "depends_on" | "touches" | "relates_to";

export interface GraphNode {
  id: string;
  type: NodeType;
  title: string;
  body: string;
  tags: string[];
  session_id?: string;
}

export interface GraphEdge {
  source_id: string;
  target_id: string;
  rel: RelType;
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export const NODE_COLORS: Record<NodeType, string> = {
  decision: "#6366f1", // indigo
  bug: "#ef4444", // red
  file: "#22c55e", // green
  preference: "#f59e0b", // amber
  task: "#8b5cf6", // violet
};

export const DEMO_WORKSPACE = seed.workspace.id;

// Load the graph for a workspace: from Supabase if configured, else seed data.
export async function getGraph(workspaceId: string = DEMO_WORKSPACE): Promise<Graph> {
  const sb = getSupabase();
  if (!sb) return seedGraph();

  const [{ data: nodes, error: nErr }, { data: edges, error: eErr }] = await Promise.all([
    sb.from("nodes").select("id,type,title,body,tags,session_id").eq("workspace_id", workspaceId),
    sb.from("edges").select("source_id,target_id,rel").eq("workspace_id", workspaceId),
  ]);

  // Fall back to seed if the table is empty or errored — keeps the demo alive.
  if (nErr || eErr || !nodes || nodes.length === 0) return seedGraph();
  return { nodes: nodes as GraphNode[], edges: (edges ?? []) as GraphEdge[] };
}

function seedGraph(): Graph {
  return { nodes: seed.nodes as GraphNode[], edges: seed.edges as GraphEdge[] };
}
