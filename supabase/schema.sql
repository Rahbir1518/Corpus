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

-- Markdown documents, keyed by workspace id so folder-name collisions are impossible:
-- a write can only land in a workspace corpus-setup/connect deliberately created.
-- DBs created before this keying (documents keyed by project slug) migrate with
-- migrate-documents-to-workspace-id.sql; store.ts detects either shape at runtime.
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
create table if not exists usage_events (
  id bigserial primary key,
  project text not null,
  agent text,                      -- $CORPUS_AGENT: claude-code | codex | gemini | session
  tool text not null check (tool in ('corpus_load','corpus_log','corpus_save','corpus_code_query')),
  tokens int,                      -- estimateTokens() result where applicable
  occurred_at timestamptz not null default now()
);

create index if not exists usage_events_project_idx on usage_events (project, occurred_at desc);

-- Per-project breakdown by agent and tool: event counts + total tokens. Lets the
-- dashboard show "who (claude-code/codex/gemini) used what (corpus_load/...) how much"
-- without every consumer re-writing the same group-by.
create or replace view usage_stats as
select
  project,
  coalesce(agent, 'unknown') as agent,
  tool,
  count(*) as event_count,
  coalesce(sum(tokens), 0) as total_tokens
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

-- Migration note: a DB whose `documents` is still keyed by project slug (the pre-id
-- schema) migrates with migrate-documents-to-workspace-id.sql — a single transaction
-- with backfill and abort-on-collision checks. Do NOT hand-roll it here.
