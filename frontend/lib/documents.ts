import type { SupabaseClient } from "@supabase/supabase-js";

// Reading `documents` across BOTH schema generations — the frontend half of the
// compatibility the MCP server already has (mcp-server-2/src/store.ts, SupabaseStore).
//
// - "id"   — current schema: documents (workspace_id uuid FK → workspaces.id, name).
// - "slug" — original schema: documents (project text FK → workspaces.slug, name).
//
// The live database is still "slug". Every frontend query here used to select
// `workspace_id` unconditionally, so Postgres answered 42703 (column does not exist),
// the callers treated that error as "no data", and the dashboard rendered seed/demo
// rows that looked like real memory. Probing first is what the MCP server does, and
// it is why the server kept working against the same database the dashboard could not
// read. When migrate-documents-to-workspace-id-v2.sql eventually runs, the probe flips
// to "id" on its own and nothing here needs editing.

export type DocumentKeying = "id" | "slug";

export interface WorkspaceRef {
  id: string;
  slug: string;
}

export interface DocumentRow {
  workspaceId: string;
  name: string;
  content: string;
  updated_at: string;
}

// Memoized per server process on success only — a transient outage must not pin a
// wrong answer for the lifetime of the process.
let cachedKeying: DocumentKeying | null = null;

export async function documentsKeying(sb: SupabaseClient): Promise<DocumentKeying> {
  if (cachedKeying) return cachedKeying;

  const { error } = await sb.from("documents").select("workspace_id").limit(1);
  if (error && error.code !== "42703") {
    // A real failure (network, auth, missing table). Don't cache a guess.
    throw new Error(`documents probe failed: ${error.message}`);
  }
  if (error) {
    cachedKeying = "slug"; // 42703 = column does not exist
    return cachedKeying;
  }

  // The column EXISTS — but that alone does not mean it keys anything. The live DB was
  // found in exactly this state: `alter table documents add column workspace_id uuid`
  // had been run on its own, outside the migration's transaction, so all 19 rows had
  // workspace_id NULL while `project` still held every real key. A column-exists probe
  // (which is all mcp-server-2/src/store.ts keyed() does) answers "id" there and then
  // reads zero documents from a database that is full of them.
  //
  // So require the column to be POPULATED, not merely present. A partially backfilled
  // table still answers "id" — mid-migration the new key is the real one — but a wholly
  // unbackfilled column is treated as the no-op it is.
  const [{ data: keyedRows }, { data: anyRows }] = await Promise.all([
    sb.from("documents").select("name").not("workspace_id", "is", null).limit(1),
    sb.from("documents").select("name").limit(1),
  ]);

  const populated = (keyedRows?.length ?? 0) > 0;
  const hasRows = (anyRows?.length ?? 0) > 0;

  if (hasRows && !populated) {
    console.warn(
      "[corpus] documents.workspace_id exists but is NULL on every row — the migration " +
        "was only partly applied. Falling back to slug keying so the real documents stay " +
        "readable. Finish supabase/migrate-documents-to-workspace-id.sql (or drop the " +
        "unused column) to resolve this.",
    );
    cachedKeying = "slug";
    return cachedKeying;
  }

  cachedKeying = "id";
  return cachedKeying;
}

// Documents belonging to any of `workspaces`, tagged with the workspace id the
// caller knows them by — so callers group by id regardless of what keys the table.
export async function fetchDocuments(
  sb: SupabaseClient,
  workspaces: WorkspaceRef[],
): Promise<DocumentRow[]> {
  if (workspaces.length === 0) return [];

  if ((await documentsKeying(sb)) === "id") {
    const { data, error } = await sb
      .from("documents")
      .select("workspace_id,name,content,updated_at")
      .in(
        "workspace_id",
        workspaces.map((w) => w.id),
      );
    if (error) throw new Error(`documents fetch failed: ${error.message}`);
    return (data ?? []).map((d) => ({
      workspaceId: d.workspace_id as string,
      name: d.name,
      content: d.content,
      updated_at: d.updated_at,
    }));
  }

  // Slug-keyed: select by slug, then translate back to ids. workspaces.slug is the
  // FK target so it is unique, which makes this mapping unambiguous.
  const bySlug = new Map(workspaces.map((w) => [w.slug, w.id]));
  const { data, error } = await sb
    .from("documents")
    .select("project,name,content,updated_at")
    .in("project", [...bySlug.keys()]);
  if (error) throw new Error(`documents fetch failed: ${error.message}`);

  return (data ?? []).flatMap((d) => {
    const workspaceId = bySlug.get(d.project as string);
    return workspaceId
      ? [{ workspaceId, name: d.name, content: d.content, updated_at: d.updated_at }]
      : [];
  });
}

// Save an edited document, addressing the row by whichever column keys the table.
// Returns the number of rows written: an update matching nothing is NOT an error in
// Postgres, so without this count a save against a mis-keyed row would report success
// to the user and change nothing.
export async function updateDocument(
  sb: SupabaseClient,
  workspace: WorkspaceRef,
  name: string,
  content: string,
  updated_at: string,
): Promise<number> {
  const keying = await documentsKeying(sb);
  const q = sb
    .from("documents")
    .update({ content, updated_at })
    .eq("name", name)
    .select("name");

  const { data, error } =
    keying === "id"
      ? await q.eq("workspace_id", workspace.id)
      : await q.eq("project", workspace.slug);

  if (error) throw new Error(`documents update failed: ${error.message}`);
  return data?.length ?? 0;
}
