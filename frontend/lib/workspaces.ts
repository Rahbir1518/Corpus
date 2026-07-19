import { getSupabase } from "@/lib/supabase";

export interface WorkspaceDoc {
  name: string;
  content: string;
  updated_at: string;
}

export interface WorkspaceWithDocs {
  id: string;
  slug: string;
  name: string;
  documents: WorkspaceDoc[];
}

// Workspaces visible to this Auth0 user, each with its markdown documents.
// Membership rows scope the list; while none exist yet (early dev / fresh DB)
// we fall back to every workspace so the dashboard is never empty.
export async function getWorkspacesForUser(userId: string): Promise<WorkspaceWithDocs[]> {
  const sb = getSupabase();
  if (!sb) return demoWorkspaces();

  const { data: memberRows } = await sb
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId);

  let wsQuery = sb.from("workspaces").select("id,slug,name");
  if (memberRows && memberRows.length > 0) {
    wsQuery = wsQuery.in(
      "id",
      memberRows.map((r) => r.workspace_id),
    );
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
    documents: (docs ?? [])
      .filter((d) => d.workspace_id === w.id)
      .map(({ name, content, updated_at }) => ({ name, content, updated_at })),
  }));
}

// Keeps the dashboard demo-able before SUPABASE_* env vars are configured.
function demoWorkspaces(): WorkspaceWithDocs[] {
  const now = new Date().toISOString();
  return [
    {
      id: "00000000-0000-4000-8000-000000000001",
      slug: "corpus-dev",
      name: "corpus-dev",
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
      documents: [
        { name: "state", content: "# State\n\nScratch workspace.\n", updated_at: now },
      ],
    },
  ];
}
