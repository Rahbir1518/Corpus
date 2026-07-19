#!/usr/bin/env node
/**
 * `corpus-uninstall` — remove Corpus from THIS repo on THIS machine.
 *
 * The inverse of corpus-setup / corpus-connect's wireRepo: it takes back everything
 * Corpus wrote into the repo — the instruction blocks appended to CLAUDE.md, GEMINI.md,
 * AGENTS.md and .agents/rules/corpus.md, the `corpus` MCP server entry in all three
 * client configs, and the hooks. Files Corpus created are deleted; files it merely
 * appended to keep everything that was already theirs.
 *
 * Where corpus-disconnect DETACHES (one env key, Corpus stays installed and can be
 * rejoined with an id), this UNINSTALLS: after it, nothing in the repo mentions Corpus
 * and no agent here will call the tools.
 *
 * What it never touches, by default:
 *   - the workspace's shared documents. They are the team's, not this checkout's, and a
 *     local uninstall deleting a colleague's memory would be indefensible. `corpus-ls`
 *     still lists the id; `corpus-connect <id>` re-joins with the memory intact.
 *   - local memory in ~/.corpus/<project>/, and the code graph in graphify-out/. Both
 *     are real work product, so removing them is opt-in (--memory, --graph) rather than
 *     a side effect of unwiring a repo.
 *
 * Local-first: pure file edits, no network. Uninstalling can never be blocked by being
 * offline or by a workspace that no longer exists.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { CLIENTS, readAllClients, unregisterClient } from "./clients.js";
import { bad, cmd, heading, hint, ok, value, warn } from "./color.js";
import { findCorpusHooks, uninstallHooks } from "./hookwire.js";
import { forgetRepo, listKnownWorkspaces } from "./registry.js";
import { resolveProject } from "./store.js";
import { BEGIN, END, INSTRUCTION_FILES } from "./wire.js";

const target = process.cwd();
const argv = process.argv.slice(2);

if (argv.includes("--help") || argv.includes("-h")) {
  console.log(`${heading("Usage:")} ${cmd("corpus-uninstall")} [--memory] [--graph] [--forget] [--dry-run]

${hint("Removes Corpus from this repo: the instruction blocks in CLAUDE.md / GEMINI.md /")}
${hint("AGENTS.md / .agents/rules/corpus.md, the \"corpus\" MCP entry in every client config,")}
${hint("and the hooks. Shared workspace documents are NEVER deleted.")}

  ${cmd("--memory")}   ${hint("also delete this machine's local memory (~/.corpus/<project>/)")}
  ${cmd("--graph")}    ${hint("also delete the code graph (graphify-out/)")}
  ${cmd("--forget")}   ${hint("also drop workspace ids this repo was the last user of")}
  ${cmd("--dry-run")}  ${hint("print what would change and exit")}

${hint("To leave a workspace but keep Corpus installed, use")} ${cmd("corpus-disconnect")} ${hint("instead.")}`);
  process.exit(0);
}

const dryRun = argv.includes("--dry-run");
const alsoMemory = argv.includes("--memory");
const alsoGraph = argv.includes("--graph");
const alsoForget = argv.includes("--forget");

const unknown = argv.filter(
  (a) => !["--memory", "--graph", "--forget", "--dry-run"].includes(a),
);
if (unknown.length) {
  console.error(
    `${bad(`Unknown option: ${unknown.join(", ")}`)}\n\n${hint("Run")} ${cmd("corpus-uninstall --help")} ${hint("for the options.")}`,
  );
  process.exit(1);
}

const project = resolveProject();
const localMemory = path.join(os.homedir(), ".corpus", project);
const graphDir = path.join(target, "graphify-out");

console.log(`\n${heading("Corpus uninstall")} — ${value(target)}\n`);

// --- survey: decide everything BEFORE writing, so --dry-run and the real run report
// the same plan and a failure part-way through can't leave a half-described repo. ---

interface Planned {
  /** What will happen, for --dry-run. */
  label: string;
  /** What did happen, for the apply pass. Two strings beats one awkward tense in both. */
  done: string;
  /** "delete" = the file was Corpus's own; "edit" = ours spliced out of the user's file. */
  action: "delete" | "edit";
  run: () => void;
}
const plan: Planned[] = [];

/** Client configs are declared with "/", instruction files with path.join. Show one style. */
const show = (f: string) => f.split(path.sep).join("/");

for (const file of INSTRUCTION_FILES) {
  const p = path.join(target, file);
  if (!fs.existsSync(p)) continue;
  const content = fs.readFileSync(p, "utf8");
  const start = content.indexOf(BEGIN);
  const end = content.indexOf(END);
  if (start === -1 || end === -1) continue;

  const without = (content.slice(0, start) + content.slice(end + END.length)).trim();
  // Nothing but our block => the file is one corpus-setup created. Anything else is the
  // user's own instructions, which must survive with only our section removed.
  const removes = !without;
  plan.push({
    label: `${show(file)} — ${removes ? "created by Corpus" : "the Corpus section (your content stays)"}`,
    done: `${show(file)} — ${removes ? "deleted (Corpus created it)" : "Corpus section removed, your content kept"}`,
    action: removes ? "delete" : "edit",
    run: () => (removes ? fs.rmSync(p) : fs.writeFileSync(p, without + "\n", "utf8")),
  });
}

const wiredClients = readAllClients(target).filter((c) => c.wired);
for (const def of CLIENTS) {
  if (!wiredClients.some((c) => c.def.file === def.file)) continue;
  plan.push({
    label: `${show(def.file)} — the corpus server entry (${def.label})`,
    done: `${show(def.file)} — corpus server unregistered (${def.label})`,
    action: "edit",
    run: () => void unregisterClient(target, def),
  });
}

// Files that actually carry our hooks — NOT files that merely exist. .claude/settings.json
// normally survives an uninstall (the user's own hooks and settings live there), so
// existence would make every later run claim to have removed something.
const hooksPresent = findCorpusHooks(target);

if (!plan.length && !hooksPresent.length) {
  console.log(
    `${warn("Corpus is not installed in this repo")} ${hint("— nothing to remove. Run")} ${cmd("corpus-setup")} ${hint("to install it.")}\n`,
  );
  process.exit(0);
}

if (dryRun) {
  for (const step of plan) console.log(`  ${step.action === "delete" ? bad("delete") : ok("edit  ")} ${step.label}`);
  for (const f of hooksPresent) console.log(`  ${ok("edit  ")} ${show(f)} — the Corpus hooks`);
  if (alsoGraph && fs.existsSync(graphDir)) console.log(`  ${bad("delete")} graphify-out/ — the code graph`);
  if (alsoMemory && fs.existsSync(localMemory)) console.log(`  ${bad("delete")} ${localMemory} — local memory`);
  console.log(`\n${hint("Dry run — nothing was changed.")}\n`);
  process.exit(0);
}

// --- apply ---

for (const step of plan) {
  step.run();
  console.log(`${ok("✓")} ${step.done}`);
}

for (const file of uninstallHooks(target)) {
  console.log(`${ok("✓")} ${show(file)} — Corpus hooks removed`);
}

// .agents/rules/ exists only to hold corpus.md; leaving empty dirs behind is litter, but
// stop the moment a directory has anything else in it.
for (const dir of [path.join(target, ".agents", "rules"), path.join(target, ".agents")]) {
  if (fs.existsSync(dir) && !fs.readdirSync(dir).length) fs.rmdirSync(dir);
}

if (alsoGraph && fs.existsSync(graphDir)) {
  fs.rmSync(graphDir, { recursive: true, force: true });
  console.log(`${ok("✓")} graphify-out/ — code graph deleted`);
}

if (alsoMemory && fs.existsSync(localMemory)) {
  fs.rmSync(localMemory, { recursive: true, force: true });
  console.log(`${ok("✓")} ${localMemory} — local memory deleted`);
}

// Ids this repo was using, captured before the registry edit so they can be printed as
// the way back in.
const idsHere = listKnownWorkspaces()
  .filter((w) => w.repos.includes(target))
  .map((w) => ({ id: w.id, name: w.name ?? w.slug ?? "unnamed" }));
const forgotten = forgetRepo(target, alsoForget);

console.log(`\n${ok("Corpus removed from this repo.")}`);

if (idsHere.length && !alsoForget) {
  console.log(`
${hint("The workspace documents were NOT touched — they still hold this project's memory.")}
${hint("To come back:")}
${idsHere.map((w) => `  ${cmd(`corpus-connect ${w.id}`)}  ${hint(`(${w.name})`)}`).join("\n")}`);
} else if (forgotten.length) {
  console.log(`
${warn("! These workspace ids were dropped from this machine's list:")}
${forgotten.map((id) => `  ${value(id)}`).join("\n")}
${hint("Their documents still exist, but the id is the only way back in — save it now if")}
${hint("you may want that memory again.")}`);
}

if (!alsoMemory && fs.existsSync(localMemory)) {
  console.log(`
${hint("Local memory is still on disk at")} ${value(localMemory)}
${hint("— delete it with")} ${cmd("corpus-uninstall --memory")}${hint(", or leave it for a future reinstall.")}`);
}

console.log(`\n${hint("Restart any running session — clients read these files at startup.")}\n`);
