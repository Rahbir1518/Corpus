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
  // SUPABASE_URL="" pins the smoke test to the LocalStore even though .env.local
  // auto-loads — tests must never write to the real documentation DB.
  env: { ...process.env, CORPUS_PROJECT: PROJECT, CORPUS_AGENT: "smoke", SUPABASE_URL: "" },
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
  ["corpus_load", "corpus_log", "corpus_save", "corpus_code_query"].every((t) =>
    tools.tools.some((x) => x.name === t),
  ),
  tools.tools.map((t) => t.name).join(", "),
);

const empty = await client.callTool({ name: "corpus_load", arguments: {} });
step("load on fresh project says 'no memory yet'", text(empty).includes("No memory yet"));

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
    inProgress: ["smoke coverage for corpus_code_query in src/scripts/smoke.ts — graphify branch untested"],
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
fs.rmSync(dir, { recursive: true, force: true });
console.log("\nSmoke test complete.");
