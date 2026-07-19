import { getSupabase } from "@/lib/supabase";
import { fetchDocuments } from "@/lib/documents";
import { getActivityBySlug, latest, type WorkspaceActivity } from "@/lib/activity";

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
  // The live signal the Connections tab renders — see lib/activity.ts for why this,
  // and not `membership`, is what tells you whether a workspace is in use.
  activity: WorkspaceActivity;
  documents: WorkspaceDoc[];
}

// Every workspace in the store, each with its markdown documents and this user's
// membership state.
//
// Membership ANNOTATES a workspace; it does not filter it. That is the whole point
// of the Connections tab — it mirrors `corpus-ls`, which lists workspaces you are
// connected to *and* ones you are not, so you can connect to them. Filtering the
// list down to rows that already exist in workspace_members would make the
// not-yet-connected workspaces — the only ones worth acting on — invisible.
//
// This also fixes what the dashboard was actually doing: workspace_members is
// currently empty, so the old membership-first scope fell through to a single
// CORPUS_WORKSPACE id and rendered 1 workspace out of 20 and 1 document out of 23.
// Neither scope signal in the schema is populated (workspace_members has 0 rows and
// workspaces.owner_user_id is NULL on every row), so there is no honest basis for a
// per-user filter here yet; inventing one would hide real data. When real ownership
// data lands, filter here on owner_user_id.
export async function getWorkspacesForUser(userId: string): Promise<WorkspaceWithDocs[]> {
  const sb = getSupabase();
  // No demo/seed fallback. A dashboard that renders invented workspaces when it
  // cannot reach the database is worse than one that fails loudly: it cost an entire
  // debugging session once already, because a schema mismatch looked like real but
  // empty memory instead of a broken query.
  if (!sb) {
    throw new Error(
      "Supabase is not configured — set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in frontend/.env.local",
    );
  }

  const [{ data: workspaces, error: wErr }, { data: memberRows, error: mErr }] = await Promise.all([
    sb.from("workspaces").select("id,slug,name,created_at").order("created_at", { ascending: true }),
    sb
      .from("workspace_members")
      .select("workspace_id,role,status,joined_at,last_active_at")
      .eq("user_id", userId),
  ]);

  // Errors are raised, not swallowed into an empty list — "the query failed" and
  // "there is nothing here" must not look the same on screen.
  if (wErr) throw new Error(`workspaces fetch failed: ${wErr.message}`);
  if (mErr) throw new Error(`workspace_members fetch failed: ${mErr.message}`);
  if (!workspaces || workspaces.length === 0) return [];

  const memberships = new Map<string, WorkspaceMembership>(
    (memberRows ?? []).map((r) => [
      r.workspace_id as string,
      {
        role: r.role as string,
        status: r.status as WorkspaceMembership["status"],
        joined_at: r.joined_at as string,
        last_active_at: r.last_active_at as string,
      },
    ]),
  );

  const docs = await fetchDocuments(sb, workspaces);
  const byWorkspace = new Map<string, WorkspaceDoc[]>();
  for (const d of docs) {
    const list = byWorkspace.get(d.workspaceId) ?? [];
    list.push({ name: d.name, content: d.content, updated_at: d.updated_at });
    byWorkspace.set(d.workspaceId, list);
  }

  // Most-recently-updated document first, so a workspace's freshest memory is what
  // the graph and the modals open on.
  for (const list of byWorkspace.values()) {
    list.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }

  const activity = await getActivityBySlug(
    sb,
    workspaces.map((w) => w.slug as string),
  );

  return workspaces.map((w) => {
    const id = w.id as string;
    const docs = byWorkspace.get(id) ?? [];
    const fromEvents = activity.get(w.slug as string) ?? { events: 0, lastActiveAt: null };

    return {
      id,
      slug: w.slug as string,
      name: w.name as string,
      membership: memberships.get(id) ?? null,
      // A save writes both a document and a usage_event, but only one of the two is
      // guaranteed — corpus_save can land while the ledger is unavailable, and a
      // corpus_load logs an event without touching any document. Take the later.
      activity: {
        events: fromEvents.events,
        lastActiveAt: latest(fromEvents.lastActiveAt, docs[0]?.updated_at ?? null),
      },
      documents: docs,
    };
  });
}
