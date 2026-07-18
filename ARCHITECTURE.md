# Corpus — Architecture (source of truth)

> If a decision isn't in this file, it hasn't been made. Update this file when a decision
> changes; don't let it drift from the code.

## Thesis

AI coding agents are goldfish: every session uses tokens and thus    re-pays the cost of understanding the project
(history, decisions, in-flight work) and the codebase (structure, call sites). Existing fixes
are vendor-locked (Claude compaction, ChatGPT memory) or checkpoint-based (Almanac writes
after commits).

Corpus makes project memory a **library of markdown documents in a documentation database**,
written **during** the session, fetched **only when needed**, readable by **any tool or
teammate**, and browsable as real documentation in the dashboard. The repo is never touched.

Three claims, in pitch order:

1. **Memory as tools, not prompt-stuffing.** CLAUDE.md / .cursorrules are loaded into every
   context whether relevant or not — a memory tax on every request. Corpus memory costs zero
   tokens until the model decides it's relevant and calls a tool.
2. **A running ledger, not a checkpoint.** Almanac updates its wiki after sessions/commits.
   Corpus logs during the session (`memory_log`), so the memory is never more than one step
   stale — nothing is lost at a context limit, crash, or closed laptop.
3. **Portable by format.** Markdown is the interchange format — the DB stores markdown
   documents, not proprietary blobs. Claude → Codex → Gemini → teammate is a fetch of the
   same document, and any page exports to Gitbook/Notion/a file in one click. Vendors won't
   build this because it kills lock-in.
4. **Documentation as a byproduct.** The memory IS the project documentation — browsable
   per-project in the dashboard, human-reviewed, no blackbox. You never write docs
   separately; the AI writes them as it works.

## Components

```
┌─ mcp-server-2 (the ONE thing a user installs) ────────────────┐
│  memory_load        fetch relevant doc(s) from the DB          │
│  memory_log         append one decision/change (incremental)   │
│  memory_save        schema-forced state dump → merge into docs │
│  codebase_search  pass-through to bundled Graphify           │
└────────────────────────────────────────────────────────────────┘
                 fetch / upsert (markdown documents)
                      ▼
        Documentation DB (Supabase) — canonical store
        projects → documents (markdown pages) → session ledger
                      ▲
        frontend: browse projects → read/edit their docs,
        token-savings counter, graph views (Realtime)
```

**Storage backends (same tool interface, pluggable store):**
- **Team mode (canonical):** Supabase. Documents are markdown pages keyed by project.
  Teammates' sessions fetch the same brain in real time — no commits, no repo files.
- **Offline fallback (zero config):** documents live in `~/.corpus/<project>/` — the user's
  home dir, NEVER the repo. Same format, same merge logic; syncs up when configured.
- The target repo is read-only to Corpus. No generated files, no commit noise. Export to
  a repo file/Gitbook is an explicit user action, not a side effect.

- **mcp-server-2/** — the server described here. (v1 `mcp-server/` — embeddings + graph
  recall — was removed 2026-07-18; recover from git history if needed. Its pgvector
  relevance-matching idea lives on as a roadmap item; the dashboard force-graph now renders
  from the `documents` table instead.)
- **frontend/** — Next.js dashboard: project browser → documentation pages (view/edit),
  token-savings counter, graph views.
- **supabase/** — SQL for the documentation DB: `schema.sql` (`workspaces`,
  `workspace_members`, `documents`, `usage_events` — see "Sharing & access" below).

## Sharing & access

A **workspace** = one project (1:1 today). `workspaces.id` (uuid) is the opaque,
shareable identifier, and it is the **only** thing that identifies a workspace:
`documents` is keyed by `workspace_id`, and `$CORPUS_WORKSPACE` — written into the
client configs by `corpus-setup`/`corpus-connect` — is what the server resolves.

`workspaces.slug` (`resolveProject()` — repo folder name, or `$CORPUS_PROJECT`) is a
**display label only, and deliberately not unique**. It used to key `documents`, which
meant two unrelated teams both working in a folder called `api` computed the same key
and silently shared one workspace — the second team read, then overwrote, the first
team's memory. Identity must never be derived from a folder name.

### The connect verbs

| Command | Does |
|---|---|
| `corpus-setup` | First-run wiring. **Creates** a workspace, registers all three clients, installs instruction blocks, builds the graph. Re-running reuses an existing id. |
| `corpus-connect <id>` | **Joins** a workspace someone else created. Writes `$CORPUS_WORKSPACE` to every wired client. |
| `corpus-disconnect` | **Detach**, not uninstall. Removes that one env key so memory falls back to `~/.corpus/<slug>`. Never deletes shared documents or membership. |
| `corpus-status` | Read-only diagnostic: wiring, workspace, store reachability, local memory, graph. |

All of them act on every client symmetrically (`clients.ts`). Asymmetry is the bug that
matters: a repo that disconnects Claude Code but not Gemini keeps writing to a workspace
the user believes they left.

Two access concerns that must not be conflated:
- **Repo/code access** — cloning, pushing — is git/GitHub, entirely outside Corpus.
- **Memory access** — who can read/write a workspace's docs. Today this is **bearer
  access: the workspace id is the credential**, and there is no CLI login.
  `workspace_members` gates *dashboard* view/edit via Auth0 (`user_id` = Auth0 `sub`)
  and is written only by the dashboard.

> **Known gap.** The server connects with `SUPABASE_SERVICE_ROLE_KEY`, which bypasses
> RLS, so membership is not consulted on the write path. Recording `user_id` from the
> CLI would produce attribution, not enforcement. Real per-user access control requires
> moving the server off the service-role key onto per-user tokens + RLS policies; that
> is the change that unlocks invites, roles and revocation. Until then, anyone holding a
> workspace id has full read/write to it, with no expiry and no revocation.

`usage_events` is an append-only, best-effort telemetry ledger (no FK — must never
block a tool call) written by every tool call. It backs the dashboard's real
token-savings counter and live activity feed, replacing the old local
keyword-recall simulation.

## Non-negotiable design rules

1. **No fragile triggers.** Nothing depends on hooks firing or limits being detected. Every
   write is an explicit tool call the model (or user) makes. Auto-triggering via harness
   lifecycle hooks is a roadmap slide, not a dependency.
2. **The DB stores markdown documents; the repo stays clean.** The documentation database
   is the canonical store. Corpus never writes into the target repo. Sharing = same
   workspace in the DB; Auth0 gates dashboard access and workspace writes. Offline
   fallback = `~/.corpus/<project>/`, same documents, same format.
3. **The server never calls an LLM.** The calling model writes summaries; the server
   validates, renders, and persists them. Zero API keys to run. (This is also the honest
   answer to "where does the intelligence live?" — in the schema + tool descriptions.)
4. **Degrade gracefully.** No documents yet for a project → return "no memory yet", don't
   error. No Supabase configured → offline fallback store. No graphify installed → say so
   and tell the model to fall back to normal exploration.

## Tool contracts

### memory_load
- **When:** session start, or when the user says "continue" / references past work.
  (The tool description carries this instruction — MCP injects it into every client;
  no AGENTS.md/CLAUDE.md required.)
- **In:** optional `query` (what you're about to work on — used to select relevant docs)
  and optional `document` (fetch one page by title).
- **Out:** the core state document (Status / Next steps / Decisions) plus any docs matching
  the query, as markdown, with a token-estimate footer. No docs yet → friendly
  "session one, no memory yet" message.

### memory_log
- **When:** immediately after any meaningful step — a decision made, a change completed,
  a bug found. Cheap and frequent; this is the crash-safety + freshness mechanism.
- **In:** `type` (decision | change | bug | note), `summary` (one line), `files?` (paths).
- **Out:** confirmation. Appends one bullet under today's session heading in `## Session log`.
- Decisions are ALSO appended to `## Decisions` (the permanent record with the "why").

### memory_save
- **When:** end of session, before a handoff, or on user command ("save state").
- **In (schema-forced — this is the quality lever):**
  - `summary` — one paragraph, what this session did
  - `completed[]` — finished items
  - `inProgress[]` — each item MUST name files/functions ("refactoring rotateToken() in
    auth-context.tsx — rotation logic done, 3 call sites left")
  - `decisions[{choice, reason}]` — the why, captured fresh
  - `nextSteps[]` — ordered, concrete enough for a cold model to execute
- **Out:** confirmation + rendered save. Server REWRITES `## Status` and `## Next steps`
  (current-state sections), APPENDS to `## Decisions` and `## Session log` (history sections).
  Rewrite-vs-append per section is the "merge, not append" answer that keeps the wiki
  from becoming a contradictory pile.
- Validation: reject saves with empty `nextSteps` or `inProgress` items with no file refs.

### codebase_search
- **When:** instead of grep/read exploration — "what calls X", "how does auth connect to db".
- **In:** `question` (natural language), `budget?` (max response tokens, default 2000).
- **Out:** Graphify's answer (structure: nodes, source locations, connections — not raw code).
- **Graph build policy:** built at `corpus-setup`, then rebuilt at most once per server
  process, on the session's first query — the graph is never older than the session using
  it. Rejected: `graphify watch` (background daemon = hidden failure mode), git hooks
  (fragile + only fire on commit), rebuild-per-query (pointless within a session), rebuild
  on save (next session can't trust it anyway). If a rebuild fails but a stale graph
  exists, serve stale — stale beats nothing, and the failure is reported.
- Mechanism: shells out to the `graphify` CLI. VERIFIED against graphifyy 0.9.18:
  build = `graphify update <path>` (tree-sitter, no LLM, seconds); query =
  `graphify query "<q>" --budget N`. The adapter resolves the binary even when pip's
  Scripts dir isn't on PATH (GRAPHIFY_PATH env overrides), auto-builds the graph on
  first query in a repo, and `corpus-setup` pre-builds it. If graphify is missing,
  returns an explicit fallback message telling the model to explore normally.

## Document model

A project's memory is a set of markdown **documents** (pages), stored in the DB (or the
offline fallback dir). One document is special: **`state`** — the distilled current state
a cold model reads first. Others are topical pages (like Almanac's wiki: "Authentication",
"Schema migrations") that grow over time; phase 1 ships `state` + the session ledger,
topical pages are phase 2+.

The `state` document — fixed section order, parsed by `## ` headings, machine-merged:

```markdown
# Corpus memory — <project name>
_Last updated: <iso date> · maintained by Corpus_

## Status
**Done:** …            ← rewritten on save
**In progress:** …     ← rewritten on save

## Next steps
1. …                   ← rewritten on save

## Decisions
- **<choice>** — <reason> _(<date>)_        ← append-only

## Architecture notes
…                       ← optional, save may update

## Session log
### <date> — <agent/session label>          ← append-only
- [decision] …
- [change] … (files: …)
```

Current-state sections are rewritten; history sections are append-only. The session log is
the raw ledger (primary sources); Status/Next steps are the distilled state a cold model
reads first.

## Token accounting (demo math — keep it honest)

- Memory savings: `tokens(fetched docs)` vs `tokens(re-derivation)` — measured by running
  the same task with and without Corpus and comparing real transcript totals.
- Quote the measured number, never Graphify's "70x" marketing figure. Expected honest
  range vs a competent agent baseline: 19–53% per session, plus elimination of
  re-orientation on every subsequent session/agent/teammate.
- Estimator in code: chars/4 (labelled as an estimate everywhere it appears).

## Phases

1. **Phase 1 (demo-critical):** mcp-server-2 with the pluggable store (offline fallback
   first, Supabase store behind the same interface) + the `state` document + the
   cross-LLM handoff working end to end.
2. **Phase 2 (tracks):** dashboard project browser → documentation pages (view/edit,
   Realtime) + token counter; Auth0 on the dashboard and workspace writes; topical pages.
3. **Roadmap (pitch only):** auto-save via harness lifecycle hooks; corpus_init that
   bootstraps docs for an existing repo from the Graphify graph; pgvector relevance
   matching for memory_load queries (v1 server already has this).

## Demo script (deterministic — every step user-triggered)

1. Session 1 (Claude Code) works on a feature in a REAL large repo; judges watch
   memory_log calls stream and the dashboard update live.
2. Explicit save ("save state") → show the markdown. Kill the session on purpose.
3. Session 2 (Codex/Gemini): "continue where the last session left off" → memory_load →
   it continues. The handoff is the product.
4. Token chart: measured with/without totals from real transcripts.
```
