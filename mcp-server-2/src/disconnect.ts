#!/usr/bin/env node
/**
 * `corpus-disconnect` — detach this repo from ALL workspaces. Memory goes OFF, not local.
 *
 * This is DETACH, not uninstall. It removes exactly one env key (CORPUS_WORKSPACE) from
 * every wired client. Until the user picks the next workspace — `corpus-connect <id>` to
 * rejoin the previous one, or `corpus-setup` to create a fresh one — the memory tools
 * refuse to read or write. There is deliberately no local fallback here: a disconnected
 * repo quietly writing to a private pile becomes a second version of the memory that the
 * workspace never sees. It deliberately does not touch:
 *   - shared documents — they belong to the workspace; other members still need them
 *   - membership/access — reconnecting must not require a new invitation
 *   - the server entry or instruction blocks — Corpus stays installed
 *
 * Local-first: the unwire is a local file edit and must succeed even with no network.
 * Nothing here talks to the DB — disconnecting can never be blocked by being offline.
 */
import { patchWorkspace, readAllClients } from "./clients.js";

const target = process.cwd();
const before = readAllClients(target);
const connected = before.filter((c) => c.wired && c.workspaceId);

if (!connected.length) {
  const anyWired = before.some((c) => c.wired);
  console.log(
    anyWired
      ? `Already disconnected — this repo is not in any workspace. Run corpus-connect <id> to join one, or corpus-setup to create one.`
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

// Say what "disconnected" means before the next session finds out via a refused tool
// call: memory is off, the workspace still holds everything, and there are exactly two
// ways forward.
console.log(`
Disconnected from workspace ${previousId}.

This repo is now out of every workspace, and memory is OFF — sessions here will
not read or write any memory until you pick one:

  corpus-connect ${previousId}
      reconnect to the workspace you just left (memory intact — nothing was deleted)
  corpus-setup
      create a new, empty workspace

Restart any running session — clients read this config at startup.`);
