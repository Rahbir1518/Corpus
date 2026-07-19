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
import { bad, cmd, heading, hint, ok, value, warn } from "./color.js";
import { resolveProject, resolveWorkspace } from "./store.js";
import { documentsKeying, findWorkspace, isWorkspaceId, probe, supabaseConfigured } from "./workspace.js";

const target = process.cwd();
const project = resolveProject();
const clients = readAllClients(target);

// The server resolves CORPUS_WORKSPACE from its own env, which clients inject from these
// config files — so the wired ids are the truth for "what would a session use".
const ids = [...new Set(clients.filter((c) => c.wired && c.workspaceId).map((c) => c.workspaceId!))];
const workspaceId = resolveWorkspace() ?? ids[0] ?? null;

console.log(`\n${heading("Corpus status")} — ${value(target)}\n`);

console.log(
  `  Project label  ${project}${process.env.CORPUS_PROJECT ? "" : hint("  (from folder name)")}`,
);

if (!workspaceId) {
  console.log(`  Workspace      ${warn("(none)")}`);
} else {
  console.log(`  Workspace      ${value(workspaceId)}`);
}

// Split ids across clients means some sessions write to one workspace and some to
// another - exactly the divergence the symmetric patch is meant to prevent.
if (ids.length > 1) {
  console.log(`  ${bad("! MISMATCH")}     clients disagree on the workspace: ${ids.join(", ")}`);
  console.log(hint(`                 re-run `) + cmd("corpus-connect <id>") + hint(` to make them agree`));
}

// --- Store ------------------------------------------------------------------
// Mirrors createStore() exactly: workspace id ⇒ that workspace or nothing (OFF, never a
// silent local fork); no shared config at all ⇒ plain local memory.
if (!supabaseConfigured() && !workspaceId) {
  console.log(
    `  Store          ${warn("local")} (${value(`~/.corpus/${project}`)}) ${hint("— Supabase not configured")}`,
  );
} else if (workspaceId && !isWorkspaceId(workspaceId)) {
  console.log(`  Store          ${bad("OFF")} — "${workspaceId}" is not a valid workspace id (expected a uuid)`);
  console.log(hint(`                 fix it with `) + cmd("corpus-connect <id>") + hint(`, or `) + cmd("corpus-disconnect") + hint(` to clear it`));
} else if (!workspaceId) {
  console.log(`  Store          ${bad("OFF")} — disconnected; memory tools will not read or write`);
  console.log(hint(`                 `) + cmd("corpus-connect <id>") + hint(` to rejoin a workspace, or `) + cmd("corpus-setup") + hint(` for a new one`));
} else if (!supabaseConfigured()) {
  console.log(`  Store          ${bad("OFF")} — workspace is set but Supabase credentials are not,`);
  console.log(hint(`                 so it is unreachable; set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY`));
} else {
  // Never let a diagnostic crash: this is the command people run precisely when the
  // setup is broken, so every remote call here degrades to a printed line.
  try {
    const p = await probe();
    console.log(
      `  Store          supabase — ${p.ok ? ok("reachable") : bad(`UNREACHABLE: ${p.detail}`)}`,
    );
    if (p.ok) {
      const ws = await findWorkspace(workspaceId);
      console.log(
        ws
          ? `  Workspace name ${ws.name} ${hint(`(slug: ${ws.slug})`)}`
          : `  ${bad("! ORPHANED")}     no workspace with this id exists — writes will fail`,
      );
      const keying = await documentsKeying();
      if (keying === "slug") {
        console.log(`  ${warn("! SLUG-KEYED")}   documents are still keyed by project slug — repos sharing a`);
        console.log(hint(`                 folder name share memory. Run supabase/migrate-documents-to-`));
        console.log(hint(`                 workspace-id.sql once, then restart sessions.`));
      } else if (keying === "id") {
        console.log(`  Documents      ${ok("keyed by workspace id")} ${hint("— folder-name collisions impossible")}`);
      }
    }
  } catch (err) {
    console.log(
      `  Store          supabase — ${bad(`lookup failed: ${err instanceof Error ? err.message : err}`)}`,
    );
  }
}

// --- Local memory -----------------------------------------------------------
const localDir = path.join(os.homedir(), ".corpus", project);
if (fs.existsSync(localDir)) {
  const files = fs.readdirSync(localDir).filter((f) => f.endsWith(".md"));
  const bytes = files.reduce((n, f) => n + fs.statSync(path.join(localDir, f)).size, 0);
  console.log(
    `  Local memory   ${value(files.length)} document(s), ${hint(`~${Math.round(bytes / 1024)}KB`)}`,
  );
} else {
  console.log(`  Local memory   ${hint("(none yet)")}`);
}

// --- Clients ----------------------------------------------------------------
// Per-directory is the single most confusing fact about MCP wiring, so say it here:
// these files only affect sessions opened in THIS directory.
console.log(
  `\n  ${heading("Clients")} ${hint("(config in this directory — sessions opened elsewhere don't see it)")}`,
);
for (const c of clients) {
  // Pad first, colorize after: escape codes are zero-width on screen but count toward
  // String.padEnd, so padding colored text shreds the column alignment.
  const mark = !c.exists ? hint("-") : c.wired ? ok("✓") : bad("✗");
  const note = !c.exists
    ? hint("no config file")
    : !c.wired
      ? warn("config exists but Corpus not registered")
      : c.workspaceId
        ? ok("connected")
        : warn("disconnected");
  console.log(`    ${mark} ${c.def.file.padEnd(24)} ${hint(c.def.label.padEnd(12))} ${note}`);
}

// --- Graph ------------------------------------------------------------------
const graph = path.join(target, "graphify-out", "graph.json");
console.log(
  `\n  Code graph     ${
    fs.existsSync(graph)
      ? `${ok("built")} ${hint(`(${Math.round(fs.statSync(graph).size / 1024)}KB) — codebase_search live`)}`
      : `${warn("not built")} ${hint("— codebase_search will fall back to grep/read")}`
  }`,
);
console.log(`\n  ${hint("All workspaces this machine has access to:")} ${cmd("corpus-ls")}`);
console.log("");
