#!/usr/bin/env node
/**
 * `corpus-status` — read-only answer to "what is this repo actually wired to?"
 *
 * Read-only by design: it is the command you run when something is confusing, so it must
 * be safe to run at any time.
 *
 * It PROBES the store rather than just reporting config. "Config says supabase but the
 * key is expired" otherwise shows up as a silent fallback to local memory, which reads
 * as vanished memory rather than a credentials problem.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { readAllClients } from "./clients.js";
import { resolveProject, resolveWorkspace } from "./store.js";
import { findWorkspace, isWorkspaceId, probe, supabaseConfigured } from "./workspace.js";

const target = process.cwd();
const project = resolveProject();
const clients = readAllClients(target);

// The server resolves CORPUS_WORKSPACE from its own env, which clients inject from these
// config files — so the wired ids are the truth for "what would a session use".
const ids = [...new Set(clients.filter((c) => c.wired && c.workspaceId).map((c) => c.workspaceId!))];
const workspaceId = resolveWorkspace() ?? ids[0] ?? null;

console.log(`\nCorpus status — ${target}\n`);

console.log(`  Project label  ${project}${process.env.CORPUS_PROJECT ? "" : "  (from folder name)"}`);

if (!workspaceId) {
  console.log(`  Workspace      (none)`);
} else {
  console.log(`  Workspace      ${workspaceId}`);
}

// Split ids across clients means some sessions write to one workspace and some to
// another - exactly the divergence the symmetric patch is meant to prevent.
if (ids.length > 1) {
  console.log(`  ! MISMATCH     clients disagree on the workspace: ${ids.join(", ")}`);
  console.log(`                 re-run corpus-connect <id> to make them agree`);
}

// --- Store ------------------------------------------------------------------
// Mirrors createStore() exactly: workspace id ⇒ that workspace or nothing (OFF, never a
// silent local fork); no shared config at all ⇒ plain local memory.
if (!supabaseConfigured() && !workspaceId) {
  console.log(`  Store          local (~/.corpus/${project}) — Supabase not configured`);
} else if (workspaceId && !isWorkspaceId(workspaceId)) {
  console.log(`  Store          OFF — "${workspaceId}" is not a valid workspace id (expected a uuid)`);
  console.log(`                 fix it with corpus-connect <id>, or corpus-disconnect to clear it`);
} else if (!workspaceId) {
  console.log(`  Store          OFF — disconnected; memory tools will not read or write`);
  console.log(`                 corpus-connect <id> to rejoin a workspace, or corpus-setup for a new one`);
} else if (!supabaseConfigured()) {
  console.log(`  Store          OFF — workspace is set but Supabase credentials are not,`);
  console.log(`                 so it is unreachable; set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY`);
} else {
  // Never let a diagnostic crash: this is the command people run precisely when the
  // setup is broken, so every remote call here degrades to a printed line.
  try {
    const p = await probe();
    console.log(`  Store          supabase — ${p.ok ? "reachable" : `UNREACHABLE: ${p.detail}`}`);
    if (p.ok) {
      const ws = await findWorkspace(workspaceId);
      console.log(
        ws
          ? `  Workspace name ${ws.name} (slug: ${ws.slug})`
          : `  ! ORPHANED     no workspace with this id exists — writes will fail`,
      );
    }
  } catch (err) {
    console.log(`  Store          supabase — lookup failed: ${err instanceof Error ? err.message : err}`);
  }
}

// --- Local memory -----------------------------------------------------------
const localDir = path.join(os.homedir(), ".corpus", project);
if (fs.existsSync(localDir)) {
  const files = fs.readdirSync(localDir).filter((f) => f.endsWith(".md"));
  const bytes = files.reduce((n, f) => n + fs.statSync(path.join(localDir, f)).size, 0);
  console.log(`  Local memory   ${files.length} document(s), ~${Math.round(bytes / 1024)}KB`);
} else {
  console.log(`  Local memory   (none yet)`);
}

// --- Clients ----------------------------------------------------------------
// Per-directory is the single most confusing fact about MCP wiring, so say it here:
// these files only affect sessions opened in THIS directory.
console.log(`\n  Clients (config in this directory — sessions opened elsewhere don't see it)`);
for (const c of clients) {
  const mark = !c.exists ? "-" : c.wired ? "✓" : "✗";
  const note = !c.exists
    ? "no config file"
    : !c.wired
      ? "config exists but Corpus not registered"
      : c.workspaceId
        ? "connected"
        : "disconnected";
  console.log(`    ${mark} ${c.def.file.padEnd(24)} ${c.def.label.padEnd(12)} ${note}`);
}

// --- Graph ------------------------------------------------------------------
const graph = path.join(target, "graphify-out", "graph.json");
console.log(
  `\n  Code graph     ${
    fs.existsSync(graph)
      ? `built (${Math.round(fs.statSync(graph).size / 1024)}KB) — codebase_search live`
      : `not built — codebase_search will fall back to grep/read`
  }`,
);
console.log(`\n  All workspaces this machine has access to: corpus-ls`);
console.log("");
