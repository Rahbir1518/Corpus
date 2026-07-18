-- Corpus v2 documentation store (see ARCHITECTURE.md "Storage backends").
-- Run in the Supabase SQL editor.

create table if not exists documents (
  project text not null,
  name text not null,
  content text not null,
  updated_at timestamptz not null default now(),
  primary key (project, name)
);

-- Optional: let the dashboard receive live updates.
-- alter publication supabase_realtime add table documents;
