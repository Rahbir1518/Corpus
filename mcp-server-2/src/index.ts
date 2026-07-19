#!/usr/bin/env node
/**
 * Corpus v2 MCP server — markdown-first project memory. See ../../ARCHITECTURE.md.
 *
 * Design rules enforced here: no LLM calls (the calling model writes summaries; we
 * validate/render/persist), no repo writes (store is DB or ~/.corpus), graceful
 * degradation everywhere.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  STATE_DOC,
  appendToSection,
  ensureSessionHeading,
  getSection,
  replaceSection,
  stateTemplate,
} from "./document.js";
import { estimateFullGraphTokens, queryGraph, summarizeGraph } from "./graphify.js";
import { createStore, resolveProject } from "./store.js";
import { estimateTokens } from "./tokens.js";

// `project` is the LOCAL label (folder name / $CORPUS_PROJECT). It names the store and
// seeds a brand-new state document, but it must never be what a connected session calls
// itself — use `await store.label()` in user-facing text so the name follows the
// connected workspace rather than whatever folder this happens to be checked out in.
const project = resolveProject();
const store = createStore(project);

// One label per server process = one session grouping in the ledger.
const sessionLabel = `${new Date().toISOString().slice(0, 16).replace("T", " ")} — ${
  process.env.CORPUS_AGENT ?? "session"
}`;

const server = new McpServer({ name: "corpus-v2", version: "0.1.0" });

/**
 * Uniform answer for every memory tool while the repo is in no workspace (the state
 * `corpus-disconnect` puts it in). isError so the calling model treats it as "nothing was
 * read or written", never as "no memory yet, work normally" — the workspace this repo
 * left may hold plenty. stderr alone can't carry this: MCP clients don't show it.
 */
function disconnectedResult() {
  return {
    isError: true as const,
    content: [
      {
        type: "text" as const,
        text:
          `Corpus memory is OFF — ${store.reason}.\n\n` +
          `Nothing was read or written. This repo is not part of any workspace. ` +
          `Tell the user to pick one and restart the session:\n` +
          `- corpus-connect <workspace-id> — reconnect to a previous workspace\n` +
          `- corpus-setup — create a new workspace`,
      },
    ],
  };
}

async function getOrCreateState(): Promise<string> {
  const existing = await store.getDocument(STATE_DOC);
  if (existing) return existing;
  const fresh = stateTemplate(project);
  await store.putDocument(STATE_DOC, fresh);
  return fresh;
}

server.registerTool(
  "corpus_load",
  {
    title: "Corpus — load project memory",
    description:
      "Fetch this project's memory: current status, in-progress work, decisions and their " +
      "reasons, and exact next steps — written by previous sessions (possibly in other " +
      "tools, by other teammates). Call this: (1) at the START of a session before any " +
      "implementation work, (2) whenever the user says 'continue', 'pick up where we left " +
      "off', or references work you don't have in context, (3) before proposing changes to " +
      "code you haven't explored this session — a past decision may already cover it. " +
      "Far cheaper than re-reading history or re-exploring the codebase.",
    inputSchema: {
      document: z
        .string()
        .optional()
        .describe("Fetch one specific documentation page by name (default: the state document)"),
    },
  },
  async ({ document }) => {
    if (store.mode === "disconnected") return disconnectedResult();
    const name = document ?? STATE_DOC;
    const label = await store.label();
    const content = await store.getDocument(name);
    if (!content) {
      const docs = await store.listDocuments();
      const text =
        name === STATE_DOC
          ? `No memory yet for project "${label}" — this is session one. ` +
            `Work normally; record progress with corpus_log and corpus_save.`
          : `No document named "${name}" for project "${label}". Available: ${
              docs.length ? docs.join(", ") : "(none)"
            }.`;
      return { content: [{ type: "text", text }] };
    }
    const tokens = estimateTokens(content);
    const baselineTokens = await store.getCorpusTokenTotal();
    await store.logUsage({
      tool: "corpus_load",
      tokens,
      agent: process.env.CORPUS_AGENT,
      baselineTokens,
      baselineMethod: "full_corpus",
    });
    const footer = `\n\n---\n_Corpus: ~${tokens} tokens (estimate) · store: ${store.mode} · project: ${label}_`;
    return { content: [{ type: "text", text: content + footer }] };
  },
);

server.registerTool(
  "corpus_log",
  {
    title: "Corpus — log a step to project memory",
    description:
      "Append one line to the project's session ledger. Call this IMMEDIATELY after each of " +
      "these moments: you finish editing a file, you fix a bug, you make a design decision " +
      "(include the why), you discover something surprising about the codebase, or the user " +
      "corrects you. One short line each time — cheap and frequent is the point: this is " +
      "what makes the memory crash-safe and never stale. When in doubt, log it.",
    inputSchema: {
      type: z.enum(["decision", "change", "bug", "note"]).describe("What kind of entry this is"),
      summary: z.string().min(8).describe("One line. For decisions: the choice AND the reason."),
      files: z.array(z.string()).optional().describe("Files/functions this touches"),
    },
  },
  async ({ type, summary, files }) => {
    if (store.mode === "disconnected") return disconnectedResult();
    let state = await getOrCreateState();
    state = ensureSessionHeading(state, sessionLabel);
    const fileNote = files?.length ? ` (files: ${files.join(", ")})` : "";
    state = appendToSection(state, "Session log", `- [${type}] ${summary}${fileNote}`);
    if (type === "decision") {
      state = appendToSection(
        state,
        "Decisions",
        `- **${summary}** _(${new Date().toISOString().slice(0, 10)})_`,
      );
    }
    await store.putDocument(STATE_DOC, state);
    await store.logUsage({ tool: "corpus_log", tokens: estimateTokens(state), agent: process.env.CORPUS_AGENT });
    return {
      content: [{ type: "text", text: `Logged [${type}] to "${await store.label()}" (${store.mode}).` }],
    };
  },
);

server.registerTool(
  "corpus_save",
  {
    title: "Corpus — save session state to project memory",
    description:
      "Write a structured save-state so ANY future session — in any tool, by any teammate — " +
      "can continue this work cold. Call this when: the user says 'save state', 'done for " +
      "now', or goodbye; you finish the task you were asked to do; or you are about to hand " +
      "off unfinished work. Be concrete: name files and functions; next steps must be " +
      "executable by a model with no other context.",
    inputSchema: {
      summary: z.string().min(20).describe("One paragraph: what this session did"),
      completed: z.array(z.string()).describe("Finished items"),
      inProgress: z
        .array(z.string())
        .describe(
          "Unfinished items. Each MUST name the files/functions involved and where it stands, " +
            "e.g. 'refactoring rotateToken() in auth-context.tsx — rotation done, 3 call sites left'",
        ),
      decisions: z
        .array(z.object({ choice: z.string(), reason: z.string() }))
        .describe("Decisions made this session, with the why"),
      nextSteps: z
        .array(z.string())
        .min(1)
        .describe("Ordered, concrete steps a cold model can execute"),
    },
  },
  async ({ summary, completed, inProgress, decisions, nextSteps }) => {
    if (store.mode === "disconnected") return disconnectedResult();
    // Validation is the quality lever (ARCHITECTURE.md): reject vague in-progress items.
    const vague = inProgress.filter((i) => !/[\w-]+\.[a-zA-Z]{1,4}|\(\)/.test(i));
    if (vague.length) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text:
              `Rejected: these in-progress items name no file or function — a cold model ` +
              `can't continue from them. Rewrite with concrete references:\n` +
              vague.map((v) => `- ${v}`).join("\n"),
          },
        ],
      };
    }

    let state = await getOrCreateState();
    const done = completed.length ? completed.map((c) => `- ${c}`).join("\n") : "- (none this session)";
    const wip = inProgress.length ? inProgress.map((i) => `- ${i}`).join("\n") : "- (nothing in flight)";
    state = replaceSection(state, "Status", `**Done:**\n${done}\n\n**In progress:**\n${wip}`);
    state = replaceSection(
      state,
      "Next steps",
      nextSteps.map((s, i) => `${i + 1}. ${s}`).join("\n"),
    );
    const today = new Date().toISOString().slice(0, 10);
    for (const d of decisions) {
      state = appendToSection(state, "Decisions", `- **${d.choice}** — ${d.reason} _(${today})_`);
    }
    state = ensureSessionHeading(state, sessionLabel);
    state = appendToSection(state, "Session log", `- [save] ${summary}`);
    await store.putDocument(STATE_DOC, state);
    await store.logUsage({ tool: "corpus_save", tokens: estimateTokens(state), agent: process.env.CORPUS_AGENT });

    // Reach is a property of the backend, not of the save succeeding. Promising a handoff
    // the store cannot deliver would misrepresent a machine-local save as a team one.
    const reach =
      store.mode === "supabase"
        ? "Any session in any tool can now continue via corpus_load."
        : "Stored on this machine only — teammates and other machines cannot read it.";

    return {
      content: [
        {
          type: "text",
          text:
            `Saved state for "${await store.label()}" (${store.mode}). ${reach}\n\n` +
            `${getSection(state, "Status")}\n\n## Next steps\n` +
            getSection(state, "Next steps"),
        },
      ],
    };
  },
);

server.registerTool(
  "codebase_search",
  {
    title: "Corpus — search the codebase structure",
    description:
      "Ask a natural-language question about the codebase's structure and get back the " +
      "relevant nodes, source locations, and connections. Use this BEFORE your first grep " +
      "or file read, on your own initiative — it answers in ~2K tokens what grep-and-read " +
      "exploration costs tens of thousands, so it is the default opening move for code " +
      "questions, not a fallback after exploration stalls. Call it whenever you need, and " +
      "cannot already see in context: what calls or is called by a function; where a symbol " +
      "is defined; how two areas connect ('how does auth reach the db'); which files a " +
      "feature spans, before opening any of them; the blast radius of a change. Then read " +
      "only the files it points at. Fall back to grep/read when the graph misses — it " +
      "indexes structure, not string literals, comments, or config values.",
    inputSchema: {
      question: z.string().describe("Natural-language question about code structure"),
      budget: z.number().int().min(200).max(8000).default(2000).describe("Max response tokens"),
    },
  },
  async ({ question, budget }) => {
    const r = queryGraph(process.cwd(), question, budget);
    const baselineTokens = r.ok ? estimateFullGraphTokens(process.cwd()) : null;
    // Ledger label differs from the MCP tool name on purpose: usage_events.tool has a
    // CHECK constraint allowing only corpus_load/corpus_log/corpus_save/corpus_code_query.
    await store.logUsage({
      tool: "corpus_code_query",
      tokens: estimateTokens(r.text),
      agent: process.env.CORPUS_AGENT,
      baselineTokens,
      baselineMethod: "full_graph_sources",
    });
    return { content: [{ type: "text", text: r.text }], ...(r.ok ? {} : { isError: false }) };
  },
);

server.registerTool(
  "corpus_init",
  {
    title: "Bootstrap Architecture notes from the code graph",
    description:
      "Seed the memory's 'Architecture notes' section from the Graphify code graph — no " +
      "LLM, deterministic, seconds. Call this ONCE right after corpus-setup on a repo whose " +
      "memory is otherwise empty (corpus_load returned 'this is session one'), before doing " +
      "any other work, so the memory is useful on day one instead of blank until sessions " +
      "build it up. Also call it again after a large structural change (new major module, " +
      "big refactor) to refresh the snapshot. Skip it if Architecture notes already looks " +
      "current and nothing structural changed.",
    inputSchema: {},
  },
  async () => {
    const summary = summarizeGraph(process.cwd());
    if (!summary.ok) {
      return { isError: true, content: [{ type: "text", text: summary.text }] };
    }
    let state = await getOrCreateState();
    state = replaceSection(state, "Architecture notes", summary.text);
    await store.putDocument(STATE_DOC, state);
    await store.logUsage({
      tool: "corpus_init",
      tokens: estimateTokens(summary.text),
      agent: process.env.CORPUS_AGENT,
    });
    return {
      content: [
        {
          type: "text",
          text: `Seeded Architecture notes for "${await store.label()}" from the code graph (${store.mode}).\n\n${summary.text}`,
        },
      ],
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
// Report the workspace's own name, so the startup line confirms which memory this
// session is on rather than restating the directory the user can already see. Never let
// the banner's DB lookup delay or fail the handshake above.
store
  .label()
  .then((label) => console.error(`[corpus-v2] ready · project="${label}" · store=${store.mode}`))
  .catch(() => console.error(`[corpus-v2] ready · project="${project}" · store=${store.mode}`));
