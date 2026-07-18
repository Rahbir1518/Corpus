# Corpus

**Portable, vendor-neutral memory for AI agents.** Every AI tool is a goldfish — start a
new session and you re-explain your codebase, decisions, and preferences, burning tokens
(money) to repeat yourself. And every vendor's fix (compaction, memory features) is locked
to their own tool. Corpus keeps project memory as **markdown documents** — written *during*
the session, fetched only when needed, readable by any agent (Claude Code, Codex, Cursor,
Gemini), any teammate, and any human.

**Design source of truth: [ARCHITECTURE.md](ARCHITECTURE.md).** If a decision isn't in that
file, it hasn't been made.

## How it works

Four MCP tools, usable from any MCP client:

- **`corpus_load`** — fetch the project's memory (status, decisions + reasons, next steps)
  at session start or on "continue where we left off". Costs nothing until called — memory
  as tools, not prompt-stuffing.
- **`corpus_log`** — one ledger line after each edit / bugfix / decision, *during* the
  session. Crash-safe, never stale — this is the difference from checkpoint-based tools.
- **`corpus_save`** — structured save-state for handoffs: any tool, any teammate, any time.
  Vague saves (no file/function references) are rejected at the schema level.
- **`codebase_search`** — natural-language questions about code structure, answered from
  a [Graphify](https://github.com/safishamsi/graphify) graph in ~2K tokens instead of a
  40K-token grep-and-read spiral.

## Layout

- **[mcp-server-2/](mcp-server-2/)** — the MCP server (the one thing a user installs).
  Zero-config local mode (`~/.corpus/<project>/`), Supabase team mode via two env vars.
  Setup, usage, and handoff-testing instructions: [mcp-server-2/README.md](mcp-server-2/README.md).
- **[frontend/](frontend/)** — Next.js + Auth0 dashboard: browse projects → their
  documentation pages, token-savings counter, graph views.
- **[supabase/](supabase/)** — SQL for the documentation DB ([documents.sql](supabase/documents.sql)).
- **[REQUIREMENTS.md](REQUIREMENTS.md)** — prerequisites, env var reference, verification
  steps, troubleshooting. Start here if you are setting up on a new machine.

> v1 (`mcp-server/` — embeddings + pgvector graph recall) was removed on 2026-07-18;
> recover from git history if needed. Its `corpus_status` health-check tool is worth
> reintroducing in v2 (roadmap).

## Quick start

Needs **Node ≥ 18** and any MCP client. No keys, no database, no network.

```bash
cd mcp-server-2
npm install    # auto-builds via the prepare hook
npm link       # puts `corpus-setup` on your PATH

cd your-project
corpus-setup   # registers the MCP server + installs agent instructions (idempotent)
```

Then start your agent in that project and work normally. Say **"save state"** before you
stop; say **"continue where the last session left off"** in any tool, any time later.

> **Scope:** the commands are global (PATH), but MCP wiring is **per-directory** — an
> agent only sees Corpus if its session is opened in a directory `corpus-setup` ran in.
> Commit the generated configs to share the setup with teammates. `corpus-ls` shows every
> workspace your machine has access to, from anywhere.

Verify it works — `npm run smoke` in `mcp-server-2/` drives the full loop over real stdio,
then read the memory yourself at `~/.corpus/<project>/state.md`. It is plain markdown.

**Optional extras** — each degrades gracefully if skipped:

- **Code queries:** `python -m pip install graphifyy` (two ys).
- **Team mode:** run [supabase/documents.sql](supabase/documents.sql), then set
  `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in `mcp-server-2/.env.local`. Teammates
  point at the same DB and `CORPUS_PROJECT`.
- **Dashboard:** `cd frontend && npm install && npm run dev` (Node ≥ 20.9).

**Full prerequisites, every env var, and troubleshooting: [REQUIREMENTS.md](REQUIREMENTS.md).**

## Demo script (5 min)

1. **Hook**: "AI forgets everything between sessions — and every vendor's fix is locked to
   their tool. You pay to re-explain yourself, in tokens and in time."
2. Session 1 (Claude Code) works on a real feature; `corpus_log` entries stream into the
   ledger as it works. "Save state." Kill the session on purpose.
3. Session 2 (**a different vendor's tool**): "continue where the last session left off" —
   it continues mid-thought. Same memory, different brain.
4. Dashboard: the documentation the sessions wrote, browsable per project; the token
   counter showing **measured** with/without savings (real transcript totals, not estimates).
5. Close: "The memory is plain markdown. Read it, edit it, export it to Gitbook or Notion.
   No blackbox — and no lock-in, because vendors will never build the thing that kills it."
