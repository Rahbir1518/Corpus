-- ─────────────────────────────────────────────────────────────────────────────
-- Move ALL existing documents under a single project named "demo".
-- Run this in the Supabase SQL editor. Non-destructive: no documents are deleted.
--
-- The documents primary key is (project, name), so if the same file name exists in
-- more than one project (e.g. every project has a MEMORY.md), a plain
-- `update documents set project='demo'` would violate the PK. This script avoids
-- that by first renaming the colliding copies (suffixing their source project),
-- so every document is preserved and lands under `demo` with a unique name.
-- Wrapped in a transaction so it's all-or-nothing.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- 1. Ensure the demo project exists
insert into workspaces (slug, name) values ('demo', 'Demo')
  on conflict (slug) do nothing;

-- 2. Resolve name collisions before merging.
--    For any name used in more than one project, the project that sorts first
--    keeps the plain name; every other copy gets its source project appended,
--    e.g. "MEMORY.md" -> "MEMORY.md (proj-b)".
update documents d
set name = d.name || ' (' || d.project || ')'
where exists (
  select 1 from documents o
  where o.name = d.name
    and o.project <> d.project
    and o.project < d.project
);

-- 3. Everything is now collision-free — move it all under demo
update documents set project = 'demo' where project <> 'demo';

commit;

-- ── After running ────────────────────────────────────────────────────────────
-- • /projects will show a single "Demo" card (pulled from the DB via project_overview)
-- • clicking Demo lists every document under it
--
-- Optional: remove the now-empty leftover project rows from the picker's source.
-- (Not required — the documents-driven project_overview view already hides
--  workspaces with zero documents — but this keeps the workspaces table tidy.)
--
--   delete from workspaces w
--   where w.slug <> 'demo'
--     and not exists (select 1 from documents d where d.project = w.slug);

-- Optional integrity FK (run once, after everything is under real workspaces):
--   alter table documents
--     add constraint documents_project_fkey
--     foreign key (project) references workspaces(slug);
