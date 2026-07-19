-- ─────────────────────────────────────────────────────────────────────────────
-- Categorize documents under projects + fix the project picker view.
-- Run this in the Supabase SQL editor (safe to re-run — idempotent).
--
-- What it does:
--   1. Rebuilds `project_overview` so a "project" = any distinct documents.project
--      value (and empty workspaces still show). This is what the dashboard's
--      "select a project" screen reads.
--   2. Creates a `demo` project (workspace) row.
--   3. Backfills a workspace for every other project already used by a document,
--      so each shows a proper name in the picker.
--   4. (Optional, commented) moves ALL existing documents under `demo`.
--   5. (Optional, commented) adds a real FK so documents.project must reference a
--      workspace. mcp-server-2 already upserts the workspace before each write.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Project picker view (documents-driven: a project only shows if it has docs)
create or replace view project_overview as
select
  d.project                   as slug,
  coalesce(w.name, d.project) as name,
  count(d.name)               as doc_count,
  max(d.updated_at)           as last_updated
from documents d
left join workspaces w on w.slug = d.project
group by d.project, coalesce(w.name, d.project);

-- 2. Create the demo project
insert into workspaces (slug, name) values ('demo', 'Demo')
  on conflict (slug) do nothing;

-- 3. Give every project a document already uses a matching workspace row
insert into workspaces (slug, name)
  select distinct project, project from documents
  on conflict (slug) do nothing;

-- ── OPTIONAL STEPS (uncomment to run) ────────────────────────────────────────

-- 4. Consolidate ALL existing documents under the `demo` project.
--    ⚠️  Only safe if no two documents share the same `name` — the (project, name)
--    primary key will collide otherwise. Run the check first:
--
--      select name, count(*) from documents group by name having count(*) > 1;
--
--    If that returns no rows, you're clear to run:
--
--  update documents set project = 'demo';

-- 5. Enforce referential integrity (run only AFTER step 3/4 so every
--    documents.project already has a workspace).
--
--  alter table documents
--    add constraint documents_project_fkey
--    foreign key (project) references workspaces(slug);
