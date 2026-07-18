/**
 * Workspace lookup/creation against the documentation DB.
 *
 * Used only by the CLI (corpus-setup / corpus-connect). The MCP server never creates a
 * workspace: a document write can only land in one someone deliberately connected this
 * repo to. That is what keeps identity opaque rather than folder-derived.
 *
 * Importing this module also loads mcp-server-2/.env.local (side effect of ./store.js),
 * so the CLI picks up the same Supabase credentials the server uses.
 */
import { createClient } from "@supabase/supabase-js";
import "./store.js";

export interface Workspace {
  id: string;
  slug: string;
  name: string;
}

/** Null when Supabase isn't configured — the caller decides whether that's fatal. */
function client() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export function supabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export { isWorkspaceId } from "./store.js";
import { isWorkspaceId } from "./store.js";

export async function findWorkspace(id: string): Promise<Workspace | null> {
  const db = client();
  if (!db) return null;
  // Check the shape first. Postgres rejects a malformed uuid with a driver-level error
  // ("invalid input syntax for type uuid"), which would otherwise propagate as a crash
  // out of corpus-status — the one command that has to survive a broken setup.
  if (!isWorkspaceId(id)) return null;
  const { data, error } = await db.from("workspaces").select("id,slug,name").eq("id", id).maybeSingle();
  if (error) throw new Error(`workspace lookup failed: ${error.message}`);
  return (data as Workspace) ?? null;
}

export async function createWorkspace(slug: string, name: string): Promise<Workspace> {
  const db = client();
  if (!db) throw new Error("Supabase is not configured");
  const { data, error } = await db
    .from("workspaces")
    .insert({ slug, name })
    .select("id,slug,name")
    .single();
  if (error) throw new Error(`workspace create failed: ${error.message}`);
  return data as Workspace;
}

/**
 * Which column keys `documents` on the live DB — "id" (workspace_id, canonical) or
 * "slug" (project, pre-migration). Mirrors SupabaseStore's runtime probe so
 * corpus-status reports what a session would actually do. Null when undeterminable.
 */
export async function documentsKeying(): Promise<"id" | "slug" | null> {
  const db = client();
  if (!db) return null;
  const { error } = await db.from("documents").select("workspace_id").limit(1);
  if (!error) return "id";
  return error.code === "42703" ? "slug" : null;
}

/** Cheap connectivity probe for corpus-status: config says supabase, but is it reachable? */
export async function probe(): Promise<{ ok: boolean; detail: string }> {
  const db = client();
  if (!db) return { ok: false, detail: "not configured" };
  try {
    const { error } = await db.from("workspaces").select("id").limit(1);
    return error ? { ok: false, detail: error.message } : { ok: true, detail: "reachable" };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : String(err) };
  }
}
