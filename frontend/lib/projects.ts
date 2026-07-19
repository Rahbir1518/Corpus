import { getSupabase } from "@/lib/supabase";
import { fetchDocuments } from "@/lib/documents";

// Data access for the post-login project → documents flow. All reads go through
// the server-side service-role client (getSupabase()), which bypasses RLS. When
// Supabase is not configured yet, every helper returns an empty result so the UI
// renders graceful empty states instead of crashing (mirrors lib/graph.ts).
//
// Documents are keyed by workspace_id (uuid) — see supabase/schema.sql — so a
// "project" is a workspace and is addressed by its id, not its (non-unique) slug.

export interface Project {
  id: string;
  slug: string;
  name: string;
  doc_count: number;
  last_updated: string | null;
}

export interface DocumentSummary {
  name: string;
  content: string;
  updated_at: string;
}

// All selectable projects, newest activity first. Prefers the project_overview
// view (doc counts + last activity); falls back to a plain workspaces select if
// the view isn't present yet.
export async function listProjects(): Promise<Project[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from("project_overview")
    .select("id,slug,name,doc_count,last_updated")
    .order("last_updated", { ascending: false, nullsFirst: false });

  if (!error && data) return data as Project[];

  // Fallback: view missing — list workspaces directly with zeroed metadata.
  const { data: ws, error: wErr } = await sb
    .from("workspaces")
    .select("id,slug,name")
    .order("name", { ascending: true });

  if (wErr || !ws) return [];
  return ws.map((w) => ({
    id: String(w.id),
    slug: w.slug,
    name: w.name,
    doc_count: 0,
    last_updated: null,
  }));
}

// The workspace (project) with this id, or null — used to resolve the page header
// and to 404/redirect unknown ids.
export async function getProject(id: string): Promise<{ id: string; name: string } | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("workspaces")
    .select("id,name")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return { id: String(data.id), name: data.name };
}

// Every document under a project (workspace), including content, newest first.
// Content is included so the reader can open a doc with no extra round trip.
export async function listDocuments(workspaceId: string): Promise<DocumentSummary[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data: ws, error: wErr } = await sb
    .from("workspaces")
    .select("id,slug")
    .eq("id", workspaceId)
    .maybeSingle();
  if (wErr || !ws) return [];

  const docs = await fetchDocuments(sb, [{ id: String(ws.id), slug: ws.slug }]);
  return docs
    .map(({ name, content, updated_at }) => ({ name, content, updated_at }))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}
