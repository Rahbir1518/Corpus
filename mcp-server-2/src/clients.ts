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

/**
 * The command clients spawn. `corpus-mcp-v2` is the package's bin, put on PATH by
 * `npm link` / `npm i -g`, so this is machine-independent.
 *
 * It used to be `node <absolute path to dist/index.js>`. Client configs get committed —
 * that is how teammates pick up an MCP server — so an absolute path meant every clone
 * carried one machine's filesystem layout. mcp-server-2/.mcp.json in this repo still
 * points at C:\Code\Hackathons\... and cannot start anywhere else. Failing with
 * "command not found" when Corpus isn't installed is a far better failure than silently
 * pointing at a path that does not exist.
 */
export const SERVER_COMMAND = "corpus-mcp-v2";

/**
 * How a client must SPAWN that command — platform-dependent, and the difference is the
 * whole ballgame on Windows.
 *
 * MCP clients spawn servers directly (no shell). `npm link` installs three files per
 * bin: an extensionless sh shim, a `.cmd`, and a `.ps1`. Without a shell, Windows can
 * execute none of them by the bare name:
 *
 *   spawn("corpus-mcp-v2")      -> ENOENT  (Windows only execs .exe/.cmd/.bat)
 *   spawn("corpus-mcp-v2.cmd")  -> EINVAL  (Node >=20.12/22 refuses to spawn .cmd
 *                                           without a shell — the CVE-2024-27980 fix)
 *   spawn("cmd", ["/c", ...])   -> works
 *
 * The failure is silent from the user's side: the server never starts, its tools never
 * attach, and the model looks like it is "ignoring" Corpus when in fact Corpus was
 * never there. That symptom cost a full debugging session, hence this comment.
 *
 * NOTE for mixed-OS teams: this bakes the host platform into a committed config, so a
 * Windows-written entry will not start on macOS/Linux and vice versa. Each dev should
 * run `corpus-setup` once on their own machine — it rewrites this entry in place.
 */
export function serverSpawn(): { command: string; args: string[] } {
  return process.platform === "win32"
    ? { command: "cmd", args: ["/c", SERVER_COMMAND] }
    : { command: SERVER_COMMAND, args: [] };
}

/** Full registration — used by corpus-setup. Merges; never clobbers unrelated keys. */
export function registerClient(
  target: string,
  def: ClientDef,
  project: string,
  workspaceId: string | null,
): void {
  const p = jsonPath(target, def);
  const env: Record<string, string> = { CORPUS_PROJECT: project, CORPUS_AGENT: def.agent };
  if (workspaceId) env[WORKSPACE_ENV] = workspaceId;

  if (def.format === "json") {
    const config = readJson(p) ?? {};
    config.mcpServers ??= {};
    const spawn = serverSpawn();
    config.mcpServers["corpus"] = { command: spawn.command, args: spawn.args, env };
    writeJson(p, config);
    return;
  }

  // Codex: rather than take a TOML parser dependency just to round-trip a user's file,
  // guard our table with comment markers and splice it — same idempotency contract as
  // the markdown blocks in setup.ts, leaving every other key untouched. JSON.stringify
  // is safe for TOML basic strings (same escape rules).
  const envLines = Object.entries(env)
    .map(([k, v]) => `${k} = ${JSON.stringify(v)}`)
    .join("\n");
  const spawn = serverSpawn();
  const block = `${TOML_BEGIN}
[mcp_servers.corpus]
command = ${JSON.stringify(spawn.command)}
args = [${spawn.args.map((a) => JSON.stringify(a)).join(", ")}]

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

/**
 * Remove the `corpus` server entry from one client — the inverse of registerClient.
 * Returns true if anything was removed.
 *
 * Prunes containers only when WE emptied them: an `mcpServers` left with no servers
 * goes, and a config file left with no keys at all goes with it (it was ours to begin
 * with). Any other key the user has in that file keeps the file alive — uninstalling
 * Corpus must never take an unrelated MCP server or setting with it.
 */
export function unregisterClient(target: string, def: ClientDef): boolean {
  const p = jsonPath(target, def);
  if (!fs.existsSync(p)) return false;

  if (def.format === "json") {
    const config = readJson(p);
    if (!config?.mcpServers?.corpus) return false;
    delete config.mcpServers.corpus;
    if (!Object.keys(config.mcpServers).length) delete config.mcpServers;
    if (!Object.keys(config).length) fs.rmSync(p);
    else writeJson(p, config);
    return true;
  }

  // Codex: excise the marker-guarded block, same splice registerClient uses to write it.
  const content = fs.readFileSync(p, "utf8");
  const start = content.indexOf(TOML_BEGIN);
  const end = content.indexOf(TOML_END);
  if (start === -1 || end === -1) return false;
  const next = (content.slice(0, start) + content.slice(end + TOML_END.length)).trim();
  if (next) fs.writeFileSync(p, next + "\n", "utf8");
  else fs.rmSync(p);
  return true;
}

export interface PatchResult {
  def: ClientDef;
  wired: boolean;
  changed: boolean;
}

/**
 * Set (or, with null, remove) CORPUS_WORKSPACE on every already-wired client.
 *
 * `project` re-labels the clients to match the workspace being joined. Connect passes the
 * workspace's slug so a repo stops calling itself after its local folder the moment it
 * joins someone else's workspace — the session-start hook reads CORPUS_PROJECT out of
 * these files and had no other way to learn the workspace's real name. Omit it (or pass
 * null) to leave the existing label alone, which is what disconnect wants: going private
 * shouldn't rename anything.
 */
export function patchWorkspace(
  target: string,
  workspaceId: string | null,
  project?: string | null,
): PatchResult[] {
  return CLIENTS.map((def) => {
    const state = readClient(target, def);
    if (!state.wired) return { def, wired: false, changed: false };
    const relabel = Boolean(project && project !== state.project);
    if (state.workspaceId === workspaceId && !relabel) return { def, wired: true, changed: false };

    const p = jsonPath(target, def);
    if (def.format === "json") {
      const config = readJson(p)!;
      const env = (config.mcpServers.corpus.env ??= {});
      if (workspaceId) env[WORKSPACE_ENV] = workspaceId;
      else delete env[WORKSPACE_ENV];
      if (relabel) env.CORPUS_PROJECT = project!;
      writeJson(p, config);
      return { def, wired: true, changed: true };
    }

    const content = fs.readFileSync(p, "utf8");
    const start = content.indexOf(TOML_BEGIN);
    const end = content.indexOf(TOML_END);
    let block = content.slice(start, end);
    const line = new RegExp(`^\\s*${WORKSPACE_ENV}\\s*=\\s*"[^"]*"\\s*$\\n?`, "m");
    block = block.replace(line, "");
    if (relabel) {
      const projectLine = /^\s*CORPUS_PROJECT\s*=\s*"[^"]*"\s*$/m;
      const next = `CORPUS_PROJECT = ${JSON.stringify(project!)}`;
      block = projectLine.test(block) ? block.replace(projectLine, next) : block.trimEnd() + `\n${next}\n`;
    }
    if (workspaceId) block = block.trimEnd() + `\n${WORKSPACE_ENV} = ${JSON.stringify(workspaceId)}\n`;
    fs.writeFileSync(p, content.slice(0, start) + block + content.slice(end), "utf8");
    return { def, wired: true, changed: true };
  });
}
