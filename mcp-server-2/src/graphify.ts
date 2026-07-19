/**
 * Adapter around the Graphify CLI (`pip install graphifyy` — installs `graphify`).
 *
 * Verified against graphifyy 0.9.18:
 *   - build:  `graphify update <path>`  (tree-sitter extraction, no LLM, seconds)
 *   - query:  `graphify query "<question>" --budget N`  (BFS over graphify-out/graph.json)
 *
 * Two failure modes this file must survive (design rule 4 — degrade gracefully):
 *   1. `graphify` not on PATH (pip's Scripts dir often isn't, especially on Windows) —
 *      we probe known install locations and honor GRAPHIFY_PATH.
 *   2. No graph built yet — we auto-build once (`update .`) and retry, so the first
 *      query in a repo Just Works instead of teaching the model the tool is broken.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { estimateTokens } from "./tokens.js";

export interface GraphifyResult {
  ok: boolean;
  text: string;
}

let resolvedBin: string | null | undefined; // undefined = not probed yet
let rebuiltThisSession = false;

/** Find a runnable graphify binary: env override → PATH → common pip install locations. */
function resolveBin(): string | null {
  if (resolvedBin !== undefined) return resolvedBin;

  const candidates: string[] = [];
  if (process.env.GRAPHIFY_PATH) candidates.push(process.env.GRAPHIFY_PATH);
  candidates.push("graphify");
  if (process.platform === "win32") {
    // pip on Windows drops exes in Python's Scripts dir, which is rarely on PATH.
    const pyRoots = [
      path.join(os.homedir(), "AppData", "Local", "Python"),
      path.join(os.homedir(), "AppData", "Local", "Programs", "Python"),
    ];
    for (const root of pyRoots) {
      if (!fs.existsSync(root)) continue;
      for (const dir of fs.readdirSync(root)) {
        const exe = path.join(root, dir, "Scripts", "graphify.exe");
        if (fs.existsSync(exe)) candidates.push(exe);
      }
    }
  }

  for (const bin of candidates) {
    const probe = spawnSync(bin, ["--help"], { encoding: "utf8", timeout: 10_000, shell: false });
    if (!probe.error && probe.status === 0) {
      resolvedBin = bin;
      return bin;
    }
  }
  resolvedBin = null;
  return null;
}

function run(bin: string, args: string[], cwd: string, timeout: number) {
  return spawnSync(bin, args, { cwd, encoding: "utf8", timeout, shell: false });
}

function graphExists(root: string): boolean {
  return fs.existsSync(path.join(root, "graphify-out", "graph.json"));
}

let fullGraphTokenCache: { root: string; mtimeMs: number; total: number } | null = null;

/**
 * Real (not estimated-multiplier) size of every source file the code graph indexes, in
 * tokens — the measured "what a grep-and-read spiral across this codebase would have
 * cost" baseline for corpus_code_query. Reads actual files on disk, not a guess. Cached
 * per graph.json build (mtime-keyed) since it doesn't change between queries in a
 * session. Never throws — returns null if the graph or any source file is unreadable, so
 * a telemetry hiccup never fabricates a number.
 */
export function estimateFullGraphTokens(root: string): number | null {
  const graphPath = path.join(root, "graphify-out", "graph.json");
  try {
    const stat = fs.statSync(graphPath);
    if (fullGraphTokenCache && fullGraphTokenCache.root === root && fullGraphTokenCache.mtimeMs === stat.mtimeMs) {
      return fullGraphTokenCache.total;
    }

    const graph = JSON.parse(fs.readFileSync(graphPath, "utf8")) as {
      nodes?: Array<{ source_file?: string }>;
    };
    const sourceFiles = new Set(
      (graph.nodes ?? []).map((n) => n.source_file).filter((f): f is string => !!f),
    );

    let total = 0;
    for (const rel of sourceFiles) {
      try {
        total += estimateTokens(fs.readFileSync(path.join(root, rel), "utf8"));
      } catch {
        // File moved/deleted since the graph was built — skip, don't fail the whole total.
      }
    }

    fullGraphTokenCache = { root, mtimeMs: stat.mtimeMs, total };
    return total;
  } catch {
    return null;
  }
}

/** Build/refresh the graph. Deterministic tree-sitter extraction — no LLM, no tokens. */
export function buildGraph(root: string): GraphifyResult {
  const bin = resolveBin();
  if (!bin) {
    return {
      ok: false,
      text:
        "Graphify is not installed. Code queries are unavailable — fall back to normal " +
        "exploration (grep/read). To enable: `pip install graphifyy` (two ys).",
    };
  }
  const r = run(bin, ["update", "."], root, 120_000);
  if (r.error || r.status !== 0) {
    return { ok: false, text: `Graph build failed: ${r.error?.message ?? r.stderr?.trim()}` };
  }
  return { ok: true, text: r.stdout.trim() };
}

/** Pull a `## Heading` block's bullet/numbered lines out of the report, up to the next `## `. */
function extractBlock(report: string, heading: string, maxLines: number): string[] {
  const lines = report.split("\n");
  const start = lines.findIndex((l) => l.startsWith(heading));
  if (start === -1) return [];
  const body: string[] = [];
  for (let i = start + 1; i < lines.length && body.length < maxLines; i++) {
    if (lines[i].startsWith("## ")) break;
    if (lines[i].trim()) body.push(lines[i].trim());
  }
  return body;
}

/**
 * Bootstrap material for `corpus_init`: reads the report Graphify already writes
 * (GRAPH_REPORT.md) and pulls out the core-abstractions and key-files lists.
 * No raw graph.json parsing, no LLM — reuses graphify's own analysis verbatim.
 */
export function summarizeGraph(root: string): GraphifyResult {
  const bin = resolveBin();
  if (!bin) {
    return {
      ok: false,
      text:
        "Graphify is not installed, so corpus_init has nothing to seed Architecture notes " +
        "from. To enable: `pip install graphifyy` (two ys).",
    };
  }
  if (!graphExists(root) || !rebuiltThisSession) {
    const built = buildGraph(root);
    if (!built.ok && !graphExists(root)) return built;
    rebuiltThisSession = true;
  }

  const reportPath = path.join(root, "graphify-out", "GRAPH_REPORT.md");
  if (!fs.existsSync(reportPath)) {
    return { ok: false, text: "Graphify built a graph but no GRAPH_REPORT.md was found to seed from." };
  }
  const report = fs.readFileSync(reportPath, "utf8");

  const commitMatch = report.match(/Built from commit: `([^`]+)`/);
  const countsMatch = report.match(/^- (\d+ nodes · \d+ edges.*)$/m);
  const godNodes = extractBlock(report, "## God Nodes", 8);
  const hubs = extractBlock(report, "## Community Hubs", 8);

  if (!godNodes.length && !hubs.length) {
    return { ok: false, text: "GRAPH_REPORT.md had no God Nodes or Community Hubs to seed from." };
  }

  const header = `_Seeded by \`corpus_init\` from the Graphify code graph${
    commitMatch ? ` (commit \`${commitMatch[1]}\`` : " ("
  }${countsMatch ? `, ${countsMatch[1]}` : ""}):_`;
  const abstractions = godNodes.length
    ? `\n\n**Core abstractions (most connected):**\n${godNodes.map((l) => `- ${l.replace(/^\d+\.\s*/, "")}`).join("\n")}`
    : "";
  const keyFiles = hubs.length
    ? `\n\n**Key files:**\n${hubs.map((l) => `- ${l.replace(/^-\s*/, "")}`).join("\n")}`
    : "";

  return { ok: true, text: `${header}${abstractions}${keyFiles}` };
}

export function queryGraph(root: string, question: string, budget: number): GraphifyResult {
  const bin = resolveBin();
  if (!bin) {
    return {
      ok: false,
      text:
        "Graphify is not installed here. Fall back to normal code exploration (grep/read). " +
        "To enable graph queries: `pip install graphifyy` (two ys).",
    };
  }

  // Rebuild once per server process (= once per session), on the first query: the graph
  // is then never older than the session using it — covers teammates' pushes, edits made
  // in other tools, and prior sessions. Within a session, drift is only the model's own
  // edits, which it already knows about. Build is tree-sitter: seconds, zero tokens.
  if (!rebuiltThisSession || !graphExists(root)) {
    const built = buildGraph(root);
    if (!built.ok && !graphExists(root)) return built; // stale graph beats no graph
    rebuiltThisSession = true;
  }

  const r = run(bin, ["query", question, "--budget", String(budget)], root, 30_000);
  if (r.error || r.status !== 0) {
    return {
      ok: false,
      text:
        `Graph query failed (${r.error?.message ?? r.stderr?.trim() ?? `exit ${r.status}`}). ` +
        `Fall back to normal exploration.`,
    };
  }
  const out = r.stdout.trim();
  if (!out) {
    return { ok: false, text: "Graphify returned no results for that question. Fall back to normal exploration." };
  }

  // "what calls X" phrasing makes graphify's own heuristic narrow traversal to
  // context=call edges only. But graphify's extractor records some real call sites
  // (e.g. a function only ever referenced via its import binding) as context=import
  // instead of context=call, so the narrowed query silently drops the caller. Since
  // graphify reports when it applied this heuristic (`Context: call (heuristic)` in
  // its header), detect that case and retry once with both contexts explicit.
  if (out.includes("Context: call (heuristic)")) {
    const broadened = run(
      bin,
      ["query", question, "--budget", String(budget), "--context", "call", "--context", "import"],
      root,
      30_000,
    );
    const broadenedOut = broadened.stdout?.trim();
    if (!broadened.error && broadened.status === 0 && broadenedOut) {
      return { ok: true, text: broadenedOut };
    }
  }

  return { ok: true, text: out };
}
