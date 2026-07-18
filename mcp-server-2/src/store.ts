/**
 * Pluggable document store (ARCHITECTURE.md "Storage backends").
 *
 * - SupabaseStore (team mode, canonical): markdown documents in the documentation DB,
 *   shared by workspace. Enabled when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set.
 * - LocalStore (offline fallback, zero config): ~/.corpus/<project>/<doc>.md in the user's
 *   home directory — NEVER the target repo.
 *
 * Both store the same markdown; document.ts merge logic is backend-agnostic.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Load .env.local sitting next to this package (mcp-server-2/.env.local) so Supabase
// credentials never need to live in a git-tracked .mcp.json. Real env vars win.
{
  const pkgDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
  const envFile = path.join(pkgDir, ".env.local");
  if (fs.existsSync(envFile)) {
    for (const line of fs.readFileSync(envFile, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

export interface DocumentStore {
  readonly mode: "supabase" | "local";
  getDocument(name: string): Promise<string | null>;
  putDocument(name: string, content: string): Promise<void>;
  listDocuments(): Promise<string[]>;
  /** Best-effort usage telemetry (dashboard token counter + activity feed). Never throws. */
  logUsage(event: { tool: string; tokens?: number; agent?: string }): Promise<void>;
}

/** Display label: explicit env override, else the cwd's folder name. NOT an identity. */
export function resolveProject(): string {
  return process.env.CORPUS_PROJECT ?? path.basename(process.cwd());
}

/**
 * Shared-workspace identity: the opaque uuid written by corpus-setup / corpus-connect.
 *
 * Its presence is what "connected" means. Absent -> this repo is private and we use
 * LocalStore, even when Supabase credentials are available. Deliberately NOT derived
 * from the folder name: two unrelated teams both working in a folder called `api` must
 * never resolve to the same workspace.
 */
export function resolveWorkspace(): string | null {
  // Empty/whitespace counts as unset. `??` alone would let CORPUS_WORKSPACE="" (common in
  // a .env stub or an exported-but-empty shell var) shadow a real id from the client
  // config, so a connected repo would report itself private.
  const value = process.env.CORPUS_WORKSPACE?.trim();
  return value ? value : null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** workspaces.id is a uuid; anything else can only ever be a typo or a placeholder. */
export function isWorkspaceId(value: string): boolean {
  return UUID_RE.test(value);
}

class LocalStore implements DocumentStore {
  readonly mode = "local" as const;
  private dir: string;

  constructor(project: string) {
    this.dir = path.join(os.homedir(), ".corpus", project);
  }

  private docPath(name: string): string {
    // Document names are titles like "state" or "Schema migrations" — sanitize for the fs.
    const safe = name.replace(/[^a-zA-Z0-9 _-]/g, "_");
    return path.join(this.dir, `${safe}.md`);
  }

  async getDocument(name: string): Promise<string | null> {
    const p = this.docPath(name);
    return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
  }

  async putDocument(name: string, content: string): Promise<void> {
    fs.mkdirSync(this.dir, { recursive: true });
    fs.writeFileSync(this.docPath(name), content, "utf8");
  }

  async listDocuments(): Promise<string[]> {
    if (!fs.existsSync(this.dir)) return [];
    return fs
      .readdirSync(this.dir)
      .filter((f) => f.endsWith(".md"))
      .map((f) => f.slice(0, -3));
  }

  // Offline mode has no dashboard to feed.
  async logUsage(): Promise<void> {}
}

/**
 * Expects the tables in supabase/schema.sql: `documents` (project, name, content,
 * updated_at) referencing `workspaces` (slug, ...), plus `usage_events` for telemetry.
 * The dashboard reads the same tables (Realtime on updates).
 */
class SupabaseStore implements DocumentStore {
  readonly mode = "supabase" as const;
  private db: SupabaseClient;
  private workspaceId: string;
  private project: string;

  constructor(url: string, key: string, workspaceId: string, project: string) {
    this.db = createClient(url, key);
    this.workspaceId = workspaceId;
    this.project = project; // display label only; never an identity
  }

  async getDocument(name: string): Promise<string | null> {
    const { data, error } = await this.db
      .from("documents")
      .select("content")
      .eq("workspace_id", this.workspaceId)
      .eq("name", name)
      .maybeSingle();
    if (error) throw new Error(`documents fetch failed: ${error.message}`);
    return data?.content ?? null;
  }

  async putDocument(name: string, content: string): Promise<void> {
    // No workspace auto-create. Workspaces are created explicitly by corpus-setup /
    // corpus-connect, which is what keeps identity opaque: a write can only ever land in
    // a workspace someone deliberately connected this repo to. (The old auto-upsert
    // keyed on slug, so two unrelated teams with a folder named `api` silently shared
    // one workspace — the second team read, then overwrote, the first team's memory.)
    const { error } = await this.db.from("documents").upsert(
      {
        workspace_id: this.workspaceId,
        name,
        content,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id,name" },
    );
    if (error) throw new Error(`documents upsert failed: ${error.message}`);
  }

  async listDocuments(): Promise<string[]> {
    const { data, error } = await this.db
      .from("documents")
      .select("name")
      .eq("workspace_id", this.workspaceId);
    if (error) throw new Error(`documents list failed: ${error.message}`);
    return (data ?? []).map((r) => r.name as string);
  }

  async logUsage(event: { tool: string; tokens?: number; agent?: string }): Promise<void> {
    // Best-effort: a telemetry failure must never break a tool call. Supabase-js
    // resolves with { error } rather than throwing, so that's checked (and logged, not
    // swallowed) in addition to the try/catch for genuine network-level exceptions.
    try {
      const { error } = await this.db.from("usage_events").insert({
        workspace_id: this.workspaceId,
        project: this.project,
        tool: event.tool,
        tokens: event.tokens ?? null,
        agent: event.agent ?? null,
      });
      if (error) {
        console.error(`[corpus-v2] usage_events insert failed (is supabase/schema.sql applied?): ${error.message}`);
      }
    } catch (err) {
      console.error(`[corpus-v2] usage_events insert threw: ${err instanceof Error ? err.message : err}`);
    }
  }
}

export function createStore(project: string): DocumentStore {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const workspaceId = resolveWorkspace();

  // A malformed id is worse than none: Postgres rejects a non-uuid at the driver level,
  // so SupabaseStore would throw on EVERY read and write rather than degrading. Fall back
  // to local and say why — losing sharing is recoverable, losing every tool call is not.
  if (workspaceId && !isWorkspaceId(workspaceId)) {
    console.error(
      `[corpus-v2] CORPUS_WORKSPACE="${workspaceId}" is not a valid workspace id (expected a ` +
        `uuid) — using local memory (~/.corpus/${project}). Fix with \`corpus-connect <id>\`.`,
    );
    return new LocalStore(project);
  }

  // All three required. Credentials alone are not enough: without a workspace id there
  // is no safe answer to "which shared pile does this repo write to", and guessing from
  // the folder name is exactly the bug this replaced. Unconnected repos stay private.
  if (url && key && workspaceId) return new SupabaseStore(url, key, workspaceId, project);

  if (url && key && !workspaceId) {
    console.error(
      `[corpus-v2] Supabase credentials present but this repo is not connected to a ` +
        `workspace — using local memory (~/.corpus/${project}). Run \`corpus-connect <id>\` to share.`,
    );
  }
  return new LocalStore(project);
}
