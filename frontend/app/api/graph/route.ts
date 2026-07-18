import { NextRequest, NextResponse } from "next/server";
import { getGraph, DEMO_WORKSPACE } from "@/lib/graph";

// GET /api/graph?workspace=demo → { nodes, edges } for the force-graph.
export async function GET(req: NextRequest) {
  const workspace = req.nextUrl.searchParams.get("workspace") ?? DEMO_WORKSPACE;
  const graph = await getGraph(workspace);
  return NextResponse.json(graph);
}
