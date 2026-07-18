-- Corpus documentation DB schema. Run in the Supabase SQL editor.
-- See ARCHITECTURE.md "Storage backends" and "Document model".
--
-- Supersedes documents.sql (same markdown documents, re-keyed) and the v1 pgvector
-- schema (nodes/edges/sessions/recall_events/match_nodes) — v2 makes no LLM calls and
-- stores no embeddings, so none of that was reachable. Migration notes at the bottom.

-- A workspace is the unit of shared memory. `id` is the opaque, shareable identifier
-- handed to `corpus-connect <id>`; it is the ONLY thing that identifies a workspace.
--
-- `slug` is a human display label (repo folder name / $CORPUS_PROJECT) and is
-- deliberately NOT unique: it is derived from a folder name, and two unrelated teams
-- both working in a folder called `api` must not collide. Under the old unique-slug
-- design the second team's first write silently joined the first team's workspace.
create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  owner_user_id text,              -- Auth0 `sub`; null until claimed from the dashboard
  created_at timestamptz not null default now()
);

create index if not exists workspaces_slug_idx on workspaces (slug);
create index if not exists workspaces_owner_idx on workspaces (owner_user_id);

-- Dashboard access control. A row = "this Auth0 user may see this workspace."
--
-- Intentionally has NO `status` column. Connection is a property of a client install
-- (one user may be connected from claude-code on a laptop and codex on a desktop at the
-- same time), so a per-user boolean cannot represent it without lying. Liveness is
-- DERIVED from `last_active_at` / usage_events — "active 3m ago", never a declared flag.
-- This table answers access only: does the row exist, and with what role.
create table if not exists workspace_members (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id text not null,           -- Auth0 `sub`
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

-- "Which workspaces can I see?" — the dashboard's hottest query.
create index if not exists workspace_members_user_idx on workspace_members (user_id);

-- Fail loudly if an old-shape `documents` table is present. Without this the
-- `create table if not exists` below silently does nothing, leaving the old `project`
-- column in place and no error to tell you the migration never happened.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'documents' and column_name = 'project'
  ) then
    raise exception
      'documents still has the old `project` column. Run the migration block at the '
      'bottom of this file first — CREATE TABLE IF NOT EXISTS will not alter it.';
  end if;
end $$;

-- Markdown documents. Keyed by workspace_id (not slug) so identity is the opaque id,
-- which is what makes `corpus-connect <id>` real rather than nominal.
--
-- Workspaces are NEVER auto-created by a write. The server only writes here when
-- $CORPUS_WORKSPACE is set, which happens exclusively via corpus-setup / corpus-connect.
-- With no workspace id the server uses LocalStore (~/.corpus/<slug>) and never touches
-- this table — that is what keeps the zero-config, local-first path working with no DB.
create table if not exists documents (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,              -- "state" today; named pages (e.g. "Schema migrations") later
  content text not null,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, name)
);

-- Append-only usage ledger: real numbers for the token-savings counter and the live
-- dashboard activity feed.
--
-- `tool` is deliberately unconstrained text. This is telemetry: adding or renaming a
-- tool must never require a DDL migration, and must never fail a tool call. (A CHECK
-- listing tool names would already be stale — the tools were renamed to corpus_load,
-- corpus_log, corpus_save and codebase_search.) No FK on workspace_id for the same
-- reason: best-effort telemetry must not block a write.
create table if not exists usage_events (
  id bigserial primary key,
  workspace_id uuid,               -- null = local/private session (no shared workspace)
  project text not null,           -- slug label, always present, for local-mode attribution
  agent text,                      -- $CORPUS_AGENT: claude-code | codex | gemini | session
  tool text not null,
  tokens int,                      -- estimateTokens() result where applicable
  occurred_at timestamptz not null default now()
);

create index if not exists usage_events_workspace_idx on usage_events (workspace_id, occurred_at desc);
create index if not exists usage_events_project_idx on usage_events (project, occurred_at desc);

-- Per-workspace breakdown by agent and tool: event counts + total tokens. Lets the
-- dashboard show "who (claude-code/codex/gemini) used what (corpus_load/...) how much"
-- without every consumer re-writing the same group-by. Grouped by workspace_id AND
-- project so local-mode rows (workspace_id null) still aggregate under their slug.
create or replace view usage_stats as
select
  workspace_id,
  project,
  coalesce(agent, 'unknown') as agent,
  tool,
  count(*) as event_count,
  coalesce(sum(tokens), 0) as total_tokens
from usage_events
group by workspace_id, project, coalesce(agent, 'unknown'), tool;

-- Let the dashboard receive live updates. Guarded: unlike `create table if not exists`,
-- `alter publication ... add table` errors if the table is already published, which
-- would otherwise make this whole script non-rerunnable.
do $$
declare t text;
begin
  foreach t in array array['documents', 'usage_events', 'workspace_members'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;


-- ---------------------------------------------------------------------------
-- Migration from documents.sql (documents keyed by `project text`)
-- ---------------------------------------------------------------------------
-- Only needed if you have live rows from the old `documents` table. Run once, in
-- order, BEFORE creating the new documents table above — do not drop and recreate.
--
--   -- 1. One workspace per distinct project string (project was unique, so this is 1:1).
--   insert into workspaces (slug, name)
--     select distinct project, project from documents;
--
--   -- 2. Add and populate the new key.
--   alter table documents add column workspace_id uuid;
--   update documents d set workspace_id = w.id from workspaces w where w.slug = d.project;
--   alter table documents alter column workspace_id set not null;
--
--   -- 3. Swap the primary key, then retire the old column.
--   alter table documents drop constraint documents_pkey;
--   alter table documents add primary key (workspace_id, name);
--   alter table documents add constraint documents_workspace_id_fkey
--     foreign key (workspace_id) references workspaces(id) on delete cascade;
--   alter table documents drop column project;
--
-- 4. Then run `corpus-connect <id>` in each repo, using the new workspace id, so local
--    configs point at the id instead of relying on the folder name.
--
-- NOTE: if the same repo was written under two different project strings (e.g. `Corpus`
-- and `corpus-dev`), step 1 creates two workspaces. Merge them by hand before step 2 —
-- pick the surviving id, repoint the loser's documents, delete the empty workspace.
--
-- ---------------------------------------------------------------------------
-- Retiring the v1 pgvector schema
-- ---------------------------------------------------------------------------
-- Nothing in v2 reads these. Drop only once you are sure no v1 client remains:
--
--   drop function if exists match_nodes(vector, text, int);
--   drop table if exists recall_events, edges, nodes, sessions cascade;
--   -- `workspaces` is reused (v1 keyed it `text`); if the old one exists with text ids,
--   -- rename it out of the way first rather than dropping — it may hold real names.
