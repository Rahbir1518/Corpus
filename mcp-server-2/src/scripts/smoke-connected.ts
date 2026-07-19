/**
 * Connected-mode smoke test: proves a session's memory is addressed by the CONNECTED
 * WORKSPACE, never by the local folder.
 *
 * The regression this guards is silent and expensive: `corpus-connect <id>` wrote the id
 * into the client config, but the store still selected rows with the folder name — so
 * joining a teammate's workspace appeared to succeed and then served this repo's own
 * memory instead of theirs. Nothing errored; the memory was just quietly the wrong one.
 *
 * Rather than mock the store, this stands up a fake PostgREST endpoint, points a real
 * server process at it over real stdio, and asserts on the HTTP the store actually
 * emits — the level the bug lived at. CORPUS_PROJECT is deliberately set to a folder
 * name that appears NOWHERE in the workspace, so any query carrying it is the bug.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import http from "node:http";
import path from "node:path";

const WORKSPACE_ID = "3f2a9c14-7b8e-4d51-9a02-1c6e5b7d8f90";
const WORKSPACE_SLUG = "team-alpha";
const WORKSPACE_NAME = "Team Alpha";
/** The local folder. If this string reaches the DB as a filter, the bug is back. */
const LOCAL_FOLDER = "some-random-clone-dir";

/**
 * Stands in for the document the workspace already holds. Must carry the full section
 * set from document.ts's stateTemplate — corpus_log appends into "Session log", and a
 * fixture missing it fails on the markdown contract before reaching any storage code.
 */
const STATE = `# Corpus memory — ${WORKSPACE_NAME}

_Last updated: 2026-01-01T00:00:00.000Z · maintained by Corpus_

## Status

Shared workspace memory.

## Next steps

1. Ship it

## Decisions

## Architecture notes

## Session log
`;

interface Req {
  method: string;
  table: string;
  query: string;
  body: any;
}

/** Fake PostgREST. `keying` picks which schema shape to imitate. */
function server(keying: "id" | "slug") {
  const seen: Req[] = [];
  const s = http.createServer((req, res) => {
    const url = new URL(req.url!, "http://localhost");
    const table = url.pathname.replace("/rest/v1/", "");
    const select = url.searchParams.get("select") ?? "";
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const body = raw ? JSON.parse(raw) : null;
      seen.push({ method: req.method!, table, query: url.search, body });
      const send = (code: number, payload: unknown) => {
        res.writeHead(code, { "Content-Type": "application/json" });
        res.end(JSON.stringify(payload));
      };

      // The runtime keying probe: `select=workspace_id&limit=1`. A slug-keyed DB has no
      // such column, and Postgres reports 42703 — what store.ts branches on.
      if (table === "documents" && select === "workspace_id") {
        return keying === "id"
          ? send(200, [])
          : send(400, { code: "42703", message: "column documents.workspace_id does not exist" });
      }
      if (table === "workspaces" && req.method === "GET") {
        return send(200, [{ slug: WORKSPACE_SLUG, name: WORKSPACE_NAME }]);
      }
      if (table === "documents" && req.method === "GET") {
        // Only serve the document when addressed by the workspace. Addressed by folder
        // name, the store gets a miss — so a reverted fix fails loudly here instead of
        // returning plausible-looking content from the wrong project.
        const byWorkspace =
          url.search.includes(`workspace_id=eq.${WORKSPACE_ID}`) ||
          url.search.includes(`project=eq.${WORKSPACE_SLUG}`);
        if (!byWorkspace) return send(200, []);
        return send(200, select.includes("name") ? [{ name: "state" }] : [{ content: STATE }]);
      }
      return send(201, []);
    });
  });
  return { s, seen };
}

function step(name: string, ok: boolean, detail?: string) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) process.exitCode = 1;
}
function text(r: any): string {
  return r.content.map((c: any) => c.text).join("\n");
}

async function run(keying: "id" | "slug") {
  const { s, seen } = server(keying);
  await new Promise<void>((r) => s.listen(0, r));
  const port = (s.address() as any).port;

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ["--import", "tsx", path.join(import.meta.dirname, "..", "index.ts")],
    env: {
      ...process.env,
      CORPUS_PROJECT: LOCAL_FOLDER,
      CORPUS_AGENT: "smoke",
      CORPUS_WORKSPACE: WORKSPACE_ID,
      SUPABASE_URL: `http://127.0.0.1:${port}`,
      SUPABASE_SERVICE_ROLE_KEY: "smoke-test-key",
    },
    stderr: "ignore",
  });
  const client = new Client({ name: "smoke-connected", version: "0.0.1" });
  await client.connect(transport);

  console.log(`\n--- documents keyed by ${keying} ---`);

  const loaded = await client.callTool({ name: "corpus_load", arguments: {} });
  const body = text(loaded);
  step(
    `[${keying}] load reads the workspace's document`,
    body.includes("Shared workspace memory"),
    body.split("\n")[0],
  );
  step(
    `[${keying}] load is labelled with the workspace, not the folder`,
    body.includes(WORKSPACE_SLUG) && !body.includes(LOCAL_FOLDER),
  );

  const logged = await client.callTool({
    name: "corpus_log",
    arguments: { type: "note", summary: "a write that must land in the shared workspace" },
  });
  step(`[${keying}] log succeeds against the workspace`, !logged.isError, text(logged).split("\n")[0]);
  await client.close();
  await new Promise<void>((r) => s.close(() => r()));

  // The decisive assertion: the folder name must appear in NO request — not as a filter,
  // not in a body. Everything is addressed by the workspace.
  const leaked = seen.filter(
    (r) => r.query.includes(LOCAL_FOLDER) || JSON.stringify(r.body ?? {}).includes(LOCAL_FOLDER),
  );
  step(
    `[${keying}] the local folder name never reaches the database`,
    leaked.length === 0,
    leaked.length ? leaked.map((r) => `${r.method} ${r.table}${r.query}`).join(" | ") : "0 leaks",
  );

  const docReads = seen.filter((r) => r.method === "GET" && r.table === "documents" && !r.query.includes("select=workspace_id"));
  const expected = keying === "id" ? `workspace_id=eq.${WORKSPACE_ID}` : `project=eq.${WORKSPACE_SLUG}`;
  step(
    `[${keying}] every document read is keyed by ${keying === "id" ? "workspace id" : "the workspace's slug"}`,
    docReads.length > 0 && docReads.every((r) => r.query.includes(expected)),
    `${docReads.length} read(s)`,
  );

  const writes = seen.filter((r) => r.method === "POST" && r.table === "documents");
  step(
    `[${keying}] the write lands in the workspace`,
    writes.length > 0 &&
      writes.every((r) => {
        const rows = Array.isArray(r.body) ? r.body : [r.body];
        return rows.every((row: any) =>
          keying === "id" ? row.workspace_id === WORKSPACE_ID : row.project === WORKSPACE_SLUG,
        );
      }),
    `${writes.length} write(s)`,
  );

  // A stray workspaces INSERT is how the old slug path forked memory into a second,
  // folder-named workspace that the real one's dashboard never showed.
  step(
    `[${keying}] no second workspace is created behind the user's back`,
    !seen.some((r) => r.method === "POST" && r.table === "workspaces"),
  );

  const usage = seen.filter((r) => r.method === "POST" && r.table === "usage_events");
  step(
    `[${keying}] usage is attributed to the workspace`,
    usage.length > 0 &&
      usage.every((r) => {
        const rows = Array.isArray(r.body) ? r.body : [r.body];
        return rows.every((row: any) => row.workspace_id === WORKSPACE_ID && row.project === WORKSPACE_SLUG);
      }),
    `${usage.length} event(s)`,
  );
}

await run("id");
await run("slug");
console.log("\nConnected smoke test complete.");
