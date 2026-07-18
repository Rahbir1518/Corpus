-- Corpus schema — Postgres + pgvector
-- Run in Supabase SQL editor (or `supabase db push`).

create extension if not exists vector;

-- A workspace = a shared "second brain" for a team/project.
create table if not exists workspaces (
  id          text primary key,
  name        text not null,
  created_at  timestamptz not null default now()
);

-- A node = one atom of memory: a decision, bug, file, preference, task...
create table if not exists nodes (
  id            text primary key,
  workspace_id  text not null references workspaces(id) on delete cascade,
  type          text not null,              -- decision | bug | file | preference | task
  title         text not null,
  body          text not null default '',
  tags          text[] not null default '{}',
  session_id    text,
  embedding     vector(1536),               -- OpenAI text-embedding-3-small
  created_at    timestamptz not null default now()
);

create index if not exists nodes_workspace_idx on nodes (workspace_id);
create index if not exists nodes_embedding_idx
  on nodes using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- An edge = a relationship between two nodes.
create table if not exists edges (
  id            bigint generated always as identity primary key,
  workspace_id  text not null references workspaces(id) on delete cascade,
  source_id     text not null references nodes(id) on delete cascade,
  target_id     text not null references nodes(id) on delete cascade,
  rel           text not null default 'relates_to',  -- caused | depends_on | touches | relates_to
  unique (source_id, target_id, rel)
);

create index if not exists edges_workspace_idx on edges (workspace_id);

-- A session = one captured AI session, with token accounting for the savings counter.
create table if not exists sessions (
  id                  text primary key,
  workspace_id        text not null references workspaces(id) on delete cascade,
  title               text not null default '',
  raw_token_count     int not null default 0,
  engram_token_count  int not null default 0,
  created_at          timestamptz not null default now()
);

-- A recall_event = a corpus_recall call. Drives the live graph glow + token panel.
create table if not exists recall_events (
  id                bigint generated always as identity primary key,
  workspace_id      text not null references workspaces(id) on delete cascade,
  query             text not null,
  node_ids          text[] not null default '{}',
  full_token_count  int not null default 0,   -- what pasting the whole corpus would cost
  recall_token_count int not null default 0,  -- what we actually returned
  created_at        timestamptz not null default now()
);

create index if not exists recall_events_workspace_idx on recall_events (workspace_id, created_at desc);

-- Vector similarity search, scoped to a workspace. Returns nodes + similarity.
create or replace function match_nodes (
  query_embedding vector(1536),
  ws_id           text,
  match_count     int default 5
)
returns table (
  id          text,
  type        text,
  title       text,
  body        text,
  tags        text[],
  similarity  float
)
language sql stable
as $$
  select
    n.id, n.type, n.title, n.body, n.tags,
    1 - (n.embedding <=> query_embedding) as similarity
  from nodes n
  where n.workspace_id = ws_id and n.embedding is not null
  order by n.embedding <=> query_embedding
  limit match_count;
$$;

-- Realtime: broadcast changes on these tables to the dashboard.
alter publication supabase_realtime add table recall_events;
alter publication supabase_realtime add table nodes;
