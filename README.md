# Corpus

Portable, vendor-neutral project memory for AI agents. Corpus stores status, decisions,
session notes, and handoffs as Markdown so Claude Code, Codex, Gemini CLI, other MCP
clients, teammates, and humans can share the same context.

Corpus is local-first: the MCP server needs no API key, database, or network connection.
Supabase adds shared team workspaces, and Graphify adds structural code search.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the design and
[REQUIREMENTS.md](REQUIREMENTS.md) for complete setup and troubleshooting.

## What it provides

Five MCP tools:

- `corpus_load` loads current status, decisions, and next steps.
- `corpus_init` seeds new memory from an existing Graphify code graph.
- `corpus_log` records an edit, bug fix, discovery, or decision immediately.
- `corpus_save` writes a concrete handoff for the next session.
- `codebase_search` answers structural code questions from the local graph.

Memory is stored in `~/.corpus/<project>/` by default. In team mode, the same documents
are stored in a Supabase workspace shared by its ID.

## Install

Requirements: Node.js 18 or newer and an MCP-capable client.

```bash
git clone https://github.com/Rahbir1518/Corpus.git
cd Corpus/mcp-server-2
npm install
npm link
```

`npm install` builds the TypeScript server; `npm link` makes the `corpus-*` commands
available globally. Then enable Corpus in each project that should use it:

```bash
cd /path/to/your-project
corpus-setup
```

`corpus-setup` is idempotent. It:

1. Registers the server for Claude Code, Gemini CLI, and Codex CLI.
2. Adds marker-guarded agent instructions and hooks.
3. Builds a code graph when Graphify is installed.
4. Uses local memory, or creates/reuses a Supabase workspace when team mode is configured.

Restart the agent after setup and approve the `corpus` MCP server if prompted. MCP
wiring is per project, even though the `corpus-*` commands are global.

> Client configs contain an OS-specific launch command. Each teammate should run
> `corpus-setup` once in their own clone, especially when the team mixes Windows and
> macOS/Linux.

## Use

Work normally. Corpus's generated instructions tell compatible agents when to load,
log, query, and save memory. For a simple handoff:

1. Finish a session with “save state”.
2. Inspect `~/.corpus/<project>/state.md` if using local mode.
3. Start a fresh session in any configured client and say “continue where we left off”.

Useful commands:

| Command | Purpose |
|---|---|
| `corpus-setup` | Configure this project; create or reuse a workspace when applicable. |
| `corpus-connect <id>` | Configure this project and join an existing team workspace. |
| `corpus-status` | Diagnose client wiring, storage mode, workspace, and graph state. |
| `corpus-ls` | List workspace IDs known to this machine. |
| `corpus-disconnect` | Leave the workspace; memory stays OFF until setup or reconnect. |
| `corpus-uninstall --dry-run` | Preview removal of Corpus from this project. |
| `corpus-uninstall` | Remove project wiring and instructions; keep memory and graph. |

`corpus-uninstall --memory` also removes local memory, and `--graph` also removes the
local code graph. Shared workspace documents are never deleted by uninstall.

## Optional features

### Structural code search

```bash
python -m pip install graphifyy
```

The package name has two `y`s; it installs the `graphify` command. Re-run
`corpus-setup` after installation. If the command is not on `PATH`, set `GRAPHIFY_PATH`
to its full path. Memory and handoffs work without Graphify.

### Shared team memory

1. Apply [supabase/schema.sql](supabase/schema.sql) to a Supabase project.
2. Copy `mcp-server-2/.env.local.example` to `mcp-server-2/.env.local`.
3. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
4. Run `corpus-setup` to create a workspace, or `corpus-connect <id>` to join one.

Treat workspace IDs and the service-role key as credentials. A project connected to a
workspace never silently falls back to local memory: if the workspace is unreachable,
memory is OFF to prevent divergent copies.

### Dashboard

The optional Next.js dashboard requires Node.js 20.9 or newer:

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Open <http://localhost:3000>. Without Supabase configuration it displays seed data.

## Verify development builds

```bash
cd mcp-server-2
npm run build
npm run smoke
```

`npm run smoke:all` also covers connected workspace behavior and uninstall. Run
`npm run build` after changing `mcp-server-2/src/`, then restart the agent because MCP
clients load the compiled server and tool descriptions at startup.

## Repository layout

- `mcp-server-2/` — TypeScript MCP server and global CLI commands.
- `frontend/` — optional Next.js dashboard.
- `supabase/` — current schema and migration SQL.
- `ARCHITECTURE.md` — design source of truth.
- `REQUIREMENTS.md` — setup, configuration, verification, and troubleshooting.
