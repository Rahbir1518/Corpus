import { getSupabase } from "@/lib/supabase";

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

// Workspaces visible to this Auth0 user, each with its markdown documents and
// the user's own membership state. Membership rows scope the list; while none
// exist yet (early dev / fresh DB) we fall back to every workspace so the
// dashboard is never empty.
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

  let wsQuery = sb.from("workspaces").select("id,slug,name,created_at");
  if (memberships.size > 0) {
    wsQuery = wsQuery.in("id", [...memberships.keys()]);
  }

  const { data: workspaces, error: wErr } = await wsQuery.order("created_at", { ascending: true });
  if (wErr || !workspaces || workspaces.length === 0) return demoWorkspaces();

  const { data: docs, error: dErr } = await sb
    .from("documents")
    .select("workspace_id,name,content,updated_at")
    .in(
      "workspace_id",
      workspaces.map((w) => w.id),
    );
  if (dErr) return demoWorkspaces();

  return workspaces.map((w) => ({
    id: w.id,
    slug: w.slug,
    name: w.name,
    membership: memberships.get(w.id) ?? null,
    documents: (docs ?? [])
      .filter((d) => d.workspace_id === w.id)
      .map(({ name, content, updated_at }) => ({ name, content, updated_at })),
  }));
}

// Keeps the dashboard demo-able before SUPABASE_* env vars are configured.
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
