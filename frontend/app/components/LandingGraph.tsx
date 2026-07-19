"use client";

import CorpusGraph from "@/app/(dashboard)/dashboard/CorpusGraph";
import type { WorkspaceWithDocs } from "@/lib/workspaces";

// Landing-page memory graph: the same "Connections" view the logged-in dashboard
// renders (CorpusGraph), fed small hard-coded demo data — a central "Corpus" root,
// two workspace hubs, and their document leaves. No Supabase / auth needed.

const NOW = "2026-07-19T00:00:00.000Z";
const doc = (name: string) => ({ name, content: "", updated_at: NOW });

const DEMO: WorkspaceWithDocs[] = [
  {
    id: "corpus-dev",
    slug: "corpus-dev",
    name: "corpus-dev",
    membership: { role: "owner", status: "connected", joined_at: NOW, last_active_at: NOW },
    documents: [doc("state"), doc("log"), doc("decisions"), doc("architecture")],
  },
  {
    id: "tmp",
    slug: "tmp",
    name: "tmp",
    membership: { role: "member", status: "disconnected", joined_at: NOW, last_active_at: NOW },
    documents: [doc("state")],
  },
];

export default function LandingGraph() {
  return (
    <CorpusGraph
      workspaces={DEMO}
      rootLabel="Corpus"
      highlight={new Set()}
      searchActive={false}
      onSelect={() => {}}
    />
  );
}
