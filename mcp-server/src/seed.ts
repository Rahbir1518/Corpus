import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { Graph, CorpusNode, CorpusEdge } from "./types.js";

interface SeedFile {
  workspace: { id: string; name: string };
  sessions: { id: string; title: string; raw_token_count: number; engram_token_count: number }[];
  nodes: CorpusNode[];
  edges: CorpusEdge[];
}

const EMPTY_SEED: SeedFile = {
  workspace: { id: "demo", name: "Empty workspace" },
  sessions: [],
  nodes: [],
  edges: [],
};

// Resolve the bundled demo graph. Works both in dev (src/) and when published
// (dist/), and degrades to an empty workspace if no seed ships with the install.
function findSeed(): string | null {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(here, "../data/seed.json"), // bundled next to src/ or dist/
    resolve(here, "../../frontend/data/seed.json"), // monorepo dev convenience
  ];
  return candidates.find(existsSync) ?? null;
}

export function loadSeed(): SeedFile {
  const path = findSeed();
  return path ? (JSON.parse(readFileSync(path, "utf8")) as SeedFile) : EMPTY_SEED;
}

export function seedGraph(): Graph {
  const s = loadSeed();
  return { nodes: s.nodes, edges: s.edges };
}

// Sum of raw session sizes in the seed — the "full history" baseline.
export function seedRawTokens(): number {
  return loadSeed().sessions.reduce((sum, s) => sum + (s.raw_token_count ?? 0), 0);
}
