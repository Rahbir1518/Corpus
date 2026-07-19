/**
 * Hook-config installers, called from wire.ts alongside MCP registration.
 *
 * Instruction files advocate for the tools at session start; these hooks advocate at
 * the moment of decision — right before the model greps/reads its way past the graph,
 * and at session open where the memory brief gets injected without any tool call.
 *
 * Ownership rule for merging: any hook entry whose command contains "corpus-hook" is
 * ours (add if absent, replace if present, never touch anything else). Same contract
 * as the marker-guarded blocks elsewhere: idempotent, reversible, merge-not-clobber.
 *
 * Formats: Claude Code's schema is stable and documented. Gemini CLI (BeforeTool) and
 * Codex (.codex/hooks.json) mirror it structurally but are best-effort — their hook
 * systems are newer; if a client ignores an unknown key the cost is zero, and the
 * instruction files still carry the guidance.
 */
import fs from "node:fs";
import path from "node:path";

const OURS = "corpus-hook";

function readJson(p: string): any {
  if (!fs.existsSync(p)) return {};
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

interface HookGroup {
  matcher?: string;
  hooks: Array<{ type: "command"; command: string }>;
}

/** Replace-or-append our groups inside one event's array, leaving foreign groups alone. */
function mergeEvent(eventArr: HookGroup[], groups: HookGroup[]): HookGroup[] {
  const isOurs = (g: HookGroup) =>
    Array.isArray(g?.hooks) && g.hooks.some((h) => typeof h?.command === "string" && h.command.includes(OURS));
  const kept = eventArr.filter((g) => !isOurs(g));
  return [...kept, ...groups];
}

/**
 * Events map to an ARRAY of our groups, not one: a single event (PostToolUse) needs two
 * groups with different matchers (edits vs. corpus tools), and they must both survive
 * the replace-ours-only merge.
 */
function installEvents(file: string, events: Record<string, HookGroup[]>): void {
  const config = readJson(file);
  config.hooks ??= {};
  for (const [event, groups] of Object.entries(events)) {
    const existing: HookGroup[] = Array.isArray(config.hooks[event]) ? config.hooks[event] : [];
    config.hooks[event] = mergeEvent(existing, groups);
  }
  writeJson(file, config);
}

export function installHooks(target: string): void {
  // Claude Code — .claude/settings.json (project-scoped, committable).
  // SessionStart stdout is injected into context; PreToolUse fires before the
  // grep/read spiral starts. Read is matched too: sequential file reading, not the
  // grep itself, is where most exploration tokens go — the once-per-session guard in
  // corpus-hook is what makes that bearable.
  installEvents(path.join(target, ".claude", "settings.json"), {
    SessionStart: [
      { hooks: [{ type: "command", command: "corpus-hook session-start --client claude" }] },
    ],
    PreToolUse: [
      {
        matcher: "Grep|Glob|Read",
        hooks: [{ type: "command", command: "corpus-hook pretool --client claude" }],
      },
    ],
    // Capture side. Both are SILENT (no stdout → zero tokens): they only maintain the
    // dirty set that the Stop hook checks.
    PostToolUse: [
      {
        matcher: "Edit|Write|MultiEdit|NotebookEdit",
        hooks: [{ type: "command", command: "corpus-hook mark-dirty --client claude" }],
      },
      {
        matcher: "mcp__corpus__corpus_log|mcp__corpus__corpus_save",
        hooks: [{ type: "command", command: "corpus-hook mark-logged --client claude" }],
      },
    ],
    // The invariant: a turn that edited files does not end without a corpus_log.
    // Blocks at most once per session, and never on a turn with no edits.
    Stop: [{ hooks: [{ type: "command", command: "corpus-hook check-logged --client claude" }] }],
  });
  console.log(`✓ .claude/settings.json — session brief + query-first redirect + log-on-edit (Claude Code)`);

  // Gemini CLI — hooks live in the same settings.json the MCP registration uses.
  // Tool names differ from Claude's; BeforeTool is Gemini's pre-tool event. No verified
  // Stop-with-block equivalent, so Gemini gets retrieval enforcement only.
  installEvents(path.join(target, ".gemini", "settings.json"), {
    BeforeTool: [
      {
        matcher: "search_file_content|glob|read_file|read_many_files",
        hooks: [{ type: "command", command: "corpus-hook pretool --client gemini" }],
      },
    ],
  });
  console.log(`✓ .gemini/settings.json — query-first redirect (Gemini CLI; best-effort)`);

  // Codex CLI — .codex/hooks.json, pre-tool event before shell calls. Subject to the
  // same trust gate as .codex/config.toml (untrusted projects load neither).
  installEvents(path.join(target, ".codex", "hooks.json"), {
    PreToolUse: [
      {
        matcher: "shell",
        hooks: [{ type: "command", command: "corpus-hook pretool --client codex" }],
      },
    ],
  });
  console.log(`✓ .codex/hooks.json — query-first redirect (Codex CLI; best-effort)`);
}
