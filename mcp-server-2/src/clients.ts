/**
 * Client config plumbing shared by corpus-setup / connect / disconnect / status.
 *
 * Three clients, three formats: Claude Code and Gemini CLI both take JSON under an
 * `mcpServers` key (different files); Codex takes TOML under `mcp_servers`.
 *
 * Everything here is SYMMETRIC across all three by construction. Asymmetry is the bug
 * this module exists to prevent: if connect wires Claude but disconnect only unwires
 * Gemini, a repo keeps writing to a shared workspace the user believes they left.
 */
import fs from "node:fs";
import path from "node:path";

export const WORKSPACE_ENV = "CORPUS_WORKSPACE";

const TOML_BEGIN = "# corpus:begin";
const TOML_END = "# corpus:end";

export interface ClientDef {
  file: string;
  agent: string; // $CORPUS_AGENT — labels the session ledger per tool
  label: string;
  format: "json" | "toml";
}

export const CLIENTS: ClientDef[] = [
  { file: ".mcp.json", agent: "claude-code", label: "Claude Code", format: "json" },
  { file: ".gemini/settings.json", agent: "gemini", label: "Gemini CLI", format: "json" },
  { file: ".codex/config.toml", agent: "codex", label: "Codex CLI", format: "toml" },
];

export interface ClientState {
  def: ClientDef;
  exists: boolean; // the config file is there
  wired: boolean; // it contains a `corpus` server entry
  workspaceId: string | null;
  project: string | null;
}

function jsonPath(target: string, def: ClientDef): string {
  return path.join(target, def.file);
}

function readJson(p: string): any | null {
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    console.error(`${p} exists but is not valid JSON — fix it and re-run.`);
    process.exit(1);
  }
}

function writeJson(p: string, config: unknown): void {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(config, null, 2) + "\n", "utf8");
}

/** Pull one `KEY = "value"` out of the marker-guarded Codex block. */
function tomlEnv(content: string, key: string): string | null {
  const start = content.indexOf(TOML_BEGIN);
  const end = content.indexOf(TOML_END);
  if (start === -1 || end === -1) return null;
  const block = content.slice(start, end);
  const m = block.match(new RegExp(`^\\s*${key}\\s*=\\s*"([^"]*)"`, "m"));
  return m ? m[1] : null;
}

export function readClient(target: string, def: ClientDef): ClientState {
  const p = jsonPath(target, def);
  const base: ClientState = { def, exists: false, wired: false, workspaceId: null, project: null };
  if (!fs.existsSync(p)) return base;

  if (def.format === "json") {
    const config = readJson(p);
    const entry = config?.mcpServers?.corpus;
    if (!entry) return { ...base, exists: true };
    return {
      def,
      exists: true,
      wired: true,
      workspaceId: entry.env?.[WORKSPACE_ENV] ?? null,
      project: entry.env?.CORPUS_PROJECT ?? null,
    };
  }

  const content = fs.readFileSync(p, "utf8");
  const wired = content.includes(TOML_BEGIN) && content.includes(TOML_END);
  return {
    def,
    exists: true,
    wired,
    workspaceId: wired ? tomlEnv(content, WORKSPACE_ENV) : null,
    project: wired ? tomlEnv(content, "CORPUS_PROJECT") : null,
  };
}

export function readAllClients(target: string): ClientState[] {
  return CLIENTS.map((def) => readClient(target, def));
}

/** Full registration — used by corpus-setup. Merges; never clobbers unrelated keys. */
export function registerClient(
  target: string,
  def: ClientDef,
  serverPath: string,
  project: string,
  workspaceId: string | null,
): void {
  const p = jsonPath(target, def);
  const env: Record<string, string> = { CORPUS_PROJECT: project, CORPUS_AGENT: def.agent };
  if (workspaceId) env[WORKSPACE_ENV] = workspaceId;

  if (def.format === "json") {
    const config = readJson(p) ?? {};
    config.mcpServers ??= {};
    config.mcpServers["corpus"] = { command: "node", args: [serverPath], env };
    writeJson(p, config);
    return;
  }

  // Codex: rather than take a TOML parser dependency just to round-trip a user's file,
  // guard our table with comment markers and splice it — same idempotency contract as
  // the markdown blocks in setup.ts, leaving every other key untouched. JSON.stringify
  // is safe for TOML basic strings (same escape rules) and, importantly, escapes the
  // backslashes in a Windows serverPath.
  const envLines = Object.entries(env)
    .map(([k, v]) => `${k} = ${JSON.stringify(v)}`)
    .join("\n");
  const block = `${TOML_BEGIN}
[mcp_servers.corpus]
command = "node"
args = [${JSON.stringify(serverPath)}]

[mcp_servers.corpus.env]
${envLines}
${TOML_END}`;

  const existing = fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
  const start = existing.indexOf(TOML_BEGIN);
  const end = existing.indexOf(TOML_END);
  const next =
    start !== -1 && end !== -1
      ? existing.slice(0, start) + block + existing.slice(end + TOML_END.length)
      : existing.trimEnd() === ""
        ? block + "\n"
        : existing.trimEnd() + "\n\n" + block + "\n";
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, next, "utf8");
}

export interface PatchResult {
  def: ClientDef;
  wired: boolean;
  changed: boolean;
}

/**
 * Set (or, with null, remove) CORPUS_WORKSPACE on every already-wired client.
 *
 * This is the whole of connect/disconnect: one env key. The server entry, CORPUS_PROJECT
 * and the instruction blocks are left alone, so disconnecting goes private without
 * uninstalling anything.
 */
export function patchWorkspace(target: string, workspaceId: string | null): PatchResult[] {
  return CLIENTS.map((def) => {
    const state = readClient(target, def);
    if (!state.wired) return { def, wired: false, changed: false };
    if (state.workspaceId === workspaceId) return { def, wired: true, changed: false };

    const p = jsonPath(target, def);
    if (def.format === "json") {
      const config = readJson(p)!;
      const env = (config.mcpServers.corpus.env ??= {});
      if (workspaceId) env[WORKSPACE_ENV] = workspaceId;
      else delete env[WORKSPACE_ENV];
      writeJson(p, config);
      return { def, wired: true, changed: true };
    }

    const content = fs.readFileSync(p, "utf8");
    const start = content.indexOf(TOML_BEGIN);
    const end = content.indexOf(TOML_END);
    let block = content.slice(start, end);
    const line = new RegExp(`^\\s*${WORKSPACE_ENV}\\s*=\\s*"[^"]*"\\s*$\\n?`, "m");
    block = block.replace(line, "");
    if (workspaceId) block = block.trimEnd() + `\n${WORKSPACE_ENV} = ${JSON.stringify(workspaceId)}\n`;
    fs.writeFileSync(p, content.slice(0, start) + block + content.slice(end), "utf8");
    return { def, wired: true, changed: true };
  });
}
