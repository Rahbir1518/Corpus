# Corpus v2 — MCP server

Markdown-first, cross-session, cross-tool project memory for AI agents. The calling model
writes the memory; this server validates, merges, and stores it as markdown documents —
in the documentation DB (team mode) or `~/.corpus/<project>/` (local mode, zero config).
The target repo is never written to, except by the explicit `corpus-setup` command below.

Design source of truth: [../ARCHITECTURE.md](../ARCHITECTURE.md).

Requires **Node ≥ 18**. Full prerequisites and env reference: [../REQUIREMENTS.md](../REQUIREMENTS.md).

## Setup

Once per machine — the installer at the repo root does the clone/`npm install`/
`npm link`/Graphify dance in one command ([../README.md](../README.md#quick-start) has
the copy-paste one-liners):

```powershell
powershell -ExecutionPolicy Bypass -c "irm https://raw.githubusercontent.com/Rahbir1518/Corpus/main/install.ps1 | iex"   # Windows
```
```bash
curl -fsSL https://raw.githubusercontent.com/Rahbir1518/Corpus/main/install.sh | bash   # macOS / Linux
```

Then once per project:

```bash
# from THE PROJECT YOU WANT MEMORY IN:
corpus-setup
```

Graphify is only required for `codebase_search`; the memory and handoff tools work without
it. The Python package is named `graphifyy`, but it installs the `graphify` command.
`corpus-setup` builds the code graph automatically if Graphify is installed (finding it even
when pip's Scripts dir isn't on PATH; `GRAPHIFY_PATH` overrides). If the graph is missing at
query time, the server builds it once automatically (`graphify update .` — tree-sitter, no
LLM, seconds); if Graphify itself is missing, code queries return a fallback message instead
of stopping the server.

`corpus-setup` does three things (idempotent — safe to re-run):

1. Registers the `corpus` MCP server with **every supported client**. Each reads a different
   file in a different format, so all three are written; existing entries are merged, never
   overwritten:

   | Client | File | Format | Key |
   |---|---|---|---|
   | Claude Code | `.mcp.json` | JSON | `mcpServers` |
   | Gemini CLI | `.gemini/settings.json` | JSON | `mcpServers` |
   | Codex CLI | `.codex/config.toml` | TOML | `mcp_servers` |

   Each entry sets `CORPUS_AGENT` to the client's name, so the session ledger records which
   tool wrote which memory. All three point at the same store — start a task in Claude Code,
   pick it up in Codex.

2. Installs a marker-guarded instruction block into **both** `CLAUDE.md` and `AGENTS.md`,
   creating either if absent, so agents log, save, and query the code graph
   **proactively** — no per-session prompting needed. `AGENTS.md` is the cross-tool
   convention (Cursor, Codex, Copilot, Zed); Corpus is cross-tool memory, so the standing
   instructions have to land for agents that never read `CLAUDE.md`.
3. Builds the code graph, if Graphify is installed.

Then start your agent in that project and approve the `corpus` server. That's the whole
install. Verify with `/mcp` in Claude Code or Codex, `/mcp list` in Gemini CLI.

> **Scope — read this once and the setup model makes sense.** `npm link` makes the
> *commands* global (runnable from any terminal), but MCP *wiring* is per-directory:
> agents only discover servers from config files in the directory a session is opened
> in. A session opened in an un-setup directory has no Corpus, no matter what any
> terminal's cwd is. Run `corpus-setup` per project; commit the configs so teammates'
> agents pick the server up automatically. `corpus-ls` lists every workspace this
> machine has access to, from anywhere.

## Commands (global, from `npm link`)

| Command | Does |
|---|---|
| `corpus-setup` | Per-project install: creates a workspace, wires all three clients, installs instruction blocks, builds the graph. Idempotent. |
| `corpus-connect <id>` | Joins a workspace someone shared with you (writes the id to every wired client). |
| `corpus-disconnect` | Leaves ALL workspaces — memory is OFF until you connect/setup again. Deletes nothing. |
| `corpus-status` | Read-only diagnostic for the current directory: wiring, workspace, store reachability, graph. |
| `corpus-ls` | Every workspace this machine has access to — created by you or shared with you — and which is wired here. |
| `corpus-hook` | Not run by hand — client hook systems invoke it (see Hooks below). |

## Hooks (installed by `corpus-setup`)

Instruction files advocate for the tools at session start; hooks advocate **at the
moment of decision**. `corpus-setup` installs both:

| Client | Event | What fires |
|---|---|---|
| Claude Code | `SessionStart` | Injects the memory brief (local `state.md` excerpt, or a `corpus_load` pointer) before the first turn — no tool call needed. |
| Claude Code | `PreToolUse` (`Grep\|Glob\|Read`) | **Denies** the session's first raw search and redirects to `codebase_search`. Retry is always allowed; every later search is allowed. |
| Claude Code | `PostToolUse` (edits / corpus tools) | Silently tracks which files changed and whether they were logged. No stdout, so zero tokens. |
| Claude Code | `Stop` | If the session edited files and never called `corpus_log`, **blocks the turn once** and asks for it. |
| Gemini CLI | `BeforeTool` | Same first-search redirect (best-effort — schema newer than Claude's). |
| Codex CLI | `PreToolUse` | Same, before shell calls (best-effort; same trust gate as `.codex/config.toml`). |
| Antigravity | — | No hook system; gets the standing-instruction block as `.agents/rules/corpus.md`. |

**Why deny instead of remind.** An advisory line gets read and ignored — measured, in
this repo's own sessions. A deny cannot be ignored: the call does not happen and the
model must respond to the reason.

**Why this cannot become annoying.** Every blocking path fires **at most once per
session** and then disables itself (state in `~/.corpus/tmp/`, self-cleaning after
48h). The search redirect never fires without a graph present and never fires on a
corpus tool. The Stop check never fires on a turn with no edits, and honors
`stop_hook_active` so a blocked turn can always finish. Set `CORPUS_STRICT=0` to keep
the silent bookkeeping and drop all blocking. Hook failures degrade to silence.

> **Codex and project-scoped config:** Codex reads `.codex/config.toml` only in projects you
> have marked trusted. If `corpus` does not show up under `/mcp`, copy the marker-guarded
> block into `~/.codex/config.toml` instead — it is valid unchanged. Gemini CLI likewise
> accepts `~/.gemini/settings.json` as the global fallback.

> **After editing `src/`, run `npm run build`** — every client config points at `dist/`, so
> source changes are inert until compiled. Restart the agent afterward: tool descriptions are
> read once, at connect time.

## Tools

| Tool | When the model calls it | What it does |
|---|---|---|
| `corpus_load` | Session start; "continue where we left off" | Fetches status, decisions, next steps |
| `corpus_log` | After each edit/bugfix/decision | Appends one ledger line (crash-safety) |
| `corpus_save` | Task done / "save state" / handoff | Structured state dump; vague saves rejected |
| `codebase_search` | Instead of grep/read exploration | Natural-language question → Graphify graph answer |

## Storage modes

- **Local (default, no config):** documents in `~/.corpus/<project>/`. Everything works —
  including full cross-tool handoffs on one machine.
- **Team (Supabase):** set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` — in
  `mcp-server-2/.env.local` (preferred; git-ignored, keeps keys out of a tracked
  `.mcp.json`) or in the server's `env` block in `.mcp.json`. Real env vars win over the
  file. Same documents, shared workspace, dashboard-browsable. Requires the tables from
  [../supabase/schema.sql](../supabase/schema.sql); DBs created before workspace-id
  keying also run [../supabase/migrate-documents-to-workspace-id.sql](../supabase/migrate-documents-to-workspace-id.sql)
  once (the server detects either schema and warns until migrated).
- **Disconnected (memory OFF):** any state where the repo points at a workspace it can't
  reach — after `corpus-disconnect`, with a malformed workspace id, or with a workspace id
  but missing credentials. Memory tools refuse to read or write and say how to fix it
  (`corpus-connect <id>` / `corpus-setup`). There is deliberately no local fallback here:
  it would create a second version of the memory that diverges from the workspace.

Copy [.env.local.example](.env.local.example) to get started. On startup the server logs
which backend it got: `[corpus-v2] ready · project="…" · store=supabase|local|disconnected`.

Optional env: `CORPUS_PROJECT` (project id; defaults to the working directory's folder
name — set it explicitly so differently-named clones share one memory), `CORPUS_AGENT`
(label used in the session ledger, e.g. `claude-code`), `GRAPHIFY_PATH`.

## Try the handoff (no keys, no network)

1. Session 1: give your agent a small task, then say **"save state"**.
2. Inspect the memory yourself: `~/.corpus/<project>/state.md` — plain markdown.
3. Session 2 (any tool, fresh context): say **"continue where the last session left off"**.

## Dev

```bash
npm run build    # tsc → dist/
npm run smoke    # end-to-end test over real stdio (spawns the server, runs the full loop)
```
