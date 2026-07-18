import { loadSeed } from "../seed.js";
import { embedBatch } from "../embed.js";
import { supabase } from "../store.js";
import { nodeText } from "../tokens.js";
import { hasSupabase, hasOpenAI } from "../config.js";

// Populate Supabase with the demo graph (+ embeddings) so vector recall and
// Realtime work. Safe to re-run. Requires SUPABASE_* env; OpenAI is optional.
if (!hasSupabase()) {
  console.error("No SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY set — nothing to seed.");
  process.exit(1);
}

const db = supabase()!;
const seed = loadSeed();
const ws = seed.workspace.id;

console.log(`Seeding workspace "${ws}" (${seed.nodes.length} nodes, ${seed.edges.length} edges)…`);
if (!hasOpenAI()) console.warn("No OPENAI_API_KEY — nodes will have no embeddings (keyword recall only).");

await db.from("workspaces").upsert({ id: ws, name: seed.workspace.name });

for (const s of seed.sessions) {
  await db.from("sessions").upsert({
    id: s.id,
    workspace_id: ws,
    title: s.title,
    raw_token_count: s.raw_token_count,
    engram_token_count: s.engram_token_count,
  });
}

const embeddings = await embedBatch(seed.nodes.map((n) => nodeText(n)));
const { error: nErr } = await db.from("nodes").upsert(
  seed.nodes.map((n, i) => ({
    id: n.id,
    workspace_id: ws,
    type: n.type,
    title: n.title,
    body: n.body,
    tags: n.tags,
    session_id: n.session_id,
    embedding: embeddings[i],
  })),
);
if (nErr) throw nErr;

const { error: eErr } = await db.from("edges").upsert(
  seed.edges.map((e) => ({ workspace_id: ws, source_id: e.source_id, target_id: e.target_id, rel: e.rel })),
  { onConflict: "source_id,target_id,rel" },
);
if (eErr) throw eErr;

console.log("Seed complete.");
process.exit(0);
