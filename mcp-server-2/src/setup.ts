#!/usr/bin/env node
/**
 * `corpus-setup` — one-time, per-project setup. Run from the project you want Corpus in.
 *
 * Creates the conditions for automatic use (ARCHITECTURE.md "no perfect conditions assumed"):
 *   1. Registers the MCP server in the project's .mcp.json (merged, not overwritten).
 *   2. Installs a standing-instruction block into CLAUDE.md and AGENTS.md (creating both),
 *      so agents log/save/query proactively without the user prompting for it.
 *
 * Idempotent: markers guard the instruction block; re-running updates in place.
 * This is an EXPLICIT user action — the only time Corpus ever writes into a repo.
 */
import fs from "node:fs";
import path from "node:path";

const target = process.cwd();
const serverPath = path.resolve(import.meta.dirname, "index.js");

// --- 1. .mcp.json ---------------------------------------------------------
const mcpPath = path.join(target, ".mcp.json");
let mcpConfig: any = { mcpServers: {} };
if (fs.existsSync(mcpPath)) {
  try {
    mcpConfig = JSON.parse(fs.readFileSync(mcpPath, "utf8"));
    mcpConfig.mcpServers ??= {};
  } catch {
    console.error(`.mcp.json exists but is not valid JSON — fix it and re-run.`);
    process.exit(1);
  }
}
mcpConfig.mcpServers["corpus"] = {
  command: "node",
  args: [serverPath],
  env: { CORPUS_PROJECT: path.basename(target) },
};
fs.writeFileSync(mcpPath, JSON.stringify(mcpConfig, null, 2) + "\n", "utf8");
console.log(`✓ .mcp.json — registered "corpus" (project: ${path.basename(target)})`);

// --- 2. Standing instructions ---------------------------------------------
const BEGIN = "<!-- corpus:begin -->";
const END = "<!-- corpus:end -->";
const block = `${BEGIN}
## Corpus memory

This project uses Corpus (MCP tools) for cross-session, cross-tool memory.

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

// Both, unconditionally: CLAUDE.md covers Claude Code, AGENTS.md is the cross-tool
// convention (Cursor, Codex, Copilot, Zed…). Corpus is explicitly cross-tool memory, so
// the standing instructions must land for agents that never read CLAUDE.md.
installBlock("CLAUDE.md", true);
installBlock("AGENTS.md", true);

// --- 3. Graphify graph (best effort) ---------------------------------------
const { buildGraph } = await import("./graphify.js");
const g = buildGraph(target);
console.log(
  g.ok
    ? `✓ Graphify — code graph built (graphify-out/); corpus_code_query is live`
    : `– Graphify — skipped: ${g.text.split(".")[0]}. Memory tools work without it.`,
);

console.log(`
Done. Start your agent in this directory and approve the "corpus" MCP server.
Memory is stored locally in ~/.corpus/${path.basename(target)}/ (no keys, no network).
To use a shared team workspace later, add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
to the server's env in .mcp.json.`);
