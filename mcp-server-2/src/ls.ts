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
import { bad, cmd, heading, hint, ok, value, warn } from "./color.js";
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
  console.log(`${warn("No workspaces known to this machine yet.")}

${hint("Workspaces appear here when you create one")} (${cmd("corpus-setup")}) ${hint("or join one a")}
${hint("teammate shared")} (${cmd("corpus-connect <id>")}). ${hint(`Rolodex: ${REGISTRY_FILE}`)}`);
  process.exit(0);
}

// Verify against the DB when possible: a name from the rolodex may be stale, and a
// workspace may have been deleted since. Offline, cached names still beat bare uuids.
const online = supabaseConfigured();
if (!online) {
  console.log(
    warn(`! Supabase is not configured — showing cached names, not verifying against the DB.`),
  );
}

console.log(`\n${heading("Workspaces this machine has access to")} ${hint(`(${REGISTRY_FILE})`)}\n`);

for (const w of all) {
  let label = w.name ? `${w.name} ${hint(`(slug: ${w.slug ?? "?"})`)}` : hint("(name unknown)");
  let gone = false;
  if (online) {
    try {
      const ws = await findWorkspace(w.id);
      if (ws) label = `${ws.name} ${hint(`(slug: ${ws.slug})`)}`;
      else {
        gone = true;
        label = w.name
          ? `${w.name} — ${bad("NO LONGER EXISTS in the DB")}`
          : bad("NO LONGER EXISTS in the DB");
      }
    } catch (err) {
      label = `${label} — ${bad(`lookup failed: ${err instanceof Error ? err.message : err}`)}`;
    }
  }

  // The current directory's workspace is the one the user is almost always looking for,
  // so it gets the only strong color in the list.
  const here = hereIds.has(w.id);
  const mark = here ? ok("*") : " ";
  const origin = w.origin === "created" ? "created by you" : "shared with you";
  console.log(`${mark} ${here ? ok(w.id) : value(w.id)}`);
  console.log(`    ${label}`);
  console.log(hint(`    ${origin}${w.addedAt ? ` · since ${w.addedAt}` : ""}`));
  if (w.repos.length) console.log(hint(`    repos on this machine: ${w.repos.join(", ")}`));
  if (!gone) console.log(`    ${hint("join a repo to it:")}      ${cmd(`corpus-connect ${w.id}`)}`);
  console.log("");
}

console.log(hint(`${ok("*")} = wired in the current directory (${target})`));
if (!hereIds.size) {
  console.log(warn(`The current directory is not connected to any workspace.`));
}
