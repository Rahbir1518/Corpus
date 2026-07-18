import Anthropic from "@anthropic-ai/sdk";
import { config, hasAnthropic } from "./config.js";
import { CorpusNode, CorpusEdge, NodeType, RelType } from "./types.js";

const NODE_TYPES: NodeType[] = ["decision", "bug", "file", "preference", "task"];
const REL_TYPES: RelType[] = ["caused", "depends_on", "touches", "relates_to"];

export interface Engram {
  nodes: Omit<CorpusNode, "session_id">[];
  edges: CorpusEdge[];
}

const SYSTEM = `You extract durable memory from an AI coding session.
Return ONLY what a FUTURE session would need to continue the work — be ruthless and terse.
Output STRICT JSON matching this shape (no prose, no markdown fences):
{
  "nodes": [{ "key": "short-kebab-id", "type": "decision|bug|file|preference|task", "title": "one line", "body": "1-3 sentences of why/what", "tags": ["lowercase"] }],
  "edges": [{ "source": "key", "target": "key", "rel": "caused|depends_on|touches|relates_to" }]
}
Rules:
- type must be exactly one of: decision, bug, file, preference, task.
- "key" is a short unique slug you invent; edges reference those keys.
- Capture decisions (and WHY), open bugs, important files, user preferences, and open tasks.
- Skip chit-chat, resolved trivia, and anything a future session wouldn't reuse.
- Prefer 4-12 nodes. Draw edges only where a real relationship exists.`;

// Extract structured memory from raw session text.
export async function extractEngram(sessionText: string): Promise<Engram> {
  if (hasAnthropic()) {
    try {
      return await extractWithClaude(sessionText);
    } catch (err) {
      console.error("[corpus] Claude extraction failed, using heuristic:", err);
    }
  }
  return heuristicEngram(sessionText);
}

async function extractWithClaude(sessionText: string): Promise<Engram> {
  const client = new Anthropic({ apiKey: config.anthropicKey });
  const msg = await client.messages.create({
    model: config.claudeModel,
    max_tokens: 2000,
    system: SYSTEM,
    messages: [{ role: "user", content: sessionText.slice(0, 100_000) }],
  });
  const text = msg.content.filter((b) => b.type === "text").map((b) => (b as any).text).join("");
  return normalize(JSON.parse(stripFences(text)));
}

function stripFences(s: string): string {
  const m = s.match(/\{[\s\S]*\}/);
  return m ? m[0] : s;
}

// Coerce raw model output into valid nodes/edges with clean ids.
function normalize(raw: any): Engram {
  const keyToId = new Map<string, string>();
  const nodes: Engram["nodes"] = [];

  for (const n of raw.nodes ?? []) {
    const key = String(n.key ?? n.id ?? n.title ?? "node");
    const type: NodeType = NODE_TYPES.includes(n.type) ? n.type : "task";
    const id = uniqueId(slug(n.title ?? key), keyToId);
    keyToId.set(key, id);
    nodes.push({
      id,
      type,
      title: String(n.title ?? key).slice(0, 200),
      body: String(n.body ?? "").slice(0, 1000),
      tags: Array.isArray(n.tags) ? n.tags.map((t: any) => String(t).toLowerCase()) : [],
    });
  }

  const edges: CorpusEdge[] = [];
  for (const e of raw.edges ?? []) {
    const s = keyToId.get(String(e.source));
    const t = keyToId.get(String(e.target));
    if (!s || !t || s === t) continue;
    const rel: RelType = REL_TYPES.includes(e.rel) ? e.rel : "relates_to";
    edges.push({ source_id: s, target_id: t, rel });
  }
  return { nodes, edges };
}

// Fallback when no LLM is available: one task node per heading/paragraph.
function heuristicEngram(text: string): Engram {
  // Prefer paragraph/bullet breaks; if the text is one blob, fall back to sentences.
  let chunks = text
    .split(/\n{2,}|\n(?=[-*#•]|\d+\.)/)
    .map((c) => c.trim())
    .filter((c) => c.length > 12);
  if (chunks.length <= 1) {
    chunks = text
      .split(/(?<=[.!?])\s+|\n+/)
      .map((c) => c.trim())
      .filter((c) => c.length > 12);
  }
  chunks = chunks.slice(0, 8);
  const seen = new Map<string, string>();
  const nodes = chunks.map((c) => {
    const title = c.replace(/^[-*#•\d.\s]+/, "").split(/[.\n]/)[0].slice(0, 100);
    return {
      id: uniqueId(slug(title), seen),
      type: "task" as NodeType,
      title,
      body: c.slice(0, 400),
      tags: [] as string[],
    };
  });
  return { nodes, edges: [] };
}

function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "node"
  );
}

function uniqueId(base: string, seen: Map<string, string>): string {
  const stamp = Date.now().toString(36).slice(-4);
  let id = `n-${base}-${stamp}`;
  let i = 1;
  while ([...seen.values()].includes(id)) id = `n-${base}-${stamp}-${i++}`;
  seen.set(id, id);
  return id;
}
