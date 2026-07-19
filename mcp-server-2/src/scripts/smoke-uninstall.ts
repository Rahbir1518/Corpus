/**
 * corpus-uninstall smoke test.
 *
 * Wires a throwaway repo exactly as corpus-setup would, then uninstalls it. The
 * interesting assertions are the NEGATIVE ones: an uninstall that removes its own
 * instruction block is easy, while one that takes the user's CLAUDE.md prose, their
 * other MCP servers, or their unrelated hooks with it is a bug you only discover after
 * it has eaten someone's config. So the fixture deliberately mixes Corpus's wiring with
 * foreign content in every file it touches.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { wireRepo } from "../wire.js";

const PROJECT = "corpus-smoke-uninstall";
const localMemory = path.join(os.homedir(), ".corpus", PROJECT);
const uninstallScript = path.join(import.meta.dirname, "..", "uninstall.ts");

const USER_PROSE = "# My project\n\nHouse rules: always run the linter before committing.";

function step(name: string, ok: boolean, detail?: string) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) process.exitCode = 1;
}

/** A wired repo with pre-existing user content in every file Corpus writes to. */
async function fixture(): Promise<string> {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "corpus-uninstall-"));

  // CLAUDE.md already belongs to the user; Corpus appends to it.
  fs.writeFileSync(path.join(repo, "CLAUDE.md"), USER_PROSE + "\n", "utf8");
  // A second MCP server that must survive.
  fs.writeFileSync(
    path.join(repo, ".mcp.json"),
    JSON.stringify({ mcpServers: { other: { command: "other-server", args: [] } } }, null, 2),
    "utf8",
  );
  // A foreign hook plus a foreign top-level setting.
  fs.mkdirSync(path.join(repo, ".claude"), { recursive: true });
  fs.writeFileSync(
    path.join(repo, ".claude", "settings.json"),
    JSON.stringify(
      {
        model: "opus",
        hooks: { SessionStart: [{ hooks: [{ type: "command", command: "my-own-hook" }] }] },
      },
      null,
      2,
    ),
    "utf8",
  );

  const log = console.log;
  console.log = () => {}; // wireRepo narrates its own progress; keep the test output clean
  await wireRepo(repo, PROJECT, null);
  console.log = log;

  // Stand in for a built graph and prior local memory.
  fs.mkdirSync(path.join(repo, "graphify-out"), { recursive: true });
  fs.writeFileSync(path.join(repo, "graphify-out", "graph.json"), "{}", "utf8");
  fs.mkdirSync(localMemory, { recursive: true });
  fs.writeFileSync(path.join(localMemory, "state.md"), "# memory\n", "utf8");

  return repo;
}

// The command under test reads process.cwd(), so it must be spawned IN the fixture repo.
// That cwd has no node_modules, and `--import tsx` would be resolved from there — so the
// loader is resolved to an absolute URL here, from this file's own package.
const tsxLoader = pathToFileURL(createRequire(import.meta.url).resolve("tsx")).href;

function uninstall(repo: string, ...flags: string[]) {
  return spawnSync(process.execPath, ["--import", tsxLoader, uninstallScript, ...flags], {
    cwd: repo,
    encoding: "utf8",
    env: { ...process.env, CORPUS_PROJECT: PROJECT, NO_COLOR: "1" },
  });
}

const read = (p: string) => (fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null);

// --- the wiring is really there before we start ------------------------------
const repo = await fixture();
step(
  "fixture: repo is wired",
  read(path.join(repo, "CLAUDE.md"))!.includes("corpus:begin") &&
    JSON.parse(read(path.join(repo, ".mcp.json"))!).mcpServers.corpus !== undefined,
);

// --- dry run changes nothing -------------------------------------------------
const before = fs.readFileSync(path.join(repo, "CLAUDE.md"), "utf8");
const dry = uninstall(repo, "--dry-run");
step("dry run exits cleanly", dry.status === 0, dry.stderr.trim().split("\n")[0]);
step("dry run lists the work", dry.stdout.includes("CLAUDE.md"));
step("dry run changes nothing", read(path.join(repo, "CLAUDE.md")) === before);

// --- the real thing ----------------------------------------------------------
const run = uninstall(repo);
step("uninstall exits cleanly", run.status === 0, run.stderr.trim().split("\n")[0]);

const claude = read(path.join(repo, "CLAUDE.md"));
step("CLAUDE.md survives (the user wrote it)", claude !== null);
step("the user's own prose is intact", claude?.includes("always run the linter") === true);
step("the Corpus block is gone", !claude?.includes("corpus:begin") && !claude?.includes("corpus_load"));

step("GEMINI.md — created by Corpus, so removed", read(path.join(repo, "GEMINI.md")) === null);
step("AGENTS.md — created by Corpus, so removed", read(path.join(repo, "AGENTS.md")) === null);
step(
  ".agents/rules/corpus.md removed, empty dirs pruned",
  !fs.existsSync(path.join(repo, ".agents")),
);

const mcp = JSON.parse(read(path.join(repo, ".mcp.json"))!);
step(".mcp.json — corpus server unregistered", mcp.mcpServers.corpus === undefined);
step(".mcp.json — the user's other server survives", mcp.mcpServers.other !== undefined);

const settings = JSON.parse(read(path.join(repo, ".claude", "settings.json"))!);
const hookJson = JSON.stringify(settings.hooks ?? {});
step(".claude/settings.json — corpus hooks removed", !hookJson.includes("corpus-hook"));
step(".claude/settings.json — the user's hook survives", hookJson.includes("my-own-hook"));
step(".claude/settings.json — unrelated settings survive", settings.model === "opus");

step(
  ".gemini/settings.json — fully ours, so removed",
  read(path.join(repo, ".gemini", "settings.json")) === null,
);
step(
  ".codex — config and hooks removed",
  read(path.join(repo, ".codex", "config.toml")) === null &&
    read(path.join(repo, ".codex", "hooks.json")) === null,
);

// --- opt-in data is opt-in ---------------------------------------------------
step("graph is kept without --graph", fs.existsSync(path.join(repo, "graphify-out")));
step("local memory is kept without --memory", fs.existsSync(localMemory));
step("and the output says how to get the memory back", run.stdout.includes("Local memory is still on disk"));

// --- second run is a clean no-op ---------------------------------------------
const again = uninstall(repo);
step(
  "re-running reports nothing to remove",
  again.status === 0 && again.stdout.includes("not installed"),
  again.stdout.trim().split("\n").filter(Boolean).pop(),
);

// --- the flags do what they say ----------------------------------------------
const repo2 = await fixture();
const withData = uninstall(repo2, "--graph", "--memory");
step("--graph deletes the code graph", !fs.existsSync(path.join(repo2, "graphify-out")));
step("--memory deletes local memory", !fs.existsSync(localMemory));
step("--graph/--memory run exits cleanly", withData.status === 0);

const bogus = uninstall(repo2, "--wat");
step("an unknown flag is rejected, not ignored", bogus.status === 1);

fs.rmSync(repo, { recursive: true, force: true });
fs.rmSync(repo2, { recursive: true, force: true });
fs.rmSync(localMemory, { recursive: true, force: true });
console.log("\nUninstall smoke test complete.");
