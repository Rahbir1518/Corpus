#!/usr/bin/env node
/**
 * `corpus-ls` — every workspace this machine holds an id for: ones you created
 * (corpus-setup) and ones shared with you (corpus-connect).
 *
 * Access is bearer (the id is the credential), so "workspaces you have access to" can
 * only mean "ids this machine has held" — there is no login to ask the DB "which are
 * mine". Source: the rolodex setup/connect maintain (registry.ts), plus whatever the
 * current directory's client configs are wired to (a teammate's committed .mcp.json can
 * hold an id that never went through corpus-connect here).
 *
 * Read-only, like corpus-status: safe to run anytime, degrades to cached names offline.
 */
import { readAllClients } from "./clients.js";
import { REGISTRY_FILE, listKnownWorkspaces, type KnownWorkspace } from "./registry.js";
import { findWorkspace, supabaseConfigured } from "./workspace.js";

const target = process.cwd();
const known = listKnownWorkspaces();

// Ids wired in THIS directory — marked in the listing, and appended if the rolodex has
// never seen them (the committed-config share path).
const hereIds = new Set(
  readAllClients(target)
    .filter((c) => c.wired && c.workspaceId)
    .map((c) => c.workspaceId!),
);
const unlisted: KnownWorkspace[] = [...hereIds]
  .filter((id) => !known.some((w) => w.id === id))
  .map((id) => ({ id, name: null, slug: null, origin: "connected", addedAt: "", repos: [target] }));
const all = [...known, ...unlisted];

if (!all.length) {
  console.log(`No workspaces known to this machine yet.

Workspaces appear here when you create one (corpus-setup) or join one a teammate
shared (corpus-connect <id>). Rolodex: ${REGISTRY_FILE}`);
  process.exit(0);
}

// Verify against the DB when possible: a name from the rolodex may be stale, and a
// workspace may have been deleted since. Offline, cached names still beat bare uuids.
const online = supabaseConfigured();
if (!online) {
  console.log(`! Supabase is not configured — showing cached names, not verifying against the DB.`);
}

console.log(`\nWorkspaces this machine has access to (${REGISTRY_FILE})\n`);

for (const w of all) {
  let label = w.name ? `${w.name} (slug: ${w.slug ?? "?"})` : "(name unknown)";
  let gone = false;
  if (online) {
    try {
      const ws = await findWorkspace(w.id);
      if (ws) label = `${ws.name} (slug: ${ws.slug})`;
      else {
        gone = true;
        label = w.name ? `${w.name} — NO LONGER EXISTS in the DB` : "NO LONGER EXISTS in the DB";
      }
    } catch (err) {
      label = `${label} — lookup failed: ${err instanceof Error ? err.message : err}`;
    }
  }

  const mark = hereIds.has(w.id) ? "*" : " ";
  const origin = w.origin === "created" ? "created by you" : "shared with you";
  console.log(`${mark} ${w.id}`);
  console.log(`    ${label}`);
  console.log(`    ${origin}${w.addedAt ? ` · since ${w.addedAt}` : ""}`);
  if (w.repos.length) console.log(`    repos on this machine: ${w.repos.join(", ")}`);
  if (!gone) console.log(`    join a repo to it:      corpus-connect ${w.id}`);
  console.log("");
}

console.log(`* = wired in the current directory (${target})`);
if (!hereIds.size) {
  console.log(`The current directory is not connected to any workspace.`);
}
