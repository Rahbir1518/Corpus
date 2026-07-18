"use client";

import { useEffect } from "react";
import { getBrowserSupabase } from "./supabaseBrowser";

export interface RecallEvent {
  query: string;
  node_ids: string[];
  full_token_count: number;
  recall_token_count: number;
}

interface Handlers {
  workspace: string;
  onRecall: (e: RecallEvent) => void; // a corpus_recall happened → glow + count
  onNodesChanged: () => void; // corpus_remember added nodes → refetch graph
}

// Subscribe to live Corpus activity. No-op (returns false) when Supabase env is
// absent, so the dashboard keeps working with the local manual recall.
export function useRealtimeCorpus({ workspace, onRecall, onNodesChanged }: Handlers): void {
  useEffect(() => {
    const sb = getBrowserSupabase();
    if (!sb) return;

    const channel = sb
      .channel(`corpus:${workspace}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "recall_events", filter: `workspace_id=eq.${workspace}` },
        (payload) => onRecall(payload.new as RecallEvent),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "nodes", filter: `workspace_id=eq.${workspace}` },
        () => onNodesChanged(),
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [workspace, onRecall, onNodesChanged]);
}
