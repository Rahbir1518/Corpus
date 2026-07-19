import { getSupabase } from "@/lib/supabase";
import { fetchDocuments } from "@/lib/documents";

export interface WorkspaceDoc {
  name: string;
  content: string;
  updated_at: string;
}

// This user's row in workspace_members — corpus-connect/disconnect toggles
// `status`, so it is the live "are my logs landing here right now" signal.
export interface WorkspaceMembership {
  role: string;
  status: "connected" | "disconnected";
  joined_at: string;
  last_active_at: string;
}

export interface WorkspaceWithDocs {
  id: string;
  slug: string;
  name: string;
  membership: WorkspaceMembership | null;
  documents: WorkspaceDoc[];
}

// Workspaces visible to this Auth0 user, each with its markdown documents and the
// user's own membership state.
//
// Scope is decided in this order:
//   1. workspace_members rows for this user — the real multi-user answer.
//   2. CORPUS_WORKSPACE — the workspace THIS checkout is connected to, the same id
//      .mcp.json hands the MCP server. Used while workspace_members is still empty.
//   3. nothing.
//
// It deliberately no longer falls back to "every workspace in the database". That
// fallback is what put 20 unrelated workspaces — other people's repos, scratch folders,
// `tmp`, `poo` — on a dashboard captioned as the signed-in user's memory. Showing one
// honest workspace beats showing twenty that are not yours.
export async function getWorkspacesForUser(userId: string): Promise<WorkspaceWithDocs[]> {
  const sb = getSupabase();
  if (!sb) return demoWorkspaces();

  const { data: memberRows } = await sb
    .from("workspace_members")
    .select("workspace_id,role,status,joined_at,last_active_at")
    .eq("user_id", userId);

  const memberships = new Map<string, WorkspaceMembership>(
    (memberRows ?? []).map((r) => [
      r.workspace_id as string,
      {
        role: r.role,
        status: r.status,
        joined_at: r.joined_at,
        last_active_at: r.last_active_at,
      },
    ]),
  );

  const connectedId = process.env.CORPUS_WORKSPACE?.trim();
  const scopeIds =
    memberships.size > 0 ? [...memberships.keys()] : connectedId ? [connectedId] : [];
  if (scopeIds.length === 0) return [];

  const wsQuery = sb
    .from("workspaces")
    .select("id,slug,name,created_at")
    .in("id", scopeIds);

  const { data: workspaces, error: wErr } = await wsQuery.order("created_at", { ascending: true });
  // Errors are raised, not swallowed into demo data. Returning plausible-looking seed
  // rows on failure is what made a schema mismatch (documents.workspace_id missing)
  // read as "the memory is empty" for an entire debugging session — the dashboard must
  // never show invented workspaces while claiming to show the database.
  if (wErr) throw new Error(`workspaces fetch failed: ${wErr.message}`);
  if (!workspaces) return [];

  const docs = await fetchDocuments(sb, workspaces);
  const byWorkspace = new Map<string, WorkspaceDoc[]>();
  for (const d of docs) {
    const list = byWorkspace.get(d.workspaceId) ?? [];
    list.push({ name: d.name, content: d.content, updated_at: d.updated_at });
    byWorkspace.set(d.workspaceId, list);
  }

  return workspaces.map((w) => ({
    id: w.id,
    slug: w.slug,
    name: w.name,
    membership: memberships.get(w.id) ?? null,
    documents: byWorkspace.get(w.id) ?? [],
  }));
}

// Keeps the dashboard demo-able before SUPABASE_* env vars are configured. This is the
// ONLY path that may return invented data, and it is reachable only when there are no
// credentials at all — never as a fallback for a query that failed against a real DB.
function demoWorkspaces(): WorkspaceWithDocs[] {
  const now = new Date().toISOString();
  const lastWeek = new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString();
  return [
    {
      id: "00000000-0000-4000-8000-000000000001",
      slug: "corpus-dev",
      name: "corpus-dev",
      membership: { role: "owner", status: "connected", joined_at: lastWeek, last_active_at: now },
      documents: [
        {
          name: "state",
          content:
            "# State\n\n**Done:** dashboard redesign, MCP hooks.\n\n**In progress:** graph clustering view.\n",
          updated_at: now,
        },
        {
          name: "architecture",
          content:
            "# Architecture\n\nMCP server + Next.js dashboard + Supabase document store.\n",
          updated_at: now,
        },
        {
          name: "decisions",
          content:
            "# Decisions\n\n- Documents are keyed by workspace id, not folder slug — collisions are impossible.\n",
          updated_at: now,
        },
      ],
    },
    {
      id: "00000000-0000-4000-8000-000000000002",
      slug: "tmp",
      name: "tmp",
      membership: { role: "member", status: "disconnected", joined_at: lastWeek, last_active_at: lastWeek },
      documents: [
        { name: "state", content: "# State\n\nScratch workspace.\n", updated_at: now },
      ],
    },
  ];
}
