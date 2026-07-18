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
create table if not exists usage_events (
  id bigserial primary key,
  project text not null,
  agent text,                      -- $CORPUS_AGENT: claude-code | codex | gemini | session
  tool text not null check (tool in ('corpus_load','corpus_log','corpus_save','corpus_code_query')),
  tokens int,                      -- estimateTokens() result where applicable
  occurred_at timestamptz not null default now()
);

create index if not exists usage_events_project_idx on usage_events (project, occurred_at desc);

-- Let the dashboard receive live updates.
alter publication supabase_realtime add table documents;
alter publication supabase_realtime add table usage_events;
alter publication supabase_realtime add table workspace_members;

-- Migration note: if `documents` already has live rows from documents.sql, backfill
-- workspaces first, then add the FK — don't drop/recreate:
--   insert into workspaces (slug, name)
--     select distinct project, project from documents
--     on conflict (slug) do nothing;
--   alter table documents add constraint documents_project_fkey
--     foreign key (project) references workspaces(slug);
