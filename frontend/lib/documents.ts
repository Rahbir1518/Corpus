import type { SupabaseClient } from "@supabase/supabase-js";

// Reading `documents`, which is keyed by workspace id:
//
//   documents (workspace_id uuid NOT NULL FK → workspaces.id, name text, ...)
//   primary key (workspace_id, name)
//
// The migration to this shape has been APPLIED to the live database — the legacy
// `project` text column is gone (selecting it now returns 42703). The dual-keying
// probe that used to live here supported both generations while the migration was
// pending; it is removed because there is no longer a second generation to support,
// and a probe that can only answer "id" is just two extra round trips per request.

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

// Documents belonging to any of `workspaces`. Errors are thrown, never swallowed
// into an empty list — a query that fails must not be indistinguishable from a
// workspace that genuinely has no documents.
export async function fetchDocuments(
  sb: SupabaseClient,
  workspaces: WorkspaceRef[],
): Promise<DocumentRow[]> {
  if (workspaces.length === 0) return [];

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
    name: d.name as string,
    content: d.content as string,
    updated_at: d.updated_at as string,
  }));
}

// Save an edited document, addressed by its primary key (workspace_id, name).
// Returns the number of rows written: an update matching nothing is NOT an error in
// Postgres, so without this count a save against a row that does not exist would
// report success to the user and change nothing.
export async function updateDocument(
  sb: SupabaseClient,
  workspace: WorkspaceRef,
  name: string,
  content: string,
  updated_at: string,
): Promise<number> {
  const { data, error } = await sb
    .from("documents")
    .update({ content, updated_at })
    .eq("workspace_id", workspace.id)
    .eq("name", name)
    .select("name");

  if (error) throw new Error(`documents update failed: ${error.message}`);
  return data?.length ?? 0;
}
