-- Migrate `documents` from project-slug keying to workspace_id keying.
--
-- SUPERSEDES migrate-documents-to-workspace-id.sql, which hardcoded a data snapshot
-- (corpus-dev / tmp / EPCM-Cathode-Anode-Quoting-Portal) that no longer matches the live
-- DB. Do not run that one. This version derives everything from the data actually
-- present, so it stays correct as the table drifts.
--
-- Run this ONCE in the Supabase SQL editor, BEFORE re-running schema.sql. schema.sql
-- cannot complete against a slug-keyed DB: `create table if not exists documents` is a
-- no-op, so project_overview's `join documents d on d.workspace_id = w.id` raises 42703.
--
-- WHAT IT DOES. The live table collapsed several repos into one `project` value and
-- disambiguated them in the NAME instead:
--
--     project=demo  name='state (corpus-dev)'   ->  workspace 'corpus-dev',  doc 'state'
--     project=demo  name='architecture (foo)'   ->  workspace 'foo',         doc 'architecture'
--     project=demo  name='state'                ->  workspace 'demo',        doc 'state'
--     project=cp    name='state'                ->  workspace 'cp',          doc 'state'
--
-- i.e. a trailing " (...)" is read as the workspace the row belongs to and stripped from
-- the document name. Rows without one key by their `project` value as before.
--
-- The whole migration is one transaction. Any unmatched row or any (workspace_id, name)
-- collision raises and nothing commits.

-- ===========================================================================
-- STEP 1 — PREVIEW. Run this SELECT **on its own** first and read the output.
--
-- The " (...)" parse is a heuristic. If a document is legitimately named with
-- parentheses that are NOT a repo name, this is where you catch it — it would
-- otherwise be promoted into a bogus workspace. Nothing below is destructive.
-- ===========================================================================

select
  case when d.name ~ ' \(.+\)$'
       then regexp_replace(d.name, '^(.*) \((.+)\)$', '\2')
       else d.project end                                   as into_workspace_slug,
  case when d.name ~ ' \(.+\)$'
       then regexp_replace(d.name, '^(.*) \((.+)\)$', '\1')
       else d.name end                                      as into_doc_name,
  d.project                                                 as from_project,
  d.name                                                    as from_name,
  length(d.content)                                         as len,
  exists (select 1 from workspaces w where w.slug =
    case when d.name ~ ' \(.+\)$'
         then regexp_replace(d.name, '^(.*) \((.+)\)$', '\2')
         else d.project end)                                as workspace_already_exists
from documents d
order by into_workspace_slug, into_doc_name;

-- ===========================================================================
-- STEP 2 — MIGRATE. Only after the preview above looks right.
-- Select from `begin;` to `commit;` and run.
-- ===========================================================================

begin;

-- ---------------------------------------------------------------------------
-- 0. Preconditions — fail loudly rather than half-migrating.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'documents' and column_name = 'project'
  ) then
    raise exception 'documents has no `project` column — this migration has already run.';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 1. Freeze the plan. Computed once so the UPDATE in step 4 cannot read its own
--    writes (it rewrites `name`, which is part of the join key).
-- ---------------------------------------------------------------------------
create temporary table doc_plan on commit drop as
select
  d.project as old_project,
  d.name    as old_name,
  case when d.name ~ ' \(.+\)$'
       then regexp_replace(d.name, '^(.*) \((.+)\)$', '\2')
       else d.project end as slug,
  case when d.name ~ ' \(.+\)$'
       then regexp_replace(d.name, '^(.*) \((.+)\)$', '\1')
       else d.name end    as doc_name
from documents d;

-- ---------------------------------------------------------------------------
-- 2. Create workspaces only for slugs that don't already have one.
--
-- Slugs that DO exist are reused, so any workspace id a repo is already connected
-- to via `corpus-connect <id>` keeps working. Re-inserting them would fork the memory.
-- ---------------------------------------------------------------------------
insert into workspaces (slug, name)
select distinct p.slug, p.slug
from doc_plan p
where not exists (select 1 from workspaces w where w.slug = p.slug);

-- ---------------------------------------------------------------------------
-- 3. Add the new key, unpopulated for now.
-- ---------------------------------------------------------------------------
alter table documents add column workspace_id uuid;

-- ---------------------------------------------------------------------------
-- 4. Point every row at its workspace and strip the " (...)" from its name.
--
-- `distinct on (slug)` picks the OLDEST workspace per slug, so a pre-existing
-- workspace always wins over any duplicate a partial earlier attempt may have left.
-- ---------------------------------------------------------------------------
update documents d
set workspace_id = w.id,
    name         = p.doc_name
from doc_plan p
join (
  select distinct on (slug) slug, id
  from workspaces
  order by slug, created_at asc
) w on w.slug = p.slug
where d.project = p.old_project
  and d.name    = p.old_name;

-- ---------------------------------------------------------------------------
-- 5. Verify before locking anything in. Aborts the transaction on a missed row
--    or on a collision that the new primary key would reject.
-- ---------------------------------------------------------------------------
do $$
declare
  orphaned int;
  dupes    int;
begin
  select count(*) into orphaned from documents where workspace_id is null;
  if orphaned > 0 then
    raise exception 'ABORT: % document row(s) could not be matched to a workspace.', orphaned;
  end if;

  select count(*) into dupes from (
    select workspace_id, name from documents group by workspace_id, name having count(*) > 1
  ) x;
  if dupes > 0 then
    raise exception 'ABORT: % (workspace_id, name) collision(s) — the new primary key would fail.', dupes;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 6. Swap the key, add the FK, retire the old column.
-- ---------------------------------------------------------------------------
alter table documents alter column workspace_id set not null;
alter table documents drop constraint documents_pkey;
alter table documents add primary key (workspace_id, name);
alter table documents add constraint documents_workspace_id_fkey
  foreign key (workspace_id) references workspaces(id) on delete cascade;
alter table documents drop column project;

-- ---------------------------------------------------------------------------
-- 7. slug becomes a pure display label. With documents keyed by workspace_id, two
--    unrelated repos both named `api` must each get their OWN workspace — a unique
--    constraint would make the second corpus-setup fail instead. Must run after the
--    project column (whose FK targeted workspaces.slug) is dropped above.
-- ---------------------------------------------------------------------------
alter table workspaces drop constraint if exists workspaces_slug_key;

commit;

-- ===========================================================================
-- STEP 3 — AFTER COMMITTING
-- ===========================================================================
--
-- Verify:
--   select w.slug, w.id, d.name, length(d.content) as len
--   from documents d join workspaces w on w.id = d.workspace_id
--   order by w.slug, d.name;
--
-- Then:
--   1. Re-run schema.sql. It is a no-op for what already exists and will now get
--      through project_overview, which needs documents.workspace_id.
--   2. Restart every running agent session. store.ts keyed() memoizes the keying
--      ONCE per process, so a server that probed before this ran still writes
--      the old columns.
--   3. Check each repo with corpus-status. Under id keying the workspace id in the
--      client config is what selects the data, so an unconnected repo has memory
--      OFF rather than silently falling back to a slug lookup.
--
-- Pruning: junk workspaces (poo, test, random-folder, New folder, ...) were split
-- out faithfully rather than dropped, so nothing was destroyed on an assumption.
-- Delete them once you've confirmed what they hold — the FK is on delete cascade,
-- so removing the workspace row removes its documents:
--   delete from workspaces where slug in ('poo', 'test');
-- ===========================================================================
