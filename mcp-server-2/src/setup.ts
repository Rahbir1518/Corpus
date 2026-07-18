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
import fs from "node:fs";
import path from "node:path";
import { CLIENTS, readClient, registerClient } from "./clients.js";
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
} else if (supabaseConfigured()) {
  try {
    const ws = await createWorkspace(project, project);
    workspaceId = ws.id;
    console.log(`✓ Workspace — created ${ws.id}`);
    console.log(`  Share this id with teammates: corpus-connect ${ws.id}`);
  } catch (err) {
    // Not fatal: local memory works with no DB at all, which is the zero-config promise.
    console.error(`– Workspace — could not create: ${err instanceof Error ? err.message : err}`);
    console.error(`  Continuing with local memory (~/.corpus/${project}).`);
  }
} else {
  console.log(`– Workspace — Supabase not configured; memory stays local (~/.corpus/${project})`);
}

// --- 2. Client registration -----------------------------------------------
// Three clients, three formats, all handled in clients.ts so setup/connect/disconnect
// act on the same set. CORPUS_AGENT differs per client so the session ledger shows which
// tool wrote what.
for (const def of CLIENTS) {
  registerClient(target, def, project, workspaceId);
  console.log(`✓ ${def.file} — registered "corpus" (${def.label})`);
}

// --- 3. Standing instructions ---------------------------------------------
const BEGIN = "<!-- corpus:begin -->";
const END = "<!-- corpus:end -->";
const block = `${BEGIN}
## Corpus memory

This project uses Corpus (MCP tools) for cross-session, cross-tool memory.

- At session start, and whenever asked to continue previous work: call \`memory_load\`.
- Immediately after finishing an edit, fixing a bug, or making a design decision:
  call \`memory_log\` — one line; for decisions include the why.
- Before ending a session, or when the user says "save state": call \`memory_save\`
  with concrete file/function references in every in-progress item.

## Exploring code: use \`codebase_search\` FIRST

\`codebase_search\` answers structural questions from a pre-built code graph in ~2K
tokens. The grep-and-read spiral it replaces costs tens of thousands. **Reach for it
before your first grep, not after exploration stalls** — and without waiting to be
asked. It is a default, not an escalation.

Call it whenever you need to know, and cannot already see in context:
- what calls / is called by a function, or where a symbol is defined
- how two areas connect ("how does auth reach the db")
- which files are involved in a feature, before opening any of them
- what a change might break — the blast radius of an edit
- where to start on an unfamiliar task in this repo

Then read only the files it points at. Grep and broad file reads are the fallback for
when the graph misses (it indexes structure, not string literals, comments, or config
values) — not the opening move. If it returns nothing useful, say so and fall back.
${END}`;

function installBlock(file: string, createIfMissing: boolean): void {
  const p = path.join(target, file);
  if (!fs.existsSync(p)) {
    if (!createIfMissing) return;
    fs.writeFileSync(p, block + "\n", "utf8");
    console.log(`✓ ${file} — created with Corpus instructions`);
    return;
  }
  const content = fs.readFileSync(p, "utf8");
  const start = content.indexOf(BEGIN);
  const end = content.indexOf(END);
  const next =
    start !== -1 && end !== -1
      ? content.slice(0, start) + block + content.slice(end + END.length)
      : content.trimEnd() + "\n\n" + block + "\n";
  fs.writeFileSync(p, next, "utf8");
  console.log(`✓ ${file} — Corpus instructions ${start !== -1 ? "updated" : "appended"}`);
}

// All three, unconditionally: CLAUDE.md covers Claude Code, GEMINI.md covers Gemini CLI
// (which reads neither of the others), and AGENTS.md is the cross-tool convention
// (Cursor, Codex, Copilot, Zed…). Corpus is explicitly cross-tool memory, so the standing
// instructions must land for every client we register above — registering the server
// without installing instructions is the worst case: tools present, nothing advocating
// for them.
installBlock("CLAUDE.md", true);
installBlock("GEMINI.md", true);
installBlock("AGENTS.md", true);

// --- 4. Graphify graph (best effort) ---------------------------------------
const { buildGraph } = await import("./graphify.js");
const g = buildGraph(target);
console.log(
  g.ok
    ? `✓ Graphify — code graph built (graphify-out/); codebase_search is live`
    : `– Graphify — skipped: ${g.text.split(".")[0]}. Memory tools work without it.`,
);

console.log(`
Done. Start Claude Code, Gemini CLI, or Codex in this directory and approve the
"corpus" MCP server. All three share one memory store, so a session in any of them
picks up where the others left off.
Memory is stored locally in ~/.corpus/${project}/ (no keys, no network).
To use a shared team workspace later, add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
to the server's env — in each client config you actually use.

Note: Codex only reads .codex/config.toml in projects you have marked trusted; if it
does not appear under /mcp, copy that block into ~/.codex/config.toml instead.`);
