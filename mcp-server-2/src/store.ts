/**
 * Pluggable document store (ARCHITECTURE.md "Storage backends").
 *
 * - SupabaseStore (team mode, canonical): markdown documents in the documentation DB,
 *   shared by workspace. Enabled when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set.
 * - LocalStore (zero config): ~/.corpus/<project>/<doc>.md in the user's home directory —
 *   NEVER the target repo. Used only when nothing shared was ever configured.
 * - DisconnectedStore: memory is OFF. Used whenever the setup points at a workspace this
 *   process cannot reach — including the deliberate post-`corpus-disconnect` state.
 *
 * One rule, no fallbacks between them: a workspace id means memory lands in that
 * workspace or nowhere. Falling back to a private local pile when the workspace was
 * unreachable created a second, diverging version of the memory — the exact confusion
 * connect/disconnect exists to prevent. Disconnected repos are told to `corpus-connect`
 * back into their previous workspace or `corpus-setup` a new one, not silently forked.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { estimateTokens } from "./tokens.js";

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
  readonly mode: "supabase" | "local" | "disconnected";
  /** Why memory is off. Set only when mode === "disconnected". */
  readonly reason?: string;
  /**
   * What to call this memory in user-facing text. When connected, that is the CONNECTED
   * WORKSPACE's slug — not the local folder — so a session reports the memory it is
   * actually reading. Async because the name lives in the DB; memoized per process.
   * Never throws: display falls back to the local label if the lookup fails.
   */
  label(): Promise<string>;
  getDocument(name: string): Promise<string | null>;
  putDocument(name: string, content: string): Promise<void>;
  listDocuments(): Promise<string[]>;
  /**
   * Real (not estimated-multiplier) size of every document in this project's memory
   * store, in tokens — the measured "without Corpus's targeted fetch, you'd load
   * everything" baseline for corpus_load. Never throws; returns null if it can't be
   * measured, so a telemetry hiccup never fabricates a number.
   */
  getCorpusTokenTotal(): Promise<number | null>;
  /** Best-effort usage telemetry (dashboard token counter + activity feed). Never throws. */
  logUsage(event: {
    tool: string;
    tokens?: number;
    agent?: string;
    baselineTokens?: number | null;
    baselineMethod?: string;
  }): Promise<void>;
}

/**
 * LOCAL label: explicit env override, else the cwd's folder name. NOT an identity, and
 * NOT what a connected session is named after.
 *
 * Once a workspace id is present, this is a fallback only — used to name LocalStore's
 * directory, and to have something to print if the workspace lookup fails. Everything
 * that identifies a connected memory (which rows are read, which rows are written, what
 * the usage ledger attributes a call to) comes from the workspace, via
 * SupabaseStore.workspace(). Deriving any of that from the folder is the bug this
 * separation exists to prevent: the same repo cloned to `api-v2` must still read the
 * memory it connected to, and two unrelated repos both called `api` must not collide.
 */
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
  readonly dir: string;
  private project: string;

  constructor(project: string) {
    this.project = project;
    this.dir = path.join(os.homedir(), ".corpus", project);
  }

  // Nothing was connected, so the local label IS the identity here — the one mode where
  // naming the memory after the folder is correct rather than a leak.
  async label(): Promise<string> {
    return this.project;
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

  async getCorpusTokenTotal(): Promise<number | null> {
    if (!fs.existsSync(this.dir)) return null;
    try {
      let total = 0;
      for (const f of fs.readdirSync(this.dir)) {
        if (!f.endsWith(".md")) continue;
        total += estimateTokens(fs.readFileSync(path.join(this.dir, f), "utf8"));
      }
      return total;
    } catch {
      return null;
    }
  }

  // Offline mode has no dashboard to feed.
  async logUsage(): Promise<void> {}
}

/**
 * Works against BOTH document keyings, detected at runtime, because the last outage here
 * was code that assumed a column the live DB didn't have:
 *
 * - "id"   — migrated schema: `documents (workspace_id uuid FK → workspaces.id, name)`.
 *            Two repos with the same folder name write to different rows. Canonical;
 *            what schema.sql now creates and migrate-documents-to-workspace-id.sql
 *            produces.
 * - "slug" — original schema: `documents (project text FK → workspaces.slug, name)`.
 *            Folder-name collisions share rows. Kept working, with a loud nudge to
 *            migrate, so shipping this code before the SQL runs breaks nothing.
 */
class SupabaseStore implements DocumentStore {
  readonly mode = "supabase" as const;
  private db: SupabaseClient;
  private workspaceId: string;
  /**
   * The LOCAL folder label. Never used to select or write a row — only as display text
   * when the workspace lookup itself fails, and to label best-effort telemetry.
   */
  private localLabel: string;
  private keying: "id" | "slug" | null = null;
  private workspaceRow: { slug: string; name: string } | null = null;

  constructor(url: string, key: string, workspaceId: string, project: string) {
    this.db = createClient(url, key);
    this.workspaceId = workspaceId;
    this.localLabel = project;
  }

  /**
   * The connected workspace's row, memoized per process. Null when it cannot be read —
   * never cached, so a transient outage doesn't pin a wrong answer for the session.
   *
   * This is where a connected session's identity actually comes from. Callers that need
   * it to be RIGHT (which documents to touch) must fail when it's null; callers that only
   * decorate output (labels, telemetry) fall back to localLabel.
   */
  private async workspace(): Promise<{ slug: string; name: string } | null> {
    if (this.workspaceRow) return this.workspaceRow;
    const { data, error } = await this.db
      .from("workspaces")
      .select("slug,name")
      .eq("id", this.workspaceId)
      .maybeSingle();
    if (error || !data) return null;
    this.workspaceRow = data as { slug: string; name: string };
    return this.workspaceRow;
  }

  async label(): Promise<string> {
    return (await this.workspace())?.slug ?? this.localLabel;
  }

  /**
   * The value that keys `documents` on a SLUG-keyed (pre-migration) DB: the connected
   * workspace's slug, read from the DB.
   *
   * It must not be the folder name. That was the bug: `corpus-connect <id>` wrote the id
   * into the client config, but every read and write still went to `documents where
   * project = <local folder>` — so connecting to a teammate's workspace appeared to
   * succeed and then silently served the local folder's memory instead of theirs.
   *
   * Throws rather than falling back, because the fallback IS the bug: writing to a
   * folder-named row while the user believes they are in a shared workspace is exactly
   * the silent fork this module's header rules out.
   */
  private async slugKey(): Promise<string> {
    const ws = await this.workspace();
    if (!ws) {
      throw new Error(
        `workspace ${this.workspaceId} could not be read, so this repo's memory cannot be ` +
          `resolved (this DB keys documents by slug). Check corpus-status; reconnect with ` +
          `corpus-connect <id>.`,
      );
    }
    return ws.slug;
  }

  /** Probe which column keys `documents`. Memoized on success; retried after failures. */
  private async keyed(): Promise<"id" | "slug"> {
    if (this.keying) return this.keying;
    const { error } = await this.db.from("documents").select("workspace_id").limit(1);
    if (error && error.code !== "42703") {
      // Genuine failure (network, auth, missing table) — don't cache a guess.
      throw new Error(`documents probe failed: ${error.message}`);
    }
    this.keying = error ? "slug" : "id"; // 42703 = column does not exist
    if (this.keying === "slug") {
      console.error(
        `[corpus-v2] documents is still keyed by project slug — repos with the same folder ` +
          `name share memory. Run supabase/migrate-documents-to-workspace-id.sql (SQL ` +
          `editor, once) to key by workspace id.`,
      );
    }
    return this.keying;
  }

  async getDocument(name: string): Promise<string | null> {
    const q = this.db.from("documents").select("content").eq("name", name);
    const { data, error } =
      (await this.keyed()) === "id"
        ? await q.eq("workspace_id", this.workspaceId).maybeSingle()
        : await q.eq("project", await this.slugKey()).maybeSingle();
    if (error) throw new Error(`documents fetch failed: ${error.message}`);
    return data?.content ?? null;
  }

  async putDocument(name: string, content: string): Promise<void> {
    if ((await this.keyed()) === "id") {
      // No auto-create here: the FK to workspaces.id means a write can only land in a
      // workspace corpus-setup/connect deliberately made — the point of id keying.
      const { error } = await this.db.from("documents").upsert(
        { workspace_id: this.workspaceId, name, content, updated_at: new Date().toISOString() },
        { onConflict: "workspace_id,name" },
      );
      if (error) {
        const hint =
          error.code === "23503" // FK violation: the configured workspace row is gone
            ? ` (workspace ${this.workspaceId} does not exist — check corpus-status, reconnect with corpus-connect <id>)`
            : "";
        throw new Error(`documents upsert failed: ${error.message}${hint}`);
      }
      return;
    }

    // Slug keying: documents.project FKs to workspaces.slug. The slug comes from the
    // CONNECTED workspace row, which by definition already exists — so, unlike the old
    // code path, there is no workspaces upsert here. That upsert created a SECOND
    // workspace named after the local folder and then wrote the memory into it, which is
    // how a connected repo ended up with its documents somewhere the workspace's own
    // dashboard never showed them.
    const { error } = await this.db.from("documents").upsert({
      project: await this.slugKey(),
      name,
      content,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(`documents upsert failed: ${error.message}`);
  }

  async listDocuments(): Promise<string[]> {
    const q = this.db.from("documents").select("name");
    const { data, error } =
      (await this.keyed()) === "id"
        ? await q.eq("workspace_id", this.workspaceId)
        : await q.eq("project", await this.slugKey());
    if (error) throw new Error(`documents list failed: ${error.message}`);
    return (data ?? []).map((r) => r.name as string);
  }

  async getCorpusTokenTotal(): Promise<number | null> {
    try {
      // Must follow the SAME keying as getDocument, or the baseline describes a different
      // project's memory than the one that was just loaded. This unconditionally filtered
      // by `project`, which on the canonical id-keyed schema is not even a column: every
      // call failed with 42703 and corpus_load silently reported no baseline at all.
      const q = this.db.from("documents").select("content");
      const { data, error } =
        (await this.keyed()) === "id"
          ? await q.eq("workspace_id", this.workspaceId)
          : await q.eq("project", await this.slugKey());
      if (error) {
        console.error(`[corpus-v2] getCorpusTokenTotal failed: ${error.message}`);
        return null;
      }
      return (data ?? []).reduce((sum, r) => sum + estimateTokens((r.content as string) ?? ""), 0);
    } catch (err) {
      console.error(`[corpus-v2] getCorpusTokenTotal threw: ${err instanceof Error ? err.message : err}`);
      return null;
    }
  }

  async logUsage(event: {
    tool: string;
    tokens?: number;
    agent?: string;
    baselineTokens?: number | null;
    baselineMethod?: string;
  }): Promise<void> {
    // Best-effort: a telemetry failure must never break a tool call. Supabase-js
    // resolves with { error } rather than throwing, so that's checked (and logged, not
    // swallowed) in addition to the try/catch for genuine network-level exceptions.
    try {
      // Attribute the call to the workspace it actually ran against. `project` used to be
      // the local folder name, so one workspace's usage was split across every folder its
      // members happened to check out, and two unrelated repos sharing a folder name were
      // merged into one line. workspace_id is the unambiguous key (slug is deliberately
      // non-unique); the slug is kept alongside it as the human-readable label.
      const ws = await this.workspace();
      const row = {
        project: ws?.slug ?? this.localLabel,
        tool: event.tool,
        tokens: event.tokens ?? null,
        agent: event.agent ?? null,
        baseline_tokens: event.baselineTokens ?? null,
        baseline_method: event.baselineTokens != null ? event.baselineMethod ?? null : null,
      };

      const { error } = await this.db
        .from("usage_events")
        .insert({ ...row, workspace_id: this.workspaceId });
      // 42703: this DB predates the workspace_id column. Retry without it so telemetry
      // keeps flowing before supabase/schema.sql is re-run, rather than going dark.
      if (error?.code === "42703") {
        const { error: retry } = await this.db.from("usage_events").insert(row);
        if (retry) {
          console.error(`[corpus-v2] usage_events insert failed: ${retry.message}`);
        }
        return;
      }
      if (error) {
        console.error(`[corpus-v2] usage_events insert failed (is supabase/schema.sql applied?): ${error.message}`);
      }
    } catch (err) {
      console.error(`[corpus-v2] usage_events insert threw: ${err instanceof Error ? err.message : err}`);
    }
  }
}

/**
 * Memory is off. Every read/write throws with the reason — a backstop; index.ts checks
 * `mode` first and answers with the connect/setup guidance instead of calling these.
 * Deliberately NOT a local store: writing anywhere while disconnected would create a
 * second version of the memory that the workspace never sees.
 */
class DisconnectedStore implements DocumentStore {
  readonly mode = "disconnected" as const;
  readonly reason: string;
  private project: string;

  constructor(reason: string, project: string) {
    this.reason = reason;
    this.project = project;
    console.error(`[corpus-v2] memory off — ${reason}`);
  }

  // No workspace to name it after; the local label is all there is. Doesn't throw like
  // the read/write methods — this only ever decorates an error message.
  async label(): Promise<string> {
    return this.project;
  }

  private fail(): never {
    throw new Error(
      `Corpus memory is off — ${this.reason}. Run corpus-connect <workspace-id> or corpus-setup.`,
    );
  }

  async getDocument(): Promise<string | null> {
    this.fail();
  }
  async putDocument(): Promise<void> {
    this.fail();
  }
  async listDocuments(): Promise<string[]> {
    this.fail();
  }
  async getCorpusTokenTotal(): Promise<number | null> {
    return null;
  }
  async logUsage(): Promise<void> {}
}

export function createStore(project: string): DocumentStore {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const workspaceId = resolveWorkspace();

  // A malformed id is worse than none: Postgres rejects a non-uuid at the driver level,
  // so SupabaseStore would throw on EVERY read and write with an opaque driver error.
  // Disconnected says why once, up front, with the fix.
  if (workspaceId && !isWorkspaceId(workspaceId)) {
    return new DisconnectedStore(
      `CORPUS_WORKSPACE="${workspaceId}" is not a valid workspace id (expected a uuid)`,
      project,
    );
  }

  if (workspaceId && url && key) return new SupabaseStore(url, key, workspaceId, project);

  // A workspace id is a commitment: memory lands in that workspace or nowhere. Without
  // credentials the workspace is unreachable, and quietly writing somewhere else instead
  // is how a repo ends up with two diverging versions of its memory.
  if (workspaceId) {
    return new DisconnectedStore(
      `this repo is connected to workspace ${workspaceId} but SUPABASE_URL / ` +
        `SUPABASE_SERVICE_ROLE_KEY are not set, so the workspace cannot be reached`,
      project,
    );
  }

  // Credentials but no workspace: the post-`corpus-disconnect` state. The user chose to
  // leave every workspace, so memory is off until they choose the next one — connect back
  // into the previous workspace, or set up a new one. No silent local fork.
  if (url && key) {
    return new DisconnectedStore("this repo is not connected to a workspace", project);
  }

  // Nothing shared was ever configured: plain local memory IS the intended store.
  return new LocalStore(project);
}
