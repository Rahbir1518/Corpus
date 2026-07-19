#!/usr/bin/env node
/**
 * `corpus-setup` — one-time, per-project setup. Run from the project you want Corpus in.
 *
 * Creates the conditions for automatic use (ARCHITECTURE.md "no perfect conditions assumed"):
 *   1. Creates the shared workspace (when Supabase is configured) and prints the id to
 *      share. The server never creates one on write, so this is where it comes from.
 *   2. Registers the MCP server with every supported client (merged, not overwritten):
 *      .mcp.json (Claude Code), .gemini/settings.json (Gemini CLI),
 *      .codex/config.toml (Codex CLI).
 *   3. Installs a standing-instruction block into CLAUDE.md, GEMINI.md and AGENTS.md
 *      (creating each), so agents log/save/query proactively without being prompted.
 *      One instruction file per client we register in step 2 — they do not read each
 *      other's.
 *   4. Builds the code graph, best effort.
 *
 * corpus-setup CREATES a workspace; corpus-connect <id> joins one someone else made.
 * That is the only difference between them.
 *
 * Idempotent: markers guard the instruction block, and an existing workspace id is
 * reused rather than replaced, so re-running never strands memory in an orphan.
 * This is an EXPLICIT user action — the only time Corpus ever writes into a repo.
 */
import path from "node:path";
import { CLIENTS, readClient } from "./clients.js";
import { recordWorkspace } from "./registry.js";
import { wireRepo } from "./wire.js";
import { createWorkspace, supabaseConfigured } from "./workspace.js";

const target = process.cwd();
const project = path.basename(target);

// --- 1. Workspace ----------------------------------------------------------
// Since the server no longer auto-creates a workspace on write (that keyed on slug, so
// two unrelated teams with a folder named `api` silently shared one), setup is where a
// workspace comes from. Reuse whatever this repo is already connected to, so re-running
// setup never strands the existing memory in an orphaned workspace.
let workspaceId: string | null =
  CLIENTS.map((def) => readClient(target, def).workspaceId).find(Boolean) ?? null;

if (workspaceId) {
  console.log(`✓ Workspace — already connected (${workspaceId})`);
  // Into the rolodex even on reuse: the id may predate corpus-ls, or have arrived via a
  // teammate's committed .mcp.json without ever passing through corpus-connect here.
  recordWorkspace({ id: workspaceId, origin: "connected", repo: target });
} else if (supabaseConfigured()) {
  try {
    const ws = await createWorkspace(project, project);
    workspaceId = ws.id;
    recordWorkspace({ id: ws.id, name: ws.name, slug: ws.slug, origin: "created", repo: target });
    console.log(`✓ Workspace — created ${ws.id}`);
    console.log(`  Share this id with teammates: corpus-connect ${ws.id}`);
  } catch (err) {
    console.error(`– Workspace — could not create: ${err instanceof Error ? err.message : err}`);
    console.error(
      `  Memory will be OFF until this repo joins a workspace — re-run corpus-setup,\n` +
        `  or corpus-connect <id> if a teammate already has one.`,
    );
  }
} else {
  console.log(`– Workspace — Supabase not configured; memory stays local (~/.corpus/${project})`);
}

// --- 2. Wiring (clients + instructions + hooks + graph) ----------------------
// Shared with corpus-connect (wire.ts) so a repo joined via connect gets the exact
// same registration and standing instructions as one set up here.
await wireRepo(target, project, workspaceId);

const memoryLine = workspaceId
  ? `Memory lands in workspace ${workspaceId} — share the id for corpus-connect.`
  : supabaseConfigured()
    ? `Memory is OFF until this repo joins a workspace (corpus-setup / corpus-connect <id>).`
    : `Memory is stored locally in ~/.corpus/${project}/ (no keys, no network).
To use a shared team workspace later, add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
to mcp-server-2/.env.local and re-run corpus-setup.`;

console.log(`
Done. Start Claude Code, Gemini CLI, or Codex in this directory and approve the
"corpus" MCP server. All three share one memory store, so a session in any of them
picks up where the others left off.
${memoryLine}

Scope: this wiring lives in THIS directory's config files (.mcp.json, .gemini/,
.codex/) — agents read them from the directory a session is opened in, so sessions
started elsewhere will not have Corpus. Run corpus-setup per project (commit the
configs to share them with teammates), and corpus-ls to see every workspace this
machine has access to.

Note: Codex only reads .codex/config.toml in projects you have marked trusted; if it
does not appear under /mcp, copy that block into ~/.codex/config.toml instead.`);
