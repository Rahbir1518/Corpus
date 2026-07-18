// Keyword-similarity engine for the workspace graph.
//
// Each workspace's markdown documents are folded into a TF-IDF vector; edges
// connect workspaces whose vectors are cosine-similar. This is the retrieval
// half of a RAG pipeline (rank by term relevance) run over workspaces instead
// of chunks — no embedding API needed, so it works on any Supabase project.

export interface WorkspaceDoc {
  project: string;
  name: string;
  content: string;
  updated_at?: string;
}

export interface WorkspaceNode {
  id: string; // workspace slug
  name: string;
  docCount: number;
  tokens: number; // rough size of everything in the workspace
  keywords: string[]; // top TF-IDF terms, used for search + modal chips
  docNames: string[];
}

export interface WorkspaceEdge {
  source: string;
  target: string;
  weight: number; // cosine similarity, 0..1
  shared: string[]; // terms driving the connection, for the hover label
}

export interface WorkspaceGraph {
  nodes: WorkspaceNode[];
  edges: WorkspaceEdge[];
}

const STOPWORDS = new Set(
  (
    "the and for with this that from have are was were will would should could been being has had not but you " +
    "your our their they them its can may might must shall into onto over under about after before between during " +
    "without within also than then there here when where which while who whom whose why how all any both each few " +
    "more most other some such only own same very just don now use used using get gets got new one two three see " +
    "set run when what does did doing done make makes made need needs like each per via etc still yet out off " +
    "readme http https www com href null true false const let var function return import export default async await"
  ).split(/\s+/),
);

// Cap how much of each doc feeds the vector so one giant doc can't drown a workspace.
const MAX_DOC_CHARS = 20_000;
const MIN_EDGE_SIMILARITY = 0.08;
const MAX_EDGES_PER_NODE = 4;
const KEYWORDS_PER_NODE = 8;
const SHARED_TERMS_PER_EDGE = 3;

export function tokenize(text: string): string[] {
  const raw = text.toLowerCase().match(/[a-z][a-z0-9_-]{2,29}/g) ?? [];
  return raw.filter((t) => !STOPWORDS.has(t));
}

type Vector = Map<string, number>;

function termFrequencies(text: string): Vector {
  const tf: Vector = new Map();
  for (const t of tokenize(text)) tf.set(t, (tf.get(t) ?? 0) + 1);
  return tf;
}

function cosine(a: Vector, b: Vector): number {
  // Iterate the smaller vector.
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [term, w] of small) {
    const w2 = large.get(term);
    if (w2) dot += w * w2;
  }
  return dot; // vectors are pre-normalized
}

const estTokens = (chars: number) => Math.max(1, Math.round(chars / 4));

export interface WorkspaceMeta {
  slug: string;
  name: string;
}

export function buildWorkspaceGraph(
  workspaces: WorkspaceMeta[],
  docs: WorkspaceDoc[],
): WorkspaceGraph {
  // Group docs per workspace; keep workspaces with zero docs as isolated nodes.
  const byProject = new Map<string, WorkspaceDoc[]>();
  for (const d of docs) {
    const list = byProject.get(d.project) ?? [];
    list.push(d);
    byProject.set(d.project, list);
  }
  // Docs may reference workspaces the caller didn't pass (demo / partial data).
  const metas = new Map<string, WorkspaceMeta>();
  for (const w of workspaces) metas.set(w.slug, w);
  for (const slug of byProject.keys()) {
    if (!metas.has(slug)) metas.set(slug, { slug, name: slug });
  }

  // Raw term frequencies per workspace.
  const tfs = new Map<string, Vector>();
  for (const [slug] of metas) {
    const text = (byProject.get(slug) ?? [])
      .map((d) => `${d.name}\n${d.content.slice(0, MAX_DOC_CHARS)}`)
      .join("\n\n");
    tfs.set(slug, termFrequencies(text));
  }

  // Document frequency across workspaces → IDF.
  const df = new Map<string, number>();
  for (const tf of tfs.values()) {
    for (const term of tf.keys()) df.set(term, (df.get(term) ?? 0) + 1);
  }
  const n = Math.max(1, tfs.size);
  const idf = (term: string) => Math.log(1 + n / (df.get(term) ?? 1));

  // TF-IDF vectors, L2-normalized.
  const vectors = new Map<string, Vector>();
  for (const [slug, tf] of tfs) {
    const v: Vector = new Map();
    let norm = 0;
    for (const [term, count] of tf) {
      const w = (1 + Math.log(count)) * idf(term);
      v.set(term, w);
      norm += w * w;
    }
    norm = Math.sqrt(norm) || 1;
    for (const [term, w] of v) v.set(term, w / norm);
    vectors.set(slug, v);
  }

  const nodes: WorkspaceNode[] = [...metas.values()].map((m) => {
    const wsDocs = byProject.get(m.slug) ?? [];
    const v = vectors.get(m.slug)!;
    const keywords = [...v.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, KEYWORDS_PER_NODE)
      .map(([term]) => term);
    return {
      id: m.slug,
      name: m.name || m.slug,
      docCount: wsDocs.length,
      tokens: estTokens(wsDocs.reduce((s, d) => s + d.content.length, 0)),
      keywords,
      docNames: wsDocs.map((d) => d.name),
    };
  });

  // All-pairs similarity (workspace counts are small), then keep each node's
  // strongest few edges so the graph stays readable instead of a hairball.
  const slugs = [...metas.keys()];
  const candidates: WorkspaceEdge[] = [];
  for (let i = 0; i < slugs.length; i++) {
    for (let j = i + 1; j < slugs.length; j++) {
      const a = vectors.get(slugs[i])!;
      const b = vectors.get(slugs[j])!;
      const sim = cosine(a, b);
      if (sim < MIN_EDGE_SIMILARITY) continue;
      const shared = [...a.entries()]
        .filter(([term]) => b.has(term))
        .map(([term, w]) => [term, w * b.get(term)!] as const)
        .sort((x, y) => y[1] - x[1])
        .slice(0, SHARED_TERMS_PER_EDGE)
        .map(([term]) => term);
      candidates.push({ source: slugs[i], target: slugs[j], weight: sim, shared });
    }
  }

  candidates.sort((a, b) => b.weight - a.weight);
  const degree = new Map<string, number>();
  const edges: WorkspaceEdge[] = [];
  for (const e of candidates) {
    const ds = degree.get(e.source) ?? 0;
    const dt = degree.get(e.target) ?? 0;
    if (ds >= MAX_EDGES_PER_NODE && dt >= MAX_EDGES_PER_NODE) continue;
    edges.push(e);
    degree.set(e.source, ds + 1);
    degree.set(e.target, dt + 1);
  }

  return { nodes, edges };
}
