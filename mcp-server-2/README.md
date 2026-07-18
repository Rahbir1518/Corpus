# Corpus v2 — MCP server

Markdown-first, cross-session, cross-tool project memory for AI agents. The calling model
writes the memory; this server validates, merges, and stores it as markdown documents —
in the documentation DB (team mode) or `~/.corpus/<project>/` (local mode, zero config).
The target repo is never written to, except by the explicit `corpus-setup` command below.

Design source of truth: [../ARCHITECTURE.md](../ARCHITECTURE.md).

Requires **Node ≥ 18**. Full prerequisites and env reference: [../REQUIREMENTS.md](../REQUIREMENTS.md).

## Setup (per project, one time)

```bash
# clone the repo, then from this directory, once:
npm install        # auto-builds via the prepare hook
npm link           # puts `corpus-setup` and `corpus-mcp-v2` on your PATH

# optional: enable corpus_code_query (package name has two ys)
python -m pip install graphifyy

# then, from THE PROJECT YOU WANT MEMORY IN:
corpus-setup
```

Graphify is only required for `corpus_code_query`; the memory and handoff tools work without
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
| `corpus_code_query` | Instead of grep/read exploration | Natural-language question → Graphify graph answer |

## Storage modes

- **Local (default, no config):** documents in `~/.corpus/<project>/`. Everything works —
  including full cross-tool handoffs on one machine.
- **Team (Supabase):** set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` — in
  `mcp-server-2/.env.local` (preferred; git-ignored, keeps keys out of a tracked
  `.mcp.json`) or in the server's `env` block in `.mcp.json`. Real env vars win over the
  file. Same documents, shared workspace, dashboard-browsable. Requires the `documents`
  table from [../supabase/documents.sql](../supabase/documents.sql).

Copy [.env.local.example](.env.local.example) to get started. Both Supabase vars must be
set — one alone silently falls back to local mode. On startup the server logs which
backend it got: `[corpus-v2] ready · project="…" · store=supabase|local`.

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
