import { CorpusNode } from "./types.js";
import { extractEngram } from "./engram.js";
import { embedBatch } from "./embed.js";
import { writeEngram } from "./store.js";
import { countTokens, nodeText } from "./tokens.js";

export interface RememberResult {
  sessionId: string;
  nodeIds: string[];
  edgeCount: number;
  rawTokens: number;
  engramTokens: number;
  preview: string;
}

// Capture a session into the shared graph: compress → embed → persist.
export async function remember(
  ws: string,
  sessionText: string,
  title?: string,
): Promise<RememberResult> {
  const engram = await extractEngram(sessionText);

  const sessionId = `sess-${Date.now().toString(36)}`;
  const sessionTitle = title ?? engram.nodes[0]?.title ?? "Session";

  // Embed each node's text so it's recallable later.
  const embeddings = await embedBatch(engram.nodes.map((n) => nodeText(n as CorpusNode)));
  const nodes = engram.nodes.map((n, i) => ({
    ...(n as CorpusNode),
    session_id: sessionId,
    embedding: embeddings[i],
  }));

  const rawTokens = countTokens(sessionText);
  const engramTokens = nodes.reduce((sum, n) => sum + countTokens(nodeText(n)), 0);

  const nodeIds = await writeEngram(ws, {
    sessionId,
    sessionTitle,
    rawTokens,
    engramTokens,
    nodes,
    edges: engram.edges,
  });

  const preview = ["Captured:", ...nodes.map((n) => `  • [${n.type}] ${n.title}`)].join("\n");

  return {
    sessionId,
    nodeIds,
    edgeCount: engram.edges.length,
    rawTokens,
    engramTokens,
    preview,
  };
}
