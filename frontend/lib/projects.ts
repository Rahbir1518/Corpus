import { getSupabase } from "@/lib/supabase";

// Data access for the post-login project → documents flow. All reads go through
// the server-side service-role client (getSupabase()), which bypasses RLS. When
// Supabase is not configured yet, every helper returns an empty result so the UI
// renders graceful empty states instead of crashing (mirrors lib/graph.ts).

export interface Project {
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
    .select("slug,name,doc_count,last_updated")
    .order("last_updated", { ascending: false, nullsFirst: false });

  if (!error && data) return data as Project[];

  // Fallback: view missing — list workspaces directly with zeroed metadata.
  const { data: ws, error: wErr } = await sb
    .from("workspaces")
    .select("slug,name")
    .order("name", { ascending: true });

  if (wErr || !ws) return [];
  return ws.map((w) => ({ slug: w.slug, name: w.name, doc_count: 0, last_updated: null }));
}

// True when a workspace with this slug exists — used to 404/redirect unknown slugs.
export async function projectExists(slug: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { data, error } = await sb
    .from("workspaces")
    .select("slug")
    .eq("slug", slug)
    .maybeSingle();
  return !error && !!data;
}

// Every document under a project, including content, newest first. Content is
// included so the reader can open a doc with no extra round trip.
export async function listDocuments(project: string): Promise<DocumentSummary[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("documents")
    .select("name,content,updated_at")
    .eq("project", project)
    .order("updated_at", { ascending: false });
  if (error || !data) return [];
  return data as DocumentSummary[];
}
