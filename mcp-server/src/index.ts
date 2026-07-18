#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { config } from "./config.js";
import { recall } from "./recall.js";
import { remember } from "./remember.js";

const server = new McpServer({ name: "corpus", version: "0.1.0" });

server.registerTool(
  "corpus_recall",
  {
    title: "Recall from Corpus",
    description:
      "Load only the relevant slice of the team's shared memory for a query, " +
      "instead of re-reading the whole project history. Call this at the START of a " +
      "session (or when you lack context) with a short description of what you're about to do.",
    inputSchema: {
      query: z.string().describe("What you're working on, e.g. 'fix the stripe webhook 401'"),
      workspace: z.string().optional().describe("Workspace id (defaults to the configured one)"),
    },
  },
  async ({ query, workspace }) => {
    const ws = workspace ?? config.workspace;
    const r = await recall(ws, query);
    const saved =
      r.fullTokens > 0 ? Math.round((1 - r.recallTokens / r.fullTokens) * 1000) / 10 : 0;
    const footer =
      `\n\n---\n_Corpus recall: ${r.recallTokens} tokens vs ${r.fullTokens} for the full corpus ` +
      `(${saved}% saved). ${r.nodeIds.length} nodes._`;
    return { content: [{ type: "text", text: r.markdown + footer }] };
  },
);

server.registerTool(
  "corpus_remember",
  {
    title: "Remember into Corpus",
    description:
      "Compress the current session into structured memory (decisions, bugs, files, " +
      "preferences, tasks) and save it to the team's shared graph. Call this at the END of a " +
      "session so future sessions — in any tool — can recall this work.",
    inputSchema: {
      session_text: z.string().describe("The session transcript or a summary of what happened"),
      title: z.string().optional().describe("Short label for this session"),
      workspace: z.string().optional().describe("Workspace id (defaults to the configured one)"),
    },
  },
  async ({ session_text, title, workspace }) => {
    const ws = workspace ?? config.workspace;
    const r = await remember(ws, session_text, title);
    const saved =
      r.rawTokens > 0 ? Math.round((1 - r.engramTokens / r.rawTokens) * 100) : 0;
    const summary =
      `Saved ${r.nodeIds.length} nodes, ${r.edgeCount} edges to workspace "${ws}".\n` +
      `Compressed ${r.rawTokens} tokens → ${r.engramTokens} tokens (${saved}% smaller).\n\n` +
      r.preview;
    return { content: [{ type: "text", text: summary }] };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[corpus] MCP server ready on stdio");
