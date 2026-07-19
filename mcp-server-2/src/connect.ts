#!/usr/bin/env node
/**
 * `corpus-connect <id>` — point this repo's shared memory at an existing workspace.
 *
 * The one difference from corpus-setup: setup CREATES a workspace; connect JOINS one
 * someone else already made. That is the share flow — a teammate pastes you an id, and
 * `git clone` + `corpus-connect <id>` is a complete install: on a repo that was never
 * set up, connect runs the same first-run wiring as setup (wire.ts — clients,
 * instruction blocks, graph), just bound to the given id instead of a fresh workspace.
 * On an already-wired repo it only re-points the workspace binding.
 *
 * Identity is the id itself — there is no login. Whoever holds it can read and write the
 * workspace, so treat it like a credential. Real per-user access control has to wait for
 * the server to stop using the Supabase service-role key (which bypasses RLS) and move
 * to per-user tokens; until then a membership row would be recorded but never enforced.
 */
import path from "node:path";
import { patchWorkspace, readAllClients } from "./clients.js";
import { bad, cmd, heading, hint, ok, value, warn } from "./color.js";
import { recordWorkspace } from "./registry.js";
import { wireRepo } from "./wire.js";
import { findWorkspace, isWorkspaceId, supabaseConfigured } from "./workspace.js";

const target = process.cwd();
const id = process.argv[2];

if (!id) {
  console.error(`${heading("Usage:")} ${cmd("corpus-connect <workspace-id>")}

${hint("Connects this repo to an existing shared workspace. To create a new one, run")}
${cmd("corpus-setup")} ${hint("— it registers the clients and creates the workspace in one step.")}

${hint("Run")} ${cmd("corpus-status")} ${hint("to see which workspace this repo is on now.")}`);
  process.exit(1);
}

if (!isWorkspaceId(id)) {
  console.error(
    `${bad(`"${id}" is not a workspace id`)} — expected a uuid like\n` +
      `  ${value("3f2a9c14-7b8e-4d51-9a02-1c6e5b7d8f90")}\n\n` +
      `${hint("Run")} ${cmd("corpus-status")} ${hint("to see this repo's current workspace.")}`,
  );
  process.exit(1);
}

// Validate before writing anything. A typo'd id that silently "connects" would send
// every future corpus_save into a workspace that does not exist, and the failure would
// surface much later as an opaque foreign-key error from the server.
let verified: { name: string; slug: string } | null = null;
if (supabaseConfigured()) {
  const ws = await findWorkspace(id);
  if (!ws) {
    console.error(
      `${bad(`No workspace with id "${id}".`)}\n\n` +
        hint(`Check the id with whoever shared it. corpus-connect never creates a workspace — `) +
        hint(`run corpus-setup if you meant to start a new one.`),
    );
    process.exit(1);
  }
  verified = ws;
  console.log(`Workspace: ${ok(ws.name)} ${hint(`(${ws.slug})`)}`);
} else {
  // Not fatal: the id is still worth writing so the repo is configured for whenever
  // credentials do arrive. But say so plainly rather than implying it was verified.
  console.log(
    warn(`! Supabase is not configured here, so the id could not be verified.`) +
      hint(`\n  Writing it anyway; the workspace is unreachable (memory stays off) until\n`) +
      hint(`  SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.`),
  );
}

// A repo that was never set up gets the FULL first-run wiring, bound to this id. The
// old behavior ("run corpus-setup first") was a trap: setup would create a brand-new
// workspace, exactly what someone holding a teammate's id doesn't want — and skipping
// the instruction blocks meant agents in this repo never used the tools they'd been
// given.
const anyWired = readAllClients(target).some((c) => c.wired);
if (!anyWired) {
  console.log(hint(`\nThis repo has no Corpus wiring yet — running first-time setup for it:\n`));
  // Label the repo after the workspace it is joining, not the folder it was cloned into.
  // A clone's directory name is incidental (`git clone <url> api-v2`); the workspace's
  // slug is what the team calls this memory.
  await wireRepo(target, verified?.slug ?? path.basename(target), id);
  recordWorkspace({ id, name: verified?.name, slug: verified?.slug, origin: "connected", repo: target });
  console.log(`\n${ok("Connected")} to workspace ${value(id)}.
${hint(`Start Claude Code, Gemini CLI, or Codex in this directory and approve the "corpus"`)}
${hint("MCP server — memory in this repo now lands in the shared workspace.")}`);
  process.exit(0);
}

// Re-point AND re-label: an already-wired repo is usually carrying the CORPUS_PROJECT
// that corpus-setup derived from its folder, which would keep naming this session after
// the directory long after it joined a differently-named workspace. Only when the id was
// verified — an unverifiable id has no slug to trust.
const results = patchWorkspace(target, id, verified?.slug);
const wired = results.filter((r) => r.wired);

// Remember the id machine-wide (corpus-ls): a shared id only lives in this repo's
// configs otherwise, and deleting the clone would mean losing access with it.
recordWorkspace({ id, name: verified?.name, slug: verified?.slug, origin: "connected", repo: target });

console.log("");
for (const r of results) {
  if (!r.wired) console.log(hint(`- ${r.def.file} — not set up, skipped (${r.def.label})`));
  // "=" means already correct, "✓" means this run changed it — worth distinguishing by
  // color too, so a re-run visibly does nothing rather than looking like fresh work.
  else if (r.changed) console.log(`${ok("✓")} ${r.def.file} — connected ${hint(`(${r.def.label})`)}`);
  else console.log(hint(`= ${r.def.file} — connected (${r.def.label})`));
}

console.log(`\n${ok("Connected")} to workspace ${value(id)}.
${hint(`Memory from ${wired.map((r) => r.def.label).join(", ")} in this repo now lands in the`)}
${hint("shared workspace. Restart any running session — clients read this config at startup.")}`);
