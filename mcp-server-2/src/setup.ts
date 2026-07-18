#!/usr/bin/env node
/**
 * `corpus-setup` — one-time, per-project setup. Run from the project you want Corpus in.
 *
 * Creates the conditions for automatic use (ARCHITECTURE.md "no perfect conditions assumed"):
 *   1. Registers the MCP server with every supported client (merged, not overwritten):
 *      .mcp.json (Claude Code), .gemini/settings.json (Gemini CLI),
 *      .codex/config.toml (Codex CLI).
 *   2. Installs a standing-instruction block into CLAUDE.md and AGENTS.md (creating both),
 *      so agents log/save/query proactively without the user prompting for it.
 *
 * Idempotent: markers guard the instruction block; re-running updates in place.
 * This is an EXPLICIT user action — the only time Corpus ever writes into a repo.
 */
import fs from "node:fs";
import path from "node:path";

const target = process.cwd();
const project = path.basename(target);
const serverPath = path.resolve(import.meta.dirname, "index.js");

// --- 1. Client registration -----------------------------------------------
// Three clients, three formats. Claude Code and Gemini CLI both take JSON under an
// `mcpServers` key but in different files; Codex takes TOML under `mcp_servers`.
// CORPUS_AGENT differs per client so the session ledger shows which tool wrote what.

/** Merge the `corpus` entry into a JSON config at `file` under `mcpServers`. */
function registerJsonClient(file: string, agent: string, label: string): void {
  const p = path.join(target, file);
  let config: any = {};
  if (fs.existsSync(p)) {
    try {
      config = JSON.parse(fs.readFileSync(p, "utf8"));
    } catch {
      console.error(`${file} exists but is not valid JSON — fix it and re-run.`);
      process.exit(1);
    }
  }
  config.mcpServers ??= {};
  config.mcpServers["corpus"] = {
    command: "node",
    args: [serverPath],
    env: { CORPUS_PROJECT: project, CORPUS_AGENT: agent },
  };
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(config, null, 2) + "\n", "utf8");
  console.log(`✓ ${file} — registered "corpus" (${label})`);
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
Done. Start Claude Code, Gemini CLI, or Codex in this directory and approve the
"corpus" MCP server. All three share one memory store, so a session in any of them
picks up where the others left off.
Memory is stored locally in ~/.corpus/${project}/ (no keys, no network).
To use a shared team workspace later, add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
to the server's env — in each client config you actually use.

Note: Codex only reads .codex/config.toml in projects you have marked trusted; if it
does not appear under /mcp, copy that block into ~/.codex/config.toml instead.`);
