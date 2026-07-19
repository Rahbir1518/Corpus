-- Corpus documentation DB schema. Run in the Supabase SQL editor.
-- See ARCHITECTURE.md "Storage backends" and "Document model".
-- Supersedes documents.sql — same `documents` table, plus workspaces/membership/usage.

-- One workspace per project (today). `id` is the opaque, shareable identifier used by
-- `corpus-connect <id>` and the ONLY identity: documents are keyed by it. `slug`
-- (resolveProject() = repo folder name, or $CORPUS_PROJECT) is a display label and
-- deliberately NOT unique — two unrelated teams may both work in a folder called `api`,
-- and each must get its own workspace rather than a collision or a failed setup.
create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  owner_user_id text,              -- Auth0 `sub`; null until claimed from the dashboard
  created_at timestamptz not null default now()
);

-- Dashboard access + connector state. A row = "this Auth0 user can see this workspace's
-- docs in the dashboard."
--
-- NOT YET WRITTEN BY ANYTHING — this table is currently always empty. The intent was for
-- corpus-connect/disconnect to toggle `status`, but the CLI has no login (see the header
-- of mcp-server-2/src/connect.ts: identity is the workspace id itself), so there is no
-- Auth0 `sub` to record and no row is ever inserted. It stays defined because it is the
-- right shape for when per-user tokens replace the service-role key.
--
-- Consequence for readers: do NOT treat "no row" as "no access", and do not derive
-- connection state from `status`. The dashboard reads liveness from the write trail
-- instead (usage_events + documents.updated_at) — see frontend/lib/activity.ts.
create table if not exists workspace_members (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id text not null,           -- Auth0 `sub`
  role text not null default 'member' check (role in ('owner', 'member')),
  status text not null default 'connected' check (status in ('connected', 'disconnected')),
  joined_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

-- Markdown documents, keyed by workspace id so folder-name collisions are impossible:
-- a write can only land in a workspace corpus-setup/connect deliberately created.
--
-- The migration to this keying HAS BEEN APPLIED to the live database: the legacy
-- `project` text column is gone (selecting it returns 42703) and workspace_id is
-- populated and NOT NULL on every row. DBs still on the old shape migrate with
-- migrate-documents-to-workspace-id-v2.sql; store.ts detects either shape at runtime,
-- but the frontend no longer carries dual-keying support (frontend/lib/documents.ts).
create table if not exists documents (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  content text not null,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, name)
);

-- Append-only usage ledger: real numbers for the token-savings counter + a live
-- dashboard activity feed. Replaces the old, never-defined recall_events/nodes/edges.
-- No FK on `project` — best-effort telemetry, must never block a tool call.
--
-- baseline_tokens / baseline_method: the "without Corpus" counterfactual for this same
-- call, MEASURED not guessed (see ARCHITECTURE.md "Token accounting") — no invented
-- savings multiplier. Populated only where a real substitute cost exists:
--   corpus_load        -> baseline_method 'full_corpus': size of every doc in the
--                         project's memory store, i.e. what loading everything (instead
--                         of just the needed doc) would have cost.
--   corpus_code_query   -> baseline_method 'full_graph_sources': total size of every
--                         source file the code graph indexes, i.e. what a grep-and-read
--                         spiral would have cost instead of the budgeted graph answer.
--   corpus_log/corpus_save -> both null: writes have no substitute cost at write time;
--                         their savings show up later as cheaper corpus_load calls, so
--                         a per-call baseline here would be fabricated, not measured.
-- workspace_id is the real attribution key: which workspace the call ran against. It is
-- nullable and un-FK'd on purpose — telemetry must never block or fail a tool call, and
-- rows written before this column existed have no id to backfill. `project` remains as
-- the human-readable slug at time of writing (deliberately non-unique, so it is a label,
-- NOT a grouping key — group by workspace_id).
create table if not exists usage_events (
  id bigserial primary key,
  project text not null,
  workspace_id uuid,               -- the workspace this call read/wrote; null = pre-column or local mode
  agent text,                      -- $CORPUS_AGENT: claude-code | codex | gemini | session
  tool text not null check (tool in ('corpus_load','corpus_log','corpus_save','corpus_code_query')),
  tokens int,                      -- estimateTokens() result where applicable
  baseline_tokens int,             -- measured "without Corpus" equivalent; null = not applicable
  baseline_method text,            -- how baseline_tokens was computed; null when baseline_tokens is null
  occurred_at timestamptz not null default now()
);

-- Re-running this file against a database that already has usage_events (pre-baseline
-- schema) needs an explicit ALTER — `create table if not exists` above is a no-op once
-- the table exists, so it won't retrofit these columns on its own.
--
-- These MUST stay ahead of the indexes below. usage_events_workspace_idx names
-- workspace_id, so against a pre-column DB the index raises 42703 and (in the SQL
-- editor) rolls back the whole script before the column is ever added.
alter table usage_events add column if not exists baseline_tokens int;
alter table usage_events add column if not exists baseline_method text;
alter table usage_events add column if not exists workspace_id uuid;

create index if not exists usage_events_project_idx on usage_events (project, occurred_at desc);
create index if not exists usage_events_workspace_idx on usage_events (workspace_id, occurred_at desc);

-- Per-project breakdown by agent and tool: event counts + total tokens, actual vs the
-- measured without-Corpus baseline. Lets the dashboard show "who (claude-code/codex/
-- gemini) used what (corpus_load/...) how much, and how much it would've cost without
-- Corpus" without every consumer re-writing the same group-by.
-- Grouped by workspace_id, matching how `documents` is keyed: grouping by the `project`
-- slug merged unrelated workspaces that happened to share a folder name, and split a
-- single workspace across the different folder names its members had checked out.
-- `project` is carried through max() purely as a display label for the group.
-- DRIFT: the LIVE database still has the older slug-grouped form of this view (no
-- workspace_id column, grouped by `project`), because usage_events.workspace_id was
-- never added there. Re-running this file fixes both. Consumers should select
-- `project` — it is present in both forms, which is why frontend/lib/activity.ts
-- keys activity by slug and keeps working either way.
create or replace view usage_stats as
select
  workspace_id,
  max(project) as project,
  coalesce(agent, 'unknown') as agent,
  tool,
  count(*) as event_count,
  coalesce(sum(tokens), 0) as total_tokens,
  coalesce(sum(baseline_tokens), 0) as total_baseline_tokens,
  count(baseline_tokens) as baseline_event_count
from usage_events
group by workspace_id, coalesce(agent, 'unknown'), tool;

-- Let the dashboard receive live updates. Guarded so schema.sql stays safely
-- re-runnable — `alter publication ... add table` errors (and, in the SQL editor,
-- rolls back the whole script) if the table is already published.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'documents'
  ) then
    alter publication supabase_realtime add table documents;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'usage_events'
  ) then
    alter publication supabase_realtime add table usage_events;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'workspace_members'
  ) then
    alter publication supabase_realtime add table workspace_members;
  end if;
end $$;

-- Project picker overview: one row per workspace with its document count and most
-- recent activity. Powers the dashboard's "select a project" screen. Keyed by
-- workspace id to match the workspace_id-keyed `documents` table; slug/name are for
-- display only (slug is deliberately non-unique). Workspaces with 0 docs still show.
create or replace view project_overview as
select
  w.id::text        as id,
  w.slug            as slug,
  w.name            as name,
  count(d.name)     as doc_count,
  max(d.updated_at) as last_updated
from workspaces w
left join documents d on d.workspace_id = w.id
group by w.id, w.slug, w.name;

-- Migration note: a DB whose `documents` is still keyed by project slug (the pre-id
-- schema) migrates with migrate-documents-to-workspace-id-v2.sql — a single transaction
-- with backfill and abort-on-collision checks. Do NOT hand-roll it here, and do not use
-- the v1 file (superseded; it hardcodes a stale data snapshot).
--
-- Run the migration BEFORE this file. project_overview above joins documents on
-- workspace_id, so against a slug-keyed DB it raises 42703 — and `create table if not
-- exists documents` is a no-op there, so this file can never add the column itself.
