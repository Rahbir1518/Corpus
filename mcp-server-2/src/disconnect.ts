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
import { bad, cmd, hint, ok, value, warn } from "./color.js";

const target = process.cwd();
const before = readAllClients(target);
const connected = before.filter((c) => c.wired && c.workspaceId);

if (!connected.length) {
  const anyWired = before.some((c) => c.wired);
  console.log(
    anyWired
      ? `${warn("Already disconnected")} ${hint("— this repo is not in any workspace. Run")} ${cmd("corpus-connect <id>")} ${hint("to join one, or")} ${cmd("corpus-setup")} ${hint("to create one.")}`
      : `${warn("This repo has no Corpus client entries")} ${hint("— nothing to disconnect. Run")} ${cmd("corpus-setup")} ${hint("to install.")}`,
  );
  process.exit(0);
}

const previousId = connected[0].workspaceId!;
const results = patchWorkspace(target, null);

for (const r of results) {
  if (!r.wired) console.log(hint(`- ${r.def.file} — not set up, skipped (${r.def.label})`));
  else if (r.changed) console.log(`${ok("✓")} ${r.def.file} — disconnected ${hint(`(${r.def.label})`)}`);
  else console.log(hint(`= ${r.def.file} — disconnected (${r.def.label})`));
}

// Say what "disconnected" means before the next session finds out via a refused tool
// call: memory is off, the workspace still holds everything, and there are exactly two
// ways forward.
console.log(`
Disconnected from workspace ${value(previousId)}.

${hint("This repo is now out of every workspace, and memory is")} ${bad("OFF")} ${hint("— sessions here will")}
${hint("not read or write any memory until you pick one:")}

  ${cmd(`corpus-connect ${previousId}`)}
${hint("      reconnect to the workspace you just left (memory intact — nothing was deleted)")}
  ${cmd("corpus-setup")}
${hint("      create a new, empty workspace")}

${hint("Restart any running session — clients read this config at startup.")}`);
