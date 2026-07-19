#!/usr/bin/env node
/**
 * `corpus-setup` — one-time, per-project setup. Run from the project you want Corpus in.
 *
 * Creates the conditions for automatic use (ARCHITECTURE.md "no perfect conditions assumed"):
 *   1. Creates the shared workspace (when Supabase is configured) and prints the id to
 *      share. The server never creates one on write, so this is where it comes from.
 *   2. Registers the MCP server with every supported client (merged, not overwritten):
 *      .mcp.json (Claude Code), .gemini/settings.json (Gemini CLI),
 *      .codex/config.toml (Codex CLI).
 *   3. Installs a standing-instruction block into CLAUDE.md, GEMINI.md and AGENTS.md
 *      (creating each), so agents log/save/query proactively without being prompted.
 *      One instruction file per client we register in step 2 — they do not read each
 *      other's.
 *   4. Builds the code graph, best effort.
 *
 * corpus-setup CREATES a workspace; corpus-connect <id> joins one someone else made.
 * That is the only difference between them.
 *
 * Idempotent: markers guard the instruction block, and an existing workspace id is
 * reused rather than replaced, so re-running never strands memory in an orphan.
 * This is an EXPLICIT user action — the only time Corpus ever writes into a repo.
 */
import path from "node:path";
import { CLIENTS, readClient } from "./clients.js";
import { recordWorkspace } from "./registry.js";
import { wireRepo } from "./wire.js";
import { createWorkspace, supabaseConfigured } from "./workspace.js";

const target = process.cwd();
const project = path.basename(target);

// --- 1. Workspace ----------------------------------------------------------
// Since the server no longer auto-creates a workspace on write (that keyed on slug, so
// two unrelated teams with a folder named `api` silently shared one), setup is where a
// workspace comes from. Reuse whatever this repo is already connected to, so re-running
// setup never strands the existing memory in an orphaned workspace.
let workspaceId: string | null =
  CLIENTS.map((def) => readClient(target, def).workspaceId).find(Boolean) ?? null;

if (workspaceId) {
  console.log(`✓ Workspace — already connected (${workspaceId})`);
  // Into the rolodex even on reuse: the id may predate corpus-ls, or have arrived via a
  // teammate's committed .mcp.json without ever passing through corpus-connect here.
  recordWorkspace({ id: workspaceId, origin: "connected", repo: target });
} else if (supabaseConfigured()) {
  try {
    const ws = await createWorkspace(project, project);
    workspaceId = ws.id;
    recordWorkspace({ id: ws.id, name: ws.name, slug: ws.slug, origin: "created", repo: target });
    console.log(`✓ Workspace — created ${ws.id}`);
    console.log(`  Share this id with teammates: corpus-connect ${ws.id}`);
  } catch (err) {
    console.error(`– Workspace — could not create: ${err instanceof Error ? err.message : err}`);
    console.error(
      `  Memory will be OFF until this repo joins a workspace — re-run corpus-setup,\n` +
        `  or corpus-connect <id> if a teammate already has one.`,
    );
  }
} else {
  console.log(`– Workspace — Supabase not configured; memory stays local (~/.corpus/${project})`);
}

registerJsonClient(".mcp.json", "claude-code", "Claude Code");
registerJsonClient(".gemini/settings.json", "gemini", "Gemini CLI");

// Codex: TOML. Rather than take on a TOML parser dependency just to round-trip a user's
// file, guard our table with comment markers and splice it — same idempotency contract as
// the markdown blocks below, and it leaves every other key in the file untouched.
// JSON.stringify is safe for TOML basic strings (same escape rules) and, importantly,
// escapes the backslashes in a Windows serverPath.
const TOML_BEGIN = "# corpus:begin";
const TOML_END = "# corpus:end";
const tomlBlock = `${TOML_BEGIN}
[mcp_servers.corpus]
command = "node"
args = [${JSON.stringify(serverPath)}]

[mcp_servers.corpus.env]
CORPUS_PROJECT = ${JSON.stringify(project)}
CORPUS_AGENT = "codex"
${TOML_END}`;

const codexPath = path.join(target, ".codex", "config.toml");
const codexExisting = fs.existsSync(codexPath) ? fs.readFileSync(codexPath, "utf8") : "";
const codexStart = codexExisting.indexOf(TOML_BEGIN);
const codexEnd = codexExisting.indexOf(TOML_END);
const codexNext =
  codexStart !== -1 && codexEnd !== -1
    ? codexExisting.slice(0, codexStart) + tomlBlock + codexExisting.slice(codexEnd + TOML_END.length)
    : codexExisting.trimEnd() === ""
      ? tomlBlock + "\n"
      : codexExisting.trimEnd() + "\n\n" + tomlBlock + "\n";
fs.mkdirSync(path.dirname(codexPath), { recursive: true });
fs.writeFileSync(codexPath, codexNext, "utf8");
console.log(`✓ .codex/config.toml — registered "corpus" (Codex CLI)`);

// --- 2. Standing instructions ---------------------------------------------
const BEGIN = "<!-- corpus:begin -->";
const END = "<!-- corpus:end -->";
const block = `${BEGIN}
## Corpus memory

This project uses Corpus (MCP tools) for cross-session, cross-tool memory.

- If \`corpus_load\` says this is session one (no memory yet): call \`corpus_init\` before
  any other work, so Architecture notes are seeded from the code graph instead of blank.
- At session start, and whenever asked to continue previous work: call \`corpus_load\`.
- Immediately after finishing an edit, fixing a bug, or making a design decision:
  call \`corpus_log\` — one line; for decisions include the why.
- Before ending a session, or when the user says "save state": call \`corpus_save\`
  with concrete file/function references in every in-progress item.

## Exploring code: use \`corpus_code_query\` FIRST

\`corpus_code_query\` answers structural questions from a pre-built code graph in ~2K
tokens. The grep-and-read spiral it replaces costs tens of thousands. **Reach for it
before your first grep, not after exploration stalls** — and without waiting to be
asked. It is a default, not an escalation.

const memoryLine = workspaceId
  ? `Memory lands in workspace ${workspaceId} — share the id for corpus-connect.`
  : supabaseConfigured()
    ? `Memory is OFF until this repo joins a workspace (corpus-setup / corpus-connect <id>).`
    : `Memory is stored locally in ~/.corpus/${project}/ (no keys, no network).
To use a shared team workspace later, add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
to mcp-server-2/.env.local and re-run corpus-setup.`;

console.log(`
Done. Start Claude Code, Gemini CLI, or Codex in this directory and approve the
"corpus" MCP server. All three share one memory store, so a session in any of them
picks up where the others left off.
${memoryLine}

Scope: this wiring lives in THIS directory's config files (.mcp.json, .gemini/,
.codex/) — agents read them from the directory a session is opened in, so sessions
started elsewhere will not have Corpus. Run corpus-setup per project (commit the
configs to share them with teammates), and corpus-ls to see every workspace this
machine has access to.

Note: Codex only reads .codex/config.toml in projects you have marked trusted; if it
does not appear under /mcp, copy that block into ~/.codex/config.toml instead.`);
