# Corpus

**Portable, vendor-neutral memory for AI agents.** Every AI tool is a goldfish — start a
new session and you re-explain your codebase, decisions, and preferences, burning tokens
(money) to repeat yourself. Corpus is a shared memory layer exposed as an **MCP server**:
instead of re-reading a 175k-token history, an agent calls `corpus_recall` and gets back
only the ~300 relevant tokens.

## How it works

**Capture → Compress → Store (graph + vectors) → Recall.**

Two MCP tools, usable from any MCP client (Claude Code, Cursor, …):

- **`corpus_recall(query)`** — embeds the query, finds the most similar memory nodes via
  pgvector, expands one hop along the graph, and returns a compact markdown slice. Fires a
  Realtime event so the dashboard graph glows the recalled cluster and the token counter drops.
- **`corpus_remember(session_text)`** — Claude compresses the session into structured memory
  (decisions, bugs, files, preferences, tasks) as graph nodes + edges, embeds them, and saves
  them to the team's shared workspace. New nodes appear in the graph live.

Memory is a **graph**, not a flat file: decisions connect to the bugs they cause and the files
they touch, so recall follows real relationships instead of dumping everything.

## Architecture

- `mcp-server/` — Node + TypeScript MCP server (stdio). Degrades gracefully: no Supabase →
  local seed graph; no OpenAI → keyword recall; no Anthropic → heuristic compression.
- `frontend/` — Next.js + Auth0 dashboard. `react-force-graph-2d` renders the memory graph;
  Supabase Realtime makes it glow on recall and grow on remember. The token-savings panel is
  the hero visual.
- `supabase/schema.sql` — Postgres + pgvector: `nodes`, `edges`, `sessions`, `recall_events`,
  and a `match_nodes` similarity RPC.

## Setup

1. **Supabase**: create a project, run `supabase/schema.sql` in the SQL editor.
2. **MCP server env** — `cp mcp-server/.env.example mcp-server/.env` and fill in:
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY` (embeddings — optional, keyword fallback otherwise)
   - `ANTHROPIC_API_KEY` (compression — optional, heuristic fallback otherwise)
3. `cd mcp-server && npm install && npm run seed` — populate the demo graph + embeddings.
4. **Frontend env** — add to `frontend/.env.local` (alongside the Auth0 keys):
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (server API routes)
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (browser Realtime)
5. `cd frontend && npm install && npm run dev` → open `/workflow`.
6. **Claude Code**: `.mcp.json` at the repo root registers the `corpus` server. Run Claude Code
   from this directory and approve it.

### Quick local checks (no keys needed)

```bash
cd mcp-server
npm run recall -- "fix the stripe webhook 401"   # prints the recalled cluster + savings
npm run remember                                  # compresses a sample session
npx tsx src/scripts/smoke.ts                       # exercises the MCP server over stdio
```

## Install anywhere (any machine, any user, any MCP tool)

The server is a self-contained npm package (`mcp-server/`). Once published, anyone can add
Corpus to their own project without cloning this repo.

**Publish (one time, from `mcp-server/`):**
```bash
cd mcp-server
npm run build           # compiles TypeScript → dist/
npm login               # your npm account
npm publish --access public   # if the name is taken, use a scoped name in package.json, e.g. @you/corpus-mcp
```

**Then anyone installs it with one command** — no repo, no local paths:
```bash
claude mcp add corpus -s user \
  --env CORPUS_WORKSPACE=my-project \
  --env SUPABASE_URL=... --env SUPABASE_SERVICE_ROLE_KEY=... \
  --env OPENAI_API_KEY=... --env ANTHROPIC_API_KEY=... \
  -- npx -y corpus-mcp-server
```

**Any other MCP client** (Cursor, Windsurf, Claude Desktop) uses the same package via the
standard config — this is the vendor-neutral part:
```json
{
  "mcpServers": {
    "corpus": {
      "command": "npx",
      "args": ["-y", "corpus-mcp-server"],
      "env": {
        "CORPUS_WORKSPACE": "my-project",
        "SUPABASE_URL": "...",
        "SUPABASE_SERVICE_ROLE_KEY": "...",
        "OPENAI_API_KEY": "...",
        "ANTHROPIC_API_KEY": "..."
      }
    }
  }
}
```

Each user/project sets its own `CORPUS_WORKSPACE`. **A whole team shares one brain by pointing
at the same Supabase project + workspace id** — that's the shared-memory story. With no env at
all, the server still runs on the bundled demo graph (keyword recall), so `npx -y corpus-mcp-server`
works out of the box for a quick try.

> Zero-publish alternative for a demo: `npm pack` in `mcp-server/` produces a `.tgz` others can
> install with `npm i -g ./corpus-mcp-server-0.1.0.tgz`, then `claude mcp add corpus -- corpus-mcp`.

## Demo script (5 min)

1. **Hook**: "AI forgets everything when you switch tabs. You pay to re-explain yourself."
2. Show the `/workflow` graph — a real project's memory, pre-seeded.
3. In Claude Code (fresh session), ask a scoped question. The agent calls `corpus_recall` →
   the graph glows the webhook/payments cluster and the counter shows **~300 vs 175,000 tokens
   (99.8% saved)**.
4. Do work; at the end call `corpus_remember` → a new node appears in the graph live.
5. Talking points: same MCP works in Cursor/Gemini (portable); workspaces are team-shared;
   the engrams are living documentation of every decision.
