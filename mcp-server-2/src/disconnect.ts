#!/usr/bin/env node
/**
 * `corpus-disconnect` — detach this repo from its shared workspace and go private.
 *
 * This is DETACH, not uninstall. It removes exactly one env key (CORPUS_WORKSPACE) from
 * every wired client, so memory falls back to ~/.corpus/<slug>. It deliberately does not
 * touch:
 *   - shared documents — they belong to the workspace; other members still need them
 *   - membership/access — reconnecting must not require a new invitation
 *   - the server entry or instruction blocks — Corpus stays installed
 * Conflating "go private" with "remove Corpus" is how someone loses a setup they only
 * wanted to pause.
 *
 * Local-first: the unwire is a local file edit and must succeed even with no network.
 * Nothing here talks to the DB — going private can never be blocked by being offline.
 */
import { patchWorkspace, readAllClients } from "./clients.js";
import { resolveProject } from "./store.js";

const target = process.cwd();
const before = readAllClients(target);
const connected = before.filter((c) => c.wired && c.workspaceId);

if (!connected.length) {
  const anyWired = before.some((c) => c.wired);
  console.log(
    anyWired
      ? `Already private — this repo is not connected to a shared workspace.`
      : `This repo has no Corpus client entries — nothing to disconnect. Run corpus-setup to install.`,
  );
  process.exit(0);
}

const previousId = connected[0].workspaceId!;
const results = patchWorkspace(target, null);

for (const r of results) {
  if (!r.wired) console.log(`- ${r.def.file} — not set up, skipped (${r.def.label})`);
  else console.log(`${r.changed ? "✓" : "="} ${r.def.file} — disconnected (${r.def.label})`);
}

// Say where the memory went. Without this the next memory_load reads an empty local
// store and looks like data loss, when in fact everything is still in the workspace.
console.log(`
Disconnected from workspace ${previousId}.

Your shared memory is preserved there — nothing was deleted. Local memory
(~/.corpus/${resolveProject()}) is now active and separate, so it will start empty.

Reconnect anytime:  corpus-connect ${previousId}
Restart any running session — clients read this config at startup.`);
