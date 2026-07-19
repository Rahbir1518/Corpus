-- ############################################################################
-- SUPERSEDED — DO NOT RUN. Use migrate-documents-to-workspace-id-v2.sql.
--
-- This file hardcodes a data snapshot the live DB no longer matches. It expects
-- projects corpus-dev / tmp / EPCM-Cathode-Anode-Quoting-Portal (see the trailer
-- at the bottom); the live table now holds Corpus / cp / demo, with the old
-- project names moved into the NAME column as " (suffix)".
--
-- Run against today's data it either aborts at step 5 (the step 3 lookup of
-- slug='corpus-dev' yields NULL, leaving rows unmatched), or — worse, if such a
-- workspace does exist — "succeeds" by cramming every repo into one workspace and
-- baking the folder-name collision permanently into document names. That is the
-- exact failure workspace_id keying exists to undo.
--
-- Kept only as the record of the original intent, including the Corpus/corpus-dev
-- merge in step 3, which v2 deliberately does not reproduce (unverifiable now, and
-- merging is the irreversible direction).
-- ############################################################################

-- Migrate `documents` from project-slug keying to workspace_id keying.
--
-- Run this ONCE in the Supabase SQL editor, BEFORE re-running schema.sql. It replaces
-- the generic migration block at the bottom of schema.sql, which is unsafe against a DB
-- that already has `workspaces` rows: `insert ... select distinct project from documents`
-- duplicates any slug that already exists, and because slug is deliberately NOT unique,
-- the follow-up `where w.slug = d.project` join then picks a workspace arbitrarily.
--
-- The whole thing is one transaction. If any check fails it raises, and nothing commits.

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
-- 1. Create workspaces only for project strings that do not already have one.
--
-- `corpus-dev` and `tmp` already exist as workspaces and repos are connected to those
-- ids; re-inserting them would fork the memory. Only genuinely new slugs get a row.
--
-- `Corpus` is deliberately excluded: it is the same physical repo as `corpus-dev`
-- (both were written from c:\Users\MYu\Downloads\personal\Corpus under different
-- $CORPUS_PROJECT values). Step 3 merges it instead of giving it its own workspace.
-- ---------------------------------------------------------------------------
insert into workspaces (slug, name)
select distinct d.project, d.project
from documents d
where d.project <> 'Corpus'
  and not exists (select 1 from workspaces w where w.slug = d.project);

-- ---------------------------------------------------------------------------
-- 2. Add the new key, unpopulated for now.
-- ---------------------------------------------------------------------------
alter table documents add column workspace_id uuid;

-- ---------------------------------------------------------------------------
-- 3. Merge the `Corpus` rows into the existing corpus-dev workspace.
--
-- Both are this repo. corpus-dev's `state` is newer (20:07 vs 14:43) and far richer
-- (13660 chars vs 915), so it wins the name collision. The older one is preserved
-- under a distinct name rather than dropped — review it, then delete if redundant.
-- ---------------------------------------------------------------------------
update documents
set workspace_id = (
      select id from workspaces where slug = 'corpus-dev' order by created_at asc limit 1
    ),
    name = case when name = 'state' then 'state (legacy Corpus)' else name end
where project = 'Corpus';

-- ---------------------------------------------------------------------------
-- 4. Populate everything else. `distinct on` picks the OLDEST workspace per slug, so
--    pre-existing workspaces (the ones repos are already connected to) always win over
--    any duplicate that may have been created by an earlier partial migration attempt.
-- ---------------------------------------------------------------------------
update documents d
set workspace_id = w.id
from (
  select distinct on (slug) slug, id
  from workspaces
  order by slug, created_at asc
) w
where w.slug = d.project
  and d.workspace_id is null;

-- ---------------------------------------------------------------------------
-- 5. Verify before locking anything in. Aborts the transaction if a row was missed
--    or if the merge collided with an existing (workspace_id, name) pair.
-- ---------------------------------------------------------------------------
do $$
declare
  orphaned int;
  dupes int;
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
--    unrelated repos both named `api` must each get their OWN workspace — the unique
--    constraint would make the second corpus-setup fail instead. Must run after the
--    project column (whose FK targets workspaces.slug) is dropped above.
-- ---------------------------------------------------------------------------
alter table workspaces drop constraint if exists workspaces_slug_key;

commit;

-- ---------------------------------------------------------------------------
-- After committing, expect:
--   corpus-dev (983e572f-a3d7-4293-9eb4-615dcf87b6c5)
--     state, architecture, decisions, state (legacy Corpus)
--   tmp (ff789e48-79df-4067-b627-eac23b41ee22)
--     state
--   EPCM-Cathode-Anode-Quoting-Portal (new id)
--     state
--
-- Verify with:
--   select w.slug, w.id, d.name, length(d.content) as len
--   from documents d join workspaces w on w.id = d.workspace_id
--   order by w.slug, d.name;
--
-- Then:
--   1. Restart every running agent session. The server detects the keying ONCE per
--      process; a server that probed before this ran still writes the old columns.
--   2. Make sure each repo is connected (corpus-status) — under id keying the workspace
--      id in the client config is what selects the data, so an unconnected repo has
--      memory OFF rather than falling back to slug lookups.
-- ---------------------------------------------------------------------------
