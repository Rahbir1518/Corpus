/**
 * Machine-local rolodex of every workspace this user holds an id for —
 * `~/.corpus/workspaces.json`.
 *
 * Access to a workspace IS the id (bearer model, see ARCHITECTURE.md "Sharing & access"),
 * and ids are scattered across per-repo client configs. Losing the config (deleted clone,
 * corpus-disconnect) must not mean losing the id, so setup and connect record every id
 * they touch here: origin "created" for corpus-setup, "connected" for ids someone shared.
 * `corpus-ls` reads this file; nothing else does.
 *
 * NOT an access-control list — the DB stays the truth about what exists. This is a
 * contact book: which ids this machine has held, where they came from, which repos here
 * use them. Entries are never auto-removed (disconnect keeps them — reconnecting later is
 * the whole point of remembering the id).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export interface KnownWorkspace {
  id: string;
  /** Last known display name/slug — refreshed whenever the DB confirms them. */
  name: string | null;
  slug: string | null;
  origin: "created" | "connected";
  addedAt: string; // ISO date
  /** Absolute paths of repos on this machine that setup/connect wired to this id. */
  repos: string[];
}

const FILE = path.join(os.homedir(), ".corpus", "workspaces.json");

export function listKnownWorkspaces(): KnownWorkspace[] {
  if (!fs.existsSync(FILE)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(FILE, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // A corrupt rolodex must never block setup/connect/ls — it is a convenience index,
    // not the source of truth. Report and start over.
    console.error(`! ${FILE} is not valid JSON — ignoring it (it will be rewritten).`);
    return [];
  }
}

export function recordWorkspace(entry: {
  id: string;
  name?: string | null;
  slug?: string | null;
  origin: "created" | "connected";
  repo: string;
}): void {
  const all = listKnownWorkspaces();
  const existing = all.find((w) => w.id === entry.id);

  if (existing) {
    // Refresh what the caller verified; never downgrade origin or lose repos. "created"
    // is a historical fact, so a later corpus-connect to your own workspace keeps it.
    if (entry.name) existing.name = entry.name;
    if (entry.slug) existing.slug = entry.slug;
    if (!existing.repos.includes(entry.repo)) existing.repos.push(entry.repo);
  } else {
    all.push({
      id: entry.id,
      name: entry.name ?? null,
      slug: entry.slug ?? null,
      origin: entry.origin,
      addedAt: new Date().toISOString().slice(0, 10),
      repos: [entry.repo],
    });
  }

  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(all, null, 2) + "\n", "utf8");
}

function writeAll(all: KnownWorkspace[]): void {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(all, null, 2) + "\n", "utf8");
}

/**
 * Drop one repo from the rolodex — used by corpus-uninstall, the one operation that
 * makes a repo stop using an id.
 *
 * `forget` decides the fate of an entry whose last repo just left. Default false, and
 * deliberately so: the id IS the access (bearer model), so an uninstall that also
 * discarded it would silently destroy the only way back into that workspace — including
 * workspaces this machine created. Keeping a repo-less entry costs a line of JSON;
 * losing the id can cost the whole memory.
 *
 * Returns the ids that were forgotten, so the caller can print them as a last chance to
 * write one down.
 */
export function forgetRepo(repo: string, forget = false): string[] {
  const all = listKnownWorkspaces();
  let touched = false;
  for (const w of all) {
    const kept = w.repos.filter((r) => r !== repo);
    if (kept.length !== w.repos.length) {
      w.repos = kept;
      touched = true;
    }
  }
  const dropped = forget ? all.filter((w) => !w.repos.length) : [];
  if (!touched && !dropped.length) return [];
  writeAll(forget ? all.filter((w) => w.repos.length) : all);
  return dropped.map((w) => w.id);
}

export const REGISTRY_FILE = FILE;
