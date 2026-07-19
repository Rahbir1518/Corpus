/**
 * End-to-end smoke test over real stdio: spawns the server as an MCP client would,
 * then runs the full loop — load (empty) → log → save → load (hydrated).
 * Uses the LocalStore (~/.corpus/corpus-smoke-test), then cleans it up.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PROJECT = "corpus-smoke-test";
const dir = path.join(os.homedir(), ".corpus", PROJECT);
fs.rmSync(dir, { recursive: true, force: true });

const transport = new StdioClientTransport({
  command: process.execPath,
  args: ["--import", "tsx", path.join(import.meta.dirname, "..", "index.ts")],
  // SUPABASE_URL="" + CORPUS_WORKSPACE="" pin the smoke test to the LocalStore even
  // though .env.local auto-loads — tests must never write to the real documentation DB,
  // and a workspace id inherited from the shell would flip the store to disconnected.
  env: {
    ...process.env,
    CORPUS_PROJECT: PROJECT,
    CORPUS_AGENT: "smoke",
    SUPABASE_URL: "",
    CORPUS_WORKSPACE: "",
  },
});
const client = new Client({ name: "smoke", version: "0.0.1" });
await client.connect(transport);

function text(r: any): string {
  return r.content.map((c: any) => c.text).join("\n");
}
function step(name: string, ok: boolean, detail?: string) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) process.exitCode = 1;
}

const tools = await client.listTools();
step(
  "tools registered",
  ["corpus_load", "corpus_log", "corpus_save", "codebase_search", "corpus_init"].every((t) =>
    tools.tools.some((x) => x.name === t),
  ),
  tools.tools.map((t) => t.name).join(", "),
);

const empty = await client.callTool({ name: "corpus_load", arguments: {} });
step("load on fresh project says 'no memory yet'", text(empty).includes("No memory yet"));

// Graphify may not be pip-installed in this environment — both outcomes are correct
// per the graceful-degradation design, so accept either rather than requiring it.
const init = await client.callTool({ name: "corpus_init", arguments: {} });
const initText = text(init);
step(
  "init seeds Architecture notes or degrades gracefully",
  (init as any).isError
    ? initText.includes("Graphify")
    : initText.includes("Seeded Architecture notes"),
  initText.split("\n")[0],
);

const logged = await client.callTool({
  name: "corpus_log",
  arguments: {
    type: "decision",
    summary: "Chose Supabase over Firebase because pgvector enables relevance matching later",
    files: ["mcp-server-2/src/store.ts"],
  },
});
step("log a decision", text(logged).includes("Logged [decision]"));

const badSave = await client.callTool({
  name: "corpus_save",
  arguments: {
    summary: "Worked on the store layer and wired the tools together end to end.",
    completed: ["store.ts with pluggable backends"],
    inProgress: ["still doing some stuff"],
    decisions: [],
    nextSteps: ["write the dashboard"],
  },
});
step("vague in-progress item is REJECTED", text(badSave).includes("Rejected"));

const goodSave = await client.callTool({
  name: "corpus_save",
  arguments: {
    summary: "Built the v2 store layer and wired all four tools over stdio.",
    completed: ["store.ts with Supabase + local backends", "document.ts merge logic"],
    inProgress: ["smoke coverage for codebase_search in src/scripts/smoke.ts — graphify branch untested"],
    decisions: [{ choice: "Documents live in the DB, never the repo", reason: "repo stays clean; dashboard browses everything" }],
    nextSteps: ["Create the documents table in Supabase", "Point the dashboard at it"],
  },
});
step("valid save is accepted", text(goodSave).includes("Saved state"));

const hydrated = await client.callTool({ name: "corpus_load", arguments: {} });
const h = text(hydrated);
step(
  "reload returns hydrated state",
  h.includes("Documents live in the DB") && h.includes("Create the documents table") && h.includes("[decision]"),
);

await client.close();

// Disconnected state: Supabase configured but no workspace (what corpus-disconnect
// leaves behind). Memory must be OFF — no reads, no writes, no silent local fork.
// Fake credentials are safe: DisconnectedStore never opens a connection. Fresh project
// name so the "nothing was written" check can't be satisfied by the files above.
const DC_PROJECT = "corpus-smoke-disconnected";
const dcDir = path.join(os.homedir(), ".corpus", DC_PROJECT);
fs.rmSync(dcDir, { recursive: true, force: true });
const dcTransport = new StdioClientTransport({
  command: process.execPath,
  args: ["--import", "tsx", path.join(import.meta.dirname, "..", "index.ts")],
  env: {
    ...process.env,
    CORPUS_PROJECT: DC_PROJECT,
    CORPUS_AGENT: "smoke",
    SUPABASE_URL: "https://smoke-test.invalid",
    SUPABASE_SERVICE_ROLE_KEY: "smoke-test-key",
    CORPUS_WORKSPACE: "",
  },
});
const dc = new Client({ name: "smoke-disconnected", version: "0.0.1" });
await dc.connect(dcTransport);

const dcLoad = await dc.callTool({ name: "corpus_load", arguments: {} });
step(
  "disconnected repo: load refuses and points at connect/setup",
  dcLoad.isError === true && text(dcLoad).includes("corpus-connect"),
);

const dcLog = await dc.callTool({
  name: "corpus_log",
  arguments: { type: "note", summary: "this write must be refused while disconnected" },
});
step("disconnected repo: log refuses (nothing written)", dcLog.isError === true);

await dc.close();
step("disconnected repo: no local files were created", !fs.existsSync(dcDir));

fs.rmSync(dir, { recursive: true, force: true });
console.log("\nSmoke test complete.");
