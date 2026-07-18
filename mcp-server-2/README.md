# Corpus v2 — MCP server

Markdown-first, cross-session, cross-tool project memory for AI agents. The calling model
writes the memory; this server validates, merges, and stores it as markdown documents —
in the documentation DB (team mode) or `~/.corpus/<project>/` (local mode, zero config).
The target repo is never written to, except by the explicit `corpus-setup` command below.

Design source of truth: [../ARCHITECTURE.md](../ARCHITECTURE.md).

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

`corpus-setup` does two things (idempotent — safe to re-run):

1. Registers the `corpus` MCP server in the project's `.mcp.json` (merged, never overwritten).
2. Installs a marker-guarded instruction block into `CLAUDE.md` (created if missing) and
   `AGENTS.md` (only if it already exists), so agents log and save **proactively** —
   no per-session prompting needed.

Then start your agent (Claude Code, Cursor, Codex — any MCP client) in that project and
approve the `corpus` server. That's the whole install.

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
- **Team (Supabase):** set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the server's
  `env` in `.mcp.json`. Same documents, shared workspace, dashboard-browsable.
  Requires a `documents` table: `(project text, name text, content text,
  updated_at timestamptz, primary key (project, name))`.

Optional env: `CORPUS_PROJECT` (project id; defaults to the working directory's folder
name), `CORPUS_AGENT` (label used in the session ledger, e.g. `claude-code`).

## Try the handoff (no keys, no network)

1. Session 1: give your agent a small task, then say **"save state"**.
2. Inspect the memory yourself: `~/.corpus/<project>/state.md` — plain markdown.
3. Session 2 (any tool, fresh context): say **"continue where the last session left off"**.

## Dev

```bash
npm run build    # tsc → dist/
npm run smoke    # end-to-end test over real stdio (spawns the server, runs the full loop)
```
