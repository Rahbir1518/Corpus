# Requirements & setup

Everything needed to run Corpus on a fresh machine. **Only the first section is required**
— the MCP server works with no keys, no network, and no database. Supabase, Auth0, and the
dashboard are additive.

Design source of truth: [ARCHITECTURE.md](ARCHITECTURE.md).

## Prerequisites

| Component | Needed for | Notes |
|---|---|---|
| **Node.js ≥ 18** | MCP server | `engines` in `mcp-server-2/package.json`. Verified on 24.x. |
| **Node.js ≥ 20.9** | Dashboard | Next.js 16 requirement. If you only run the server, 18 is fine. |
| **An MCP client** | Using Corpus | Claude Code, Cursor, Codex, or any MCP-capable agent. |
| Python 3.9+ + `graphifyy` | `corpus_code_query` | Optional. Without it, the other three tools work and code queries return a fallback message. |
| Supabase project | Team mode, dashboard | Optional. Without it the server uses `~/.corpus/<project>/`. |
| Auth0 tenant | Dashboard login | Optional, dashboard only. |

## 1. MCP server (required)

```bash
git clone <repo> && cd Corpus/mcp-server-2
npm install        # auto-builds via the prepare hook
npm link           # puts `corpus-setup` and `corpus-mcp-v2` on your PATH

cd /path/to/any-project-you-want-memory-in
corpus-setup
```

`corpus-setup` is idempotent — safe to re-run after pulling changes. It:

1. Merges a `corpus` entry into that project's `.mcp.json` (never overwrites the file).
2. Installs a marker-guarded instruction block into **both** `CLAUDE.md` and `AGENTS.md`,
   creating either if absent, so agents log/save/query without being asked each session.
3. Builds the code graph if Graphify is installed.

Then start your agent in that project and approve the `corpus` server.

> **After changing server source, run `npm run build`.** `.mcp.json` points at `dist/`, so
> edits to `src/` have no effect until compiled. Restart the agent to reload tool
> descriptions.

### Verify

```bash
cd mcp-server-2
npm run smoke      # spawns the server over real stdio, runs load → log → save
```

Expected: the run completes and prints the state document. Then check the memory as a
human — it is plain markdown, that is the point:

```bash
cat ~/.corpus/<project-folder-name>/state.md
```

## 2. Code queries (optional)

```bash
python -m pip install graphifyy    # note: two ys — installs the `graphify` command
```

The graph is built by `corpus-setup`, and rebuilt once per server process on the first
query, so it is never older than the session using it. Extraction is tree-sitter:
deterministic, seconds, **zero tokens, no API key, no LLM**.

**Windows PATH gotcha:** pip drops `graphify.exe` in Python's `Scripts` dir, which is
usually not on PATH — and `python` itself is often shadowed by the Microsoft Store alias
stub. The server probes `%LOCALAPPDATA%\Python\*\Scripts\` and
`%LOCALAPPDATA%\Programs\Python\*\Scripts\` to find it anyway. If your install lives
elsewhere, set `GRAPHIFY_PATH` to the full `.exe` path.

Verify:

```bash
graphify --help                      # or the full path from above
graphify query "what calls X" --budget 2000
```

## 3. Team mode — Supabase (optional)

1. Run [supabase/documents.sql](supabase/documents.sql) in the Supabase SQL editor. It
   creates `documents (project, name, content, updated_at)` keyed on `(project, name)`.
   Uncomment the last line to enable Realtime for the dashboard.
2. Give the server credentials, **either**:
   - `mcp-server-2/.env.local` (git-ignored, loaded by [store.ts:17-28](mcp-server-2/src/store.ts#L17-L28)) — preferred, keeps keys out of a tracked `.mcp.json`; **or**
   - the `env` block of the project's `.mcp.json`.

   Real environment variables win over `.env.local` on conflict.
3. Teammates point at the same DB with the same `CORPUS_PROJECT` value.

On startup the server logs its mode to stderr:
`[corpus-v2] ready · project="..." · store=supabase|local`. That line is the fastest way
to confirm which backend you actually got.

## 4. Dashboard (optional)

```bash
cd frontend
npm install
cp .env.local.example .env.local   # then fill in — see the table below
npm run dev                        # http://localhost:3000
```

Without Supabase env the dashboard falls back to seed graph data, so it renders but does
not show real memory.

## Environment variables

Complete list, as actually read by the code — nothing here is aspirational.

### MCP server (`mcp-server-2`)

| Var | Required | Purpose |
|---|---|---|
| `SUPABASE_URL` | Team mode only | Enables the Supabase store. Both this and the key must be set. |
| `SUPABASE_SERVICE_ROLE_KEY` | Team mode only | Service role key. Server-side only — never expose to a browser. |
| `CORPUS_PROJECT` | No | Project id. Defaults to the working directory's folder name. Set explicitly so teammates on differently-named clones share one memory. |
| `CORPUS_AGENT` | No | Label in the session ledger, e.g. `claude-code`. Useful for showing cross-tool handoffs. |
| `GRAPHIFY_PATH` | No | Full path to the `graphify` binary when auto-detection fails. |

### Dashboard (`frontend/.env.local`)

| Var | Required | Purpose |
|---|---|---|
| `SUPABASE_URL` | For real data | Server-side reads. |
| `SUPABASE_SERVICE_ROLE_KEY` | For real data | Server-side reads. |
| `NEXT_PUBLIC_SUPABASE_URL` | For Realtime | Browser client — anon-safe. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | For Realtime | Browser client — anon key, **not** the service role key. |
| `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_SECRET`, `APP_BASE_URL` | For login | Read by the Auth0 SDK. `AUTH0_SECRET`: `openssl rand -hex 32`. `APP_BASE_URL` is `http://localhost:3000` in dev. |

## Troubleshooting

**Tools don't appear in the agent.** Confirm the `corpus` entry in the project's
`.mcp.json` points at an existing `dist/index.js`, and that you approved the server when
prompted. `npm link` must have run in `mcp-server-2`.

**Changes to tool behavior don't take.** `npm run build`, then restart the agent — tool
descriptions are read once at connect time.

**Store says `local` when you configured Supabase.** Both `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` must be set; one alone silently falls back. Check the stderr
startup line.

**Code queries return "Graphify is not installed here."** See §2 — usually the Windows
PATH issue. Set `GRAPHIFY_PATH`.

**Two sessions aren't sharing memory.** They resolved different project ids. Folder name
is the default; set `CORPUS_PROJECT` explicitly on both.

**Stale `mcp-server-2/.env.local`.** Clones carrying a v1-era file may list
`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `CORPUS_WORKSPACE`, `EMBEDDING_MODEL`, or
`CLAUDE_MODEL`. **v2 reads none of these** — it makes no LLM calls at all. Only the five
vars in the table above have any effect; the rest are inert and safe to delete.
