# Requirements and setup

Only the MCP server and an MCP client are required. Local mode uses plain Markdown on
the current machine and needs no keys, database, Python, or network access.

## Prerequisites

| Component | Required for | Requirement |
|---|---|---|
| Node.js | MCP server | 18 or newer |
| MCP client | Using Corpus | Claude Code, Gemini CLI, Codex CLI, or another MCP client |
| Python + `graphifyy` | `codebase_search` and `corpus_init` graph seeding | Optional |
| Supabase | Shared workspaces and live dashboard data | Optional |
| Node.js | Dashboard | 20.9 or newer |
| Auth0 | Dashboard login | Optional; dashboard only |

## MCP server

Install from a clone:

```bash
git clone https://github.com/Rahbir1518/Corpus.git
cd Corpus/mcp-server-2
npm install
npm link
```

This builds `dist/` and links these commands globally:

- `corpus-mcp-v2`
- `corpus-setup`
- `corpus-connect`
- `corpus-disconnect`
- `corpus-status`
- `corpus-ls`
- `corpus-hook` (invoked by installed client hooks, not normally run by hand)
- `corpus-uninstall`

Run setup once in every project that should expose Corpus:

```bash
cd /path/to/project
corpus-setup
```

Setup merges, rather than replaces, existing configuration. It writes the `corpus` MCP
entry to `.mcp.json`, `.gemini/settings.json`, and `.codex/config.toml`; adds guarded
instructions to `CLAUDE.md`, `GEMINI.md`, `AGENTS.md`, and
`.agents/rules/corpus.md`; installs supported client hooks; and builds the graph when
Graphify is available.

Restart the client after setup. Codex only accepts project `.codex/config.toml` in a
trusted project; if necessary, copy the generated marker-guarded block to the user-level
Codex configuration.

### Storage behavior

| Configuration | Result |
|---|---|
| No workspace and no Supabase credentials | Local memory in `~/.corpus/<project>/` |
| Valid workspace plus both Supabase values | Shared workspace memory |
| Workspace without credentials | Memory OFF |
| Credentials without a workspace | Memory OFF |
| Invalid or unreachable workspace | Memory OFF |

Once a project is connected to shared memory, Corpus does not fall back to local storage.
This prevents two copies of the same project memory from diverging. Run `corpus-status`
for the exact state and recovery command.

`corpus-disconnect` removes the workspace binding but leaves Corpus installed. Use
`corpus-connect <id>` to rejoin or `corpus-setup` to create a new workspace.

## Graphify (optional)

```bash
python -m pip install graphifyy
graphify --help
```

The package installs a command named `graphify`. Run `corpus-setup` again to build
`graphify-out/`. The server can also refresh the graph on the first query in a process.

On Windows, pip's `Scripts` directory may not be on `PATH`. Corpus probes common Python
install locations; set `GRAPHIFY_PATH` to the full path of `graphify.exe` if detection
still fails.

Without Graphify, `corpus_load`, `corpus_log`, and `corpus_save` continue to work;
structural queries return a fallback message.

## Shared workspaces (optional)

1. Apply [supabase/schema.sql](supabase/schema.sql) in the Supabase SQL editor.
2. Copy `mcp-server-2/.env.local.example` to `mcp-server-2/.env.local`.
3. Set both `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
4. Run `corpus-setup` to create a workspace, or `corpus-connect <workspace-id>` to join
   one shared by a teammate.

Databases created before documents were keyed by workspace ID must apply
[supabase/migrate-documents-to-workspace-id.sql](supabase/migrate-documents-to-workspace-id.sql)
once. `corpus-status` reports whether the migration is needed.

Workspace access currently uses the workspace ID plus the server-side Supabase
service-role credential. Treat both as secrets. Never expose the service-role key to a
browser or commit `.env.local`.

## Dashboard (optional)

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Open <http://localhost:3000>. Without Supabase variables the dashboard uses seed data.

For real data and login, configure the values documented in
`frontend/.env.local.example`. Use a Supabase anon key for
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, never the service-role key.

## Environment variables

### MCP server

| Variable | Required | Purpose |
|---|---|---|
| `SUPABASE_URL` | Team mode | Supabase project URL; must be paired with the service-role key |
| `SUPABASE_SERVICE_ROLE_KEY` | Team mode | Server-side database credential |
| `CORPUS_PROJECT` | No | Project label; defaults to the current directory name |
| `CORPUS_AGENT` | No | Agent label recorded in the session ledger |
| `CORPUS_WORKSPACE` | Managed | Workspace UUID written by setup/connect; do not edit manually |
| `GRAPHIFY_PATH` | No | Full path to the Graphify executable |
| `CORPUS_STRICT` | No | Set to `0` to disable blocking hooks while retaining bookkeeping |

Real environment variables override `mcp-server-2/.env.local`.

### Dashboard

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Server-side Supabase reads |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side Supabase credential |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser Supabase endpoint |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser-safe anon key for Realtime |
| `AUTH0_DOMAIN` | Auth0 tenant domain |
| `AUTH0_CLIENT_ID` | Auth0 application ID |
| `AUTH0_CLIENT_SECRET` | Auth0 application secret |
| `AUTH0_SECRET` | Session encryption secret |
| `APP_BASE_URL` | Dashboard origin; `http://localhost:3000` in development |

## Verify

```bash
cd mcp-server-2
npm run build
npm run smoke
```

Use `npm run smoke:all` for local, connected-mode, and uninstall coverage. In a configured
project, `corpus-status` verifies client wiring, storage reachability, workspace identity,
and graph availability.

## Troubleshooting

**The tools do not appear.** Run `corpus-status` from the same project directory in which
the agent session starts. Confirm `npm link` completed, restart the client, and approve
the MCP server. On mixed-OS teams, re-run `corpus-setup` locally so the generated launch
command matches the operating system.

**Source changes have no effect.** Run `npm run build` in `mcp-server-2`, then restart the
client. Clients execute `dist/` and cache tool descriptions for the session.

**Memory is OFF.** `corpus-status` explains why. Usually the project needs both Supabase
values, a valid workspace ID, and `corpus-connect <id>`; use `corpus-setup` instead when
creating a new workspace.

**Graph queries fall back to raw exploration.** Install `graphifyy`, check
`graphify --help`, set `GRAPHIFY_PATH` if needed, and re-run `corpus-setup`.

**Remove Corpus from a project.** Preview with `corpus-uninstall --dry-run`, then run
`corpus-uninstall`. Add `--memory` and/or `--graph` only when those local artifacts should
also be deleted. Shared workspace documents are never removed.
