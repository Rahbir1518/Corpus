#!/usr/bin/env node
/**
 * `corpus-connect <id>` — point this repo's shared memory at an existing workspace.
 *
 * Narrower than corpus-setup on purpose: setup does first-run wiring (registers the
 * server with every client, installs the standing-instruction blocks, builds the graph)
 * and CREATES a workspace. connect only re-points an already-wired repo at a workspace
 * someone else already made. That is the share flow: a teammate pastes you an id.
 *
 * Identity is the id itself — there is no login. Whoever holds it can read and write the
 * workspace, so treat it like a credential. Real per-user access control has to wait for
 * the server to stop using the Supabase service-role key (which bypasses RLS) and move
 * to per-user tokens; until then a membership row would be recorded but never enforced.
 */
import { patchWorkspace } from "./clients.js";
import { findWorkspace, supabaseConfigured } from "./workspace.js";

const target = process.cwd();
const id = process.argv[2];

if (!id) {
  console.error(`Usage: corpus-connect <workspace-id>

Connects this repo to an existing shared workspace. To create a new one, run
corpus-setup — it registers the clients and creates the workspace in one step.

Run corpus-status to see which workspace this repo is on now.`);
  process.exit(1);
}

// Validate before writing anything. A typo'd id that silently "connects" would send
// every future memory_save into a workspace that does not exist, and the failure would
// surface much later as an opaque foreign-key error from the server.
if (supabaseConfigured()) {
  const ws = await findWorkspace(id);
  if (!ws) {
    console.error(
      `No workspace with id "${id}".\n\n` +
        `Check the id with whoever shared it. corpus-connect never creates a workspace — ` +
        `run corpus-setup if you meant to start a new one.`,
    );
    process.exit(1);
  }
  console.log(`Workspace: ${ws.name} (${ws.slug})`);
} else {
  // Not fatal: the id is still worth writing so the repo is configured for whenever
  // credentials do arrive. But say so plainly rather than implying it was verified.
  console.log(
    `! Supabase is not configured here, so the id could not be verified.\n` +
      `  Writing it anyway; memory stays local until SUPABASE_URL and\n` +
      `  SUPABASE_SERVICE_ROLE_KEY are set.`,
  );
}

const results = patchWorkspace(target, id);
const wired = results.filter((r) => r.wired);

if (!wired.length) {
  console.error(
    `\nThis repo has no Corpus client entries to update — run corpus-setup first.`,
  );
  process.exit(1);
}

console.log("");
for (const r of results) {
  if (!r.wired) console.log(`- ${r.def.file} — not set up, skipped (${r.def.label})`);
  else console.log(`${r.changed ? "✓" : "="} ${r.def.file} — connected (${r.def.label})`);
}

console.log(`\nConnected to workspace ${id}.
Memory from ${wired.map((r) => r.def.label).join(", ")} in this repo now lands in the
shared workspace. Restart any running session — clients read this config at startup.`);
