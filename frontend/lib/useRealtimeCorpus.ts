"use client";

import { useEffect, useState } from "react";
import { getBrowserSupabase } from "./supabaseBrowser";

// Live-refresh signal for the dashboard: any change to `documents` (an agent
// saved memory, someone edited in the modal) or a new `usage_events` row
// (tool call landed) debounces into one onChange. Both tables are in the
// supabase_realtime publication — see supabase/schema.sql.
//
// Returns whether a realtime channel is actually connected (false when the
// NEXT_PUBLIC_SUPABASE_* env is absent and we're on demo data).
export function useRealtimeCorpus(onChange: () => void): boolean {
  const [live, setLive] = useState(false);

  useEffect(() => {
    const sb = getBrowserSupabase();
    if (!sb) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const bump = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(onChange, 500);
    };

    const channel = sb
      .channel("corpus-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "documents" }, bump)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "usage_events" }, bump)
      .subscribe((status) => setLive(status === "SUBSCRIBED"));

    return () => {
      if (timer) clearTimeout(timer);
      sb.removeChannel(channel);
      setLive(false);
    };
  }, [onChange]);

  return live;
}
