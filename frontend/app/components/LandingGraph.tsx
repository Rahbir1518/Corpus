"use client";

import CorpusGraph from "@/app/(dashboard)/dashboard/CorpusGraph";
import type { WorkspaceWithDocs } from "@/lib/workspaces";

// Landing-page memory graph: the same view the logged-in dashboard renders
// (CorpusGraph), fed small hard-coded illustrative data — a central "Corpus" root,
// two workspace hubs, and their document leaves. No Supabase / auth needed.
//
// This is the ONE place invented workspaces are legitimate: it is marketing art on a
// public page for signed-out visitors, not a fallback standing in for a failed query.
// The dashboard's own loaders never fabricate — see lib/workspaces.ts.

const NOW = "2026-07-19T00:00:00.000Z";
const doc = (name: string) => ({ name, content: "", updated_at: NOW });

const DEMO: WorkspaceWithDocs[] = [
  {
    id: "corpus-dev",
    slug: "corpus-dev",
    name: "corpus-dev",
    membership: null,
    // Recent, so this hub draws as a live cluster; `tmp` stays dormant for contrast.
    activity: { events: 128, lastActiveAt: new Date().toISOString() },
    documents: [doc("state"), doc("log"), doc("decisions"), doc("architecture")],
  },
  {
    id: "tmp",
    slug: "tmp",
    name: "tmp",
    membership: null,
    activity: { events: 3, lastActiveAt: NOW },
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
