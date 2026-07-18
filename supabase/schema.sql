-- Corpus documentation DB schema. Run in the Supabase SQL editor.
-- See ARCHITECTURE.md "Storage backends" and "Document model".
-- Supersedes documents.sql — same `documents` table, plus workspaces/membership/usage.

-- One workspace per project (today). `id` is the opaque, shareable identifier used by
-- `corpus-connect <id>`. `slug` is the human key mcp-server-2 already computes locally
-- (resolveProject() = repo folder name, or $CORPUS_PROJECT) — store.ts keys documents
-- by this same string, so no change to how a project is identified there.
create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  owner_user_id text,              -- Auth0 `sub`; null until claimed from the dashboard
  created_at timestamptz not null default now()
);

-- Dashboard access + connector state. A row = "this Auth0 user can see this workspace's
-- docs in the dashboard." `status` is toggled by corpus-connect/disconnect: 'connected'
-- means this user's local corpus_log/corpus_save calls are currently landing in this
-- workspace's shared documents.
create table if not exists workspace_members (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id text not null,           -- Auth0 `sub`
  role text not null default 'member' check (role in ('owner', 'member')),
  status text not null default 'connected' check (status in ('connected', 'disconnected')),
  joined_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

-- Markdown documents (unchanged shape/keys from documents.sql). FK added: every write
-- auto-creates its workspace row (see store.ts's SupabaseStore.putDocument), so this
-- never blocks the zero-config local-first path.
create table if not exists documents (
  project text not null references workspaces(slug),
  name text not null,
  content text not null,
  updated_at timestamptz not null default now(),
  primary key (project, name)
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
create table if not exists usage_events (
  id bigserial primary key,
  project text not null,
  agent text,                      -- $CORPUS_AGENT: claude-code | codex | gemini | session
  tool text not null check (tool in ('corpus_load','corpus_log','corpus_save','corpus_code_query')),
  tokens int,                      -- estimateTokens() result where applicable
  baseline_tokens int,             -- measured "without Corpus" equivalent; null = not applicable
  baseline_method text,            -- how baseline_tokens was computed; null when baseline_tokens is null
  occurred_at timestamptz not null default now()
);

create index if not exists usage_events_project_idx on usage_events (project, occurred_at desc);

-- Re-running this file against a database that already has usage_events (pre-baseline
-- schema) needs an explicit ALTER — `create table if not exists` above is a no-op once
-- the table exists, so it won't retrofit these columns on its own.
alter table usage_events add column if not exists baseline_tokens int;
alter table usage_events add column if not exists baseline_method text;

-- Per-project breakdown by agent and tool: event counts + total tokens, actual vs the
-- measured without-Corpus baseline. Lets the dashboard show "who (claude-code/codex/
-- gemini) used what (corpus_load/...) how much, and how much it would've cost without
-- Corpus" without every consumer re-writing the same group-by.
create or replace view usage_stats as
select
  project,
  coalesce(agent, 'unknown') as agent,
  tool,
  count(*) as event_count,
  coalesce(sum(tokens), 0) as total_tokens,
  coalesce(sum(baseline_tokens), 0) as total_baseline_tokens,
  count(baseline_tokens) as baseline_event_count
from usage_events
group by project, coalesce(agent, 'unknown'), tool;

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

-- Migration note: if `documents` already has live rows from documents.sql, backfill
-- workspaces first, then add the FK — don't drop/recreate:
--   insert into workspaces (slug, name)
--     select distinct project, project from documents
--     on conflict (slug) do nothing;
--   alter table documents add constraint documents_project_fkey
--     foreign key (project) references workspaces(slug);
