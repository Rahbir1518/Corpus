import { Graph, CorpusNode, RecallResult } from "./types.js";
import { getGraph, matchNodes, expandOneHop, insertRecallEvent, getRawHistoryTokens } from "./store.js";
import { embed } from "./embed.js";
import { countTokens, nodeText } from "./tokens.js";

// Find the most relevant seed nodes: vector search if possible, else keyword.
async function findSeeds(ws: string, graph: Graph, query: string, k: number): Promise<string[]> {
  const embedding = await embed(query);
  if (embedding) {
    const matched = await matchNodes(ws, embedding, k);
    if (matched.length) return matched.map((m) => m.id);
  }
  return keywordSeeds(graph.nodes, query, k);
}

function keywordSeeds(nodes: CorpusNode[], query: string, k: number): string[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  return nodes
    .map((n) => {
      const hay = `${n.title} ${n.body} ${n.tags.join(" ")}`.toLowerCase();
      const score = terms.reduce((s, t) => s + (hay.includes(t) ? 1 : 0), 0);
      return { id: n.id, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((x) => x.id);
}

// Render the recalled cluster as compact markdown for the agent to consume.
function renderCluster(nodes: CorpusNode[], seedIds: Set<string>): string {
  const order: CorpusNode[] = [
    ...nodes.filter((n) => seedIds.has(n.id)),
    ...nodes.filter((n) => !seedIds.has(n.id)),
  ];
  const lines = ["# Recalled from Corpus\n"];
  for (const n of order) {
    const star = seedIds.has(n.id) ? "★ " : "";
    lines.push(`## ${star}[${n.type}] ${n.title}`);
    if (n.body) lines.push(n.body);
    if (n.tags.length) lines.push(`_tags: ${n.tags.join(", ")}_`);
    lines.push("");
  }
  return lines.join("\n").trim();
}

export async function recall(ws: string, query: string, k = 3): Promise<RecallResult> {
  const graph = await getGraph(ws);

  const seedList = await findSeeds(ws, graph, query, k);
  const seedIds = new Set(seedList);
  const clusterIds = expandOneHop(graph, seedIds);

  const clusterNodes = graph.nodes.filter((n) => clusterIds.has(n.id));
  const markdown = clusterNodes.length
    ? renderCluster(clusterNodes, seedIds)
    : `# Recalled from Corpus\n\nNo relevant memory found for "${query}".`;

  const fullTokens = await getRawHistoryTokens(ws);
  const recallTokens = countTokens(markdown);
  const nodeIds = clusterNodes.map((n) => n.id);

  await insertRecallEvent(ws, query, nodeIds, fullTokens, recallTokens);

  return { markdown, nodeIds, fullTokens, recallTokens };
}

export { nodeText };
