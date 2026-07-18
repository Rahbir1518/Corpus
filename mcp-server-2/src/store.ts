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
}

/**
 * Expects a `documents` table: (project text, name text, content text, updated_at timestamptz,
 * primary key (project, name)). The dashboard reads the same table (Realtime on updates).
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
}

export function createStore(project: string): DocumentStore {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) return new SupabaseStore(url, key, project);
  return new LocalStore(project);
}
