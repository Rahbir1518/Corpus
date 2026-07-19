/**
 * First-run repo wiring, shared by corpus-setup and corpus-connect.
 *
 * One implementation on purpose: setup and connect must produce IDENTICAL wiring
 * (client registration, instruction blocks, code graph). When connect had none of this,
 * a repo joined via `corpus-connect <id>` got the workspace binding but none of the
 * standing instructions — so its agents never called the tools, which looked like
 * "connect doesn't pick up what setup does" (it didn't).
 */
import fs from "node:fs";
import path from "node:path";
import { CLIENTS, registerClient } from "./clients.js";

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

function installBlock(target: string, file: string): void {
  const p = path.join(target, file);
  if (!fs.existsSync(p)) {
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

/**
 * Wire this repo: register the MCP server with every client, install the standing
 * instructions, build the code graph (best effort). Idempotent — markers guard the
 * blocks and registration merges. This is the ONLY place Corpus writes into a repo,
 * and only ever on an explicit user command.
 */
export async function wireRepo(target: string, project: string, workspaceId: string | null): Promise<void> {
  // Three clients, three formats, all handled in clients.ts so setup/connect/disconnect
  // act on the same set. CORPUS_AGENT differs per client so the session ledger shows
  // which tool wrote what.
  for (const def of CLIENTS) {
    registerClient(target, def, project, workspaceId);
    console.log(`✓ ${def.file} — registered "corpus" (${def.label})`);
  }

  // All three, unconditionally: CLAUDE.md covers Claude Code, GEMINI.md covers Gemini
  // CLI (which reads neither of the others), and AGENTS.md is the cross-tool convention
  // (Cursor, Codex, Copilot, Zed…). Registering the server without installing
  // instructions is the worst case: tools present, nothing advocating for them.
  installBlock(target, "CLAUDE.md");
  installBlock(target, "GEMINI.md");
  installBlock(target, "AGENTS.md");

  const { buildGraph } = await import("./graphify.js");
  const g = buildGraph(target);
  console.log(
    g.ok
      ? `✓ Graphify — code graph built (graphify-out/); codebase_search is live`
      : `– Graphify — skipped: ${g.text.split(".")[0]}. Memory tools work without it.`,
  );
}
