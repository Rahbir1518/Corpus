#!/usr/bin/env node
/**
 * `corpus-hook` — the runtime side of agent lifecycle hooks.
 *
 * Client configs (written by hookwire.ts) point their hook systems at this command, so
 * it must be on PATH — same `npm link` contract as corpus-mcp-v2.
 *
 * Two jobs, mirroring the two halves of Corpus:
 *
 *   RETRIEVAL — get the model to consult memory/graph instead of grepping.
 *     session-start   Inject the memory brief at session open (no tool call needed).
 *     pretool         Before Grep/Glob/Read: DENY the first one and redirect to
 *                     codebase_search; after that, degrade to a silent no-op.
 *
 *   CAPTURE — get the model to record what it changed.
 *     mark-dirty      After an edit: record the file, silently.
 *     mark-logged     After corpus_log/corpus_save: clear the dirty set, silently.
 *     check-logged    At Stop: if edits are unlogged, block ONCE and demand corpus_log.
 *
 * Why deny rather than nudge: an advisory line fires once, the model reads it, and
 * proceeds with the grep anyway (observed, repeatedly). A deny cannot be ignored — the
 * tool call does not happen and the model must respond to the reason. The cost of
 * being wrong is bounded to exactly one redirected call per session per concern:
 * every blocking path here fires AT MOST ONCE and then disables itself, so a session
 * can never get stuck in a loop or nagged into uselessness.
 *
 * Everything is best-effort: a hook that crashes must not break the session, so all
 * failures degrade to silence (exit 0, no output).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { CLIENTS, readClient } from "./clients.js";

type Client = "claude" | "gemini" | "codex";

const args = process.argv.slice(2);
const sub = args[0];
const client: Client = (() => {
  const i = args.indexOf("--client");
  const v = i !== -1 ? args[i + 1] : "claude";
  return v === "gemini" || v === "codex" ? v : "claude";
})();

const target = process.cwd();

/** Opt out of blocking entirely: CORPUS_STRICT=0 leaves only silent bookkeeping. */
const STRICT = process.env.CORPUS_STRICT !== "0";

// --- session state -----------------------------------------------------------

interface SessionState {
  redirected?: boolean; // the one pretool deny has been spent
  stopBlocked?: boolean; // the one Stop block has been spent
  dirty?: string[]; // files edited since the last corpus_log/save
}

const TMP = path.join(os.homedir(), ".corpus", "tmp");
const STATE_TTL_MS = 48 * 60 * 60 * 1000;

function statePath(sessionKey: string): string {
  return path.join(TMP, `s-${sessionKey.replace(/[^\w-]/g, "_")}.json`);
}

function readState(sessionKey: string): SessionState {
  try {
    return JSON.parse(fs.readFileSync(statePath(sessionKey), "utf8"));
  } catch {
    return {};
  }
}

function writeState(sessionKey: string, next: SessionState): void {
  try {
    fs.mkdirSync(TMP, { recursive: true });
    fs.writeFileSync(statePath(sessionKey), JSON.stringify(next), "utf8");
    // Opportunistic cleanup — session ids never repeat, so old files are garbage.
    const now = Date.now();
    for (const f of fs.readdirSync(TMP)) {
      const p = path.join(TMP, f);
      if (now - fs.statSync(p).mtimeMs > STATE_TTL_MS) fs.rmSync(p, { force: true });
    }
  } catch {
    /* bookkeeping is optional; never fail a tool call over it */
  }
}

/** Hook payload on stdin (Claude Code sends JSON; others may send nothing). */
function readStdin(): any {
  try {
    if (process.stdin.isTTY) return {};
    const raw = fs.readFileSync(0, "utf8");
    return raw.trim() ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function sessionKeyOf(payload: any): string {
  return payload.session_id ?? payload.sessionId ?? `ppid-${process.ppid ?? "0"}`;
}

function hasGraph(): boolean {
  return fs.existsSync(path.join(target, "graphify-out", "graph.json"));
}

/** Project id, resolved the way the server would: client config, then folder name. */
function resolveProject(): string {
  for (const def of CLIENTS) {
    const p = readClient(target, def).project;
    if (p) return p;
  }
  return path.basename(target);
}

// --- session-start -----------------------------------------------------------

const BRIEF_MAX_CHARS = 1500;

function sessionStart(): void {
  const project = resolveProject();
  const lines: string[] = [];

  const statePath = path.join(os.homedir(), ".corpus", project, "state.md");
  if (fs.existsSync(statePath)) {
    let brief = fs.readFileSync(statePath, "utf8").trim();
    const truncated = brief.length > BRIEF_MAX_CHARS;
    if (truncated) brief = brief.slice(0, BRIEF_MAX_CHARS);
    lines.push(
      `Corpus memory for "${project}" (auto-injected at session start${truncated ? "; truncated — call corpus_load for the rest" : ""}):`,
      "",
      brief,
      truncated ? "…" : "",
    );
  } else {
    // Team workspace, or no state yet: the state isn't on this disk, so don't guess —
    // point at the tool that knows.
    lines.push(
      `Corpus memory is wired for "${project}". Call corpus_load NOW, before your first ` +
        `file read — it returns prior status, decisions, and next steps in ~1K tokens.`,
    );
  }

  if (hasGraph()) {
    lines.push(
      "",
      "This repo has a pre-built Corpus code graph. Use the codebase_search MCP tool for " +
        "structural questions (what calls X, where Y is defined, how two areas connect, " +
        "blast radius) BEFORE grep/glob or file-by-file reads. The first raw search of " +
        "this session will be redirected there automatically.",
    );
  }

  lines.push(
    "",
    "After each edit, bugfix, or design decision, call corpus_log (one line; include the " +
      "why for decisions). Sessions that end with unlogged edits will be stopped and asked.",
  );

  process.stdout.write(lines.filter((l) => l !== "").join("\n") + "\n");
}

// --- pretool (retrieval enforcement) ------------------------------------------

const REDIRECT_REASON =
  "Corpus (fires once per session): this repo has a pre-built code graph, and raw " +
  "search here typically costs 10-50x what the graph costs. Use the codebase_search " +
  "MCP tool first — ask it your structural question in plain language (what calls X, " +
  "where is Y defined, how does A reach B, what breaks if I change C), then read only " +
  "the files it points at. If codebase_search does not answer it — it indexes " +
  "structure, not string literals, comments, or config values — immediately retry this " +
  "exact tool call; it will be allowed and every later search this session is allowed " +
  "too. This is the only time you will be redirected.";

function pretool(): void {
  const payload = readStdin();
  const toolName: string = payload.tool_name ?? payload.toolName ?? "";

  // Never interfere with corpus's own tools — that's the behavior we want more of.
  if (toolName.toLowerCase().includes("corpus")) return;
  // Without a graph the redirect would point at a tool that answers with a fallback
  // message. Worse than silence.
  if (!hasGraph()) return;

  const sessionKey = sessionKeyOf(payload);
  const state = readState(sessionKey);
  if (state.redirected) return; // spent — stay out of the way for the rest of the session
  if (!STRICT) return;

  writeState(sessionKey, { ...state, redirected: true });

  if (client === "claude") {
    // permissionDecision:"deny" stops the tool call and hands the reason to the model.
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: REDIRECT_REASON,
        },
      }) + "\n",
    );
    return;
  }

  // Gemini/Codex: no verified deny schema, so emit the text and exit non-zero, which
  // both surface to the model as a failed precondition rather than a silent no-op.
  process.stderr.write(REDIRECT_REASON + "\n");
  process.exit(2);
}

// --- capture (logging enforcement) --------------------------------------------

function markDirty(): void {
  const payload = readStdin();
  const sessionKey = sessionKeyOf(payload);
  const input = payload.tool_input ?? payload.toolInput ?? {};
  const file: string = input.file_path ?? input.filePath ?? input.path ?? "";
  const state = readState(sessionKey);
  const dirty = new Set(state.dirty ?? []);
  if (file) dirty.add(path.basename(file));
  writeState(sessionKey, { ...state, dirty: [...dirty] });
  // Silent: no stdout, so this costs the model zero tokens.
}

function markLogged(): void {
  const payload = readStdin();
  const sessionKey = sessionKeyOf(payload);
  const state = readState(sessionKey);
  writeState(sessionKey, { ...state, dirty: [] });
}

function checkLogged(): void {
  const payload = readStdin();

  // Claude sets this when the model is already continuing BECAUSE of a Stop block.
  // Blocking again here is how a session wedges itself in a loop — always allow.
  if (payload.stop_hook_active === true || payload.stopHookActive === true) return;

  const sessionKey = sessionKeyOf(payload);
  const state = readState(sessionKey);
  const dirty = state.dirty ?? [];
  if (dirty.length === 0) return; // nothing uncaptured — pure Q&A turns are never blocked
  if (state.stopBlocked) return; // one block per session, then trust the user
  if (!STRICT) return;

  writeState(sessionKey, { ...state, stopBlocked: true });

  const files = dirty.slice(0, 8).join(", ") + (dirty.length > 8 ? `, +${dirty.length - 8} more` : "");
  const reason =
    `Corpus: this session edited ${files} but recorded nothing to memory. Call corpus_log ` +
    `now — one line per change, and for any design decision include the why (that is the ` +
    `part the next session cannot recover from the diff). If the task is finished, call ` +
    `corpus_save instead with concrete file/function references. Then finish normally; ` +
    `this check will not fire again in this session.`;

  if (client === "claude") {
    process.stdout.write(JSON.stringify({ decision: "block", reason }) + "\n");
    return;
  }
  process.stderr.write(reason + "\n");
  process.exit(2);
}

// --- dispatch ----------------------------------------------------------------

try {
  if (sub === "session-start") sessionStart();
  else if (sub === "pretool") pretool();
  else if (sub === "mark-dirty") markDirty();
  else if (sub === "mark-logged") markLogged();
  else if (sub === "check-logged") checkLogged();
  else {
    console.error(
      "usage: corpus-hook <session-start|pretool|mark-dirty|mark-logged|check-logged> " +
        "[--client claude|gemini|codex]",
    );
    process.exit(2);
  }
} catch (err) {
  // A hook must never break the session it serves.
  console.error(`[corpus-hook] ${err instanceof Error ? err.message : err}`);
}
