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
  readonly mode: "supabase" | "local";
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

/** Project id: explicit env override, else the cwd's folder name (the repo being worked on). */
export function resolveProject(): string {
  return process.env.CORPUS_PROJECT ?? path.basename(process.cwd());
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
 * Expects the tables in supabase/schema.sql: `documents` (project, name, content,
 * updated_at) referencing `workspaces` (slug, ...), plus `usage_events` for telemetry.
 * The dashboard reads the same tables (Realtime on updates).
 */
class SupabaseStore implements DocumentStore {
  readonly mode = "supabase" as const;
  private db: SupabaseClient;
  private project: string;

  constructor(url: string, key: string, project: string) {
    this.db = createClient(url, key);
    this.project = project;
  }

  async getDocument(name: string): Promise<string | null> {
    const { data, error } = await this.db
      .from("documents")
      .select("content")
      .eq("project", this.project)
      .eq("name", name)
      .maybeSingle();
    if (error) throw new Error(`documents fetch failed: ${error.message}`);
    return data?.content ?? null;
  }

  async putDocument(name: string, content: string): Promise<void> {
    // Satisfies documents.project's FK to workspaces.slug with zero setup step: the
    // first write in a fresh project silently creates its workspace row. Best-effort —
    // logged, not thrown, so a workspaces hiccup never blocks the document write — but
    // logged loudly, not swallowed, so a missing/misapplied schema is diagnosable.
    const { error: workspaceError } = await this.db
      .from("workspaces")
      .upsert({ slug: this.project, name: this.project }, { onConflict: "slug", ignoreDuplicates: true });
    if (workspaceError) {
      console.error(`[corpus-v2] workspaces upsert failed (is supabase/schema.sql applied?): ${workspaceError.message}`);
    }

    const { error } = await this.db.from("documents").upsert({
      project: this.project,
      name,
      content,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(`documents upsert failed: ${error.message}`);
  }

  async listDocuments(): Promise<string[]> {
    const { data, error } = await this.db
      .from("documents")
      .select("name")
      .eq("project", this.project);
    if (error) throw new Error(`documents list failed: ${error.message}`);
    return (data ?? []).map((r) => r.name as string);
  }

  async getCorpusTokenTotal(): Promise<number | null> {
    try {
      const { data, error } = await this.db.from("documents").select("content").eq("project", this.project);
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
      const { error } = await this.db.from("usage_events").insert({
        project: this.project,
        tool: event.tool,
        tokens: event.tokens ?? null,
        agent: event.agent ?? null,
        baseline_tokens: event.baselineTokens ?? null,
        baseline_method: event.baselineTokens != null ? event.baselineMethod ?? null : null,
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
  if (url && key) return new SupabaseStore(url, key, project);
  return new LocalStore(project);
}
