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
| Python 3.9+ + `graphifyy` | `codebase_search` | Optional. Without it, the other three tools work and code queries return a fallback message. |
| Supabase project | Team mode, dashboard | Optional. Without it the server uses `~/.corpus/<project>/`. |
| Auth0 tenant | Dashboard login | Optional, dashboard only. |

## 1. MCP server (required)

**One-command install** — handles the clone, `npm install`, `npm link`, and the optional
Graphify install (§2) in one go; idempotent, re-run to update:

```powershell
# Windows
powershell -ExecutionPolicy Bypass -c "irm https://raw.githubusercontent.com/Rahbir1518/Corpus/main/install.ps1 | iex"
```

```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/Rahbir1518/Corpus/main/install.sh | bash
```

From an existing clone, `.\install.ps1` / `./install.sh` does the same. What it runs,
if you'd rather do it by hand:

```bash
git clone https://github.com/Rahbir1518/Corpus.git && cd Corpus/mcp-server-2
npm install        # auto-builds via the prepare hook
npm link           # puts `corpus-setup` and `corpus-mcp-v2` on your PATH
python -m pip install graphifyy   # optional — see §2
```

Either way, the one step no installer can do for you (wiring is per-directory):

```bash
cd /path/to/any-project-you-want-memory-in
corpus-setup
```

`corpus-setup` is idempotent — safe to re-run after pulling changes. It:

1. Merges a `corpus` entry into that project's `.mcp.json` (never overwrites the file).
2. Installs a marker-guarded instruction block into **both** `CLAUDE.md` and `AGENTS.md`,
   creating either if absent, so agents log/save/query without being asked each session.
3. Builds the code graph if Graphify is installed.

Then start your agent in that project and approve the `corpus` server.

### Where Corpus is active — per-directory, by design

The two halves of an install have different scope, and conflating them is the #1
source of "where did my tools go":

- **The commands** (`corpus-setup`, `corpus-connect`, `corpus-ls`, …) are global —
  `npm link` puts them on your PATH once per machine, runnable from anywhere.
- **The MCP wiring is per-directory.** Agents discover MCP servers from config files in
  the directory a session is *opened* in — `.mcp.json` (Claude Code),
  `.gemini/settings.json`, `.codex/config.toml`. A terminal sitting in another directory
  is irrelevant; what matters is where the agent session is rooted. Open Claude Code in a
  directory without these files and Corpus simply isn't there.

So: run `corpus-setup` once **per project**. Commit the generated configs — that is how
teammates get the server (their agent offers to enable it on first open). To see every
workspace your machine holds an id for, regardless of the directory you're in, run
`corpus-ls`.

> Optional: to have the corpus tools in *every* directory, register the server at user
> scope too — `claude mcp add --scope user corpus corpus-mcp-v2` (Gemini:
> `~/.gemini/settings.json`; Codex: `~/.codex/config.toml`). Project configs win where
> both exist; everywhere else you get private local memory.

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

1. Run [supabase/schema.sql](supabase/schema.sql) in the Supabase SQL editor. It creates
   `workspaces`, `workspace_members`, `documents` (keyed by `(workspace_id, name)`, so
   repos with the same folder name can never overwrite each other), and `usage_events`.
   **Existing DBs** whose `documents` is still keyed by project slug: run
   [supabase/migrate-documents-to-workspace-id.sql](supabase/migrate-documents-to-workspace-id.sql)
   once instead — a single transaction that backfills and aborts on any collision — then
   restart sessions. The server detects either schema at runtime and nags until migrated
   (`corpus-status` shows which one you're on).
2. Give the server credentials, **either**:
   - `mcp-server-2/.env.local` (git-ignored, loaded by [store.ts:17-28](mcp-server-2/src/store.ts#L17-L28)) — preferred, keeps keys out of a tracked `.mcp.json`; **or**
   - the `env` block of the project's `.mcp.json`.

   Real environment variables win over `.env.local` on conflict.
3. Teammates join with `corpus-connect <workspace-id>` — the id `corpus-setup` printed
   (recover it anytime with `corpus-ls`).

On startup the server logs its mode to stderr:
`[corpus-v2] ready · project="..." · store=supabase|local|disconnected`. That line is the
fastest way to confirm which backend you actually got. `disconnected` means the repo
points at a workspace it can't reach (not connected, malformed id, or missing
credentials) — memory is OFF until `corpus-connect <id>` / `corpus-setup`, never a
silent local fallback.

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

**Tools don't appear in the agent.** Confirm the session was opened in the directory
that holds the `corpus` entry in `.mcp.json` (wiring is per-directory), that `npm link`
ran in `mcp-server-2` (the entry runs the `corpus-mcp-v2` command from PATH), and that
you approved the server when prompted.

**Changes to tool behavior don't take.** `npm run build`, then restart the agent — tool
descriptions are read once at connect time.

**Store says `disconnected` when you configured Supabase.** Credentials alone are not
enough — the repo must also be connected to a workspace (`corpus-connect <id>` or
`corpus-setup`). Run `corpus-status` for the exact reason and fix, `corpus-ls` for the
workspace ids you already have access to.

**Tools exist in one directory but not another.** That's the per-directory wiring —
see "Where Corpus is active" above. Run `corpus-setup` in the other project, or register
the server at user scope.

**Code queries return "Graphify is not installed here."** See §2 — usually the Windows
PATH issue. Set `GRAPHIFY_PATH`.

**Two sessions aren't sharing memory.** They're connected to different workspaces — run
`corpus-status` in both repos and `corpus-connect` them to the same id (`corpus-ls`
lists the ids you hold). On a pre-migration DB (slug-keyed documents), also make sure
both resolve the same `CORPUS_PROJECT` — there, the project string is the key.

**Stale `mcp-server-2/.env.local`.** Clones carrying a v1-era file may list
`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `CORPUS_WORKSPACE`, `EMBEDDING_MODEL`, or
`CLAUDE_MODEL`. **v2 reads none of these** — it makes no LLM calls at all. Only the five
vars in the table above have any effect; the rest are inert and safe to delete.
