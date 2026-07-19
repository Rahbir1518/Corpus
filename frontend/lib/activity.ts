import type { SupabaseClient } from "@supabase/supabase-js";

// Per-workspace activity — the dashboard's honest answer to "is this workspace
// live?".
//
// It deliberately does NOT come from workspace_members. That table exists in the
// schema but nothing writes to it: `corpus-connect` only rewrites this repo's local
// client config (mcp-server-2/src/connect.ts), and its docstring explains why — the
// CLI has no login, so there is no user identity to record. Reading connection state
// from a table that is structurally always empty made every workspace render
// "not joined here" forever.
//
// What IS real is the write trail: usage_events rows land on every corpus_load /
// corpus_log / corpus_save, and documents.updated_at moves whenever memory is saved.
// A workspace with recent events is one your sessions are actually pointed at, which
// is the question the Connections tab was trying to answer in the first place.

export interface WorkspaceActivity {
  events: number; // total logged tool calls, all time
  lastActiveAt: string | null; // most recent write of any kind
}

// A workspace counts as "active" if it was written to within this window.
export const ACTIVE_WINDOW_MS = 24 * 60 * 60 * 1000;

export function isActive(a: WorkspaceActivity, now: number = Date.now()): boolean {
  if (!a.lastActiveAt) return false;
  return now - new Date(a.lastActiveAt).getTime() < ACTIVE_WINDOW_MS;
}

// Only the newest events are needed to answer "when was this last touched", and the
// ledger grows without bound — so recency comes from a bounded, newest-first slice
// while the exact counts come from the pre-aggregated usage_stats view.
const RECENCY_SCAN_LIMIT = 2000;

// usage_events is keyed by project SLUG, not workspace id (there is no FK — see the
// live schema), so callers pass slugs and get slug-keyed activity back.
export async function getActivityBySlug(
  sb: SupabaseClient,
  slugs: string[],
): Promise<Map<string, WorkspaceActivity>> {
  const out = new Map<string, WorkspaceActivity>();
  if (slugs.length === 0) return out;

  const [{ data: stats, error: sErr }, { data: recent, error: rErr }] = await Promise.all([
    sb.from("usage_stats").select("project,event_count").in("project", slugs),
    sb
      .from("usage_events")
      .select("project,occurred_at")
      .in("project", slugs)
      .order("occurred_at", { ascending: false })
      .limit(RECENCY_SCAN_LIMIT),
  ]);
  if (sErr) throw new Error(`usage_stats fetch failed: ${sErr.message}`);
  if (rErr) throw new Error(`usage_events fetch failed: ${rErr.message}`);

  for (const row of stats ?? []) {
    const slug = row.project as string;
    const cur = out.get(slug) ?? { events: 0, lastActiveAt: null };
    cur.events += (row.event_count as number) ?? 0;
    out.set(slug, cur);
  }

  // Newest-first, so the first row seen for a slug is its latest event.
  for (const row of recent ?? []) {
    const slug = row.project as string;
    const cur = out.get(slug) ?? { events: 0, lastActiveAt: null };
    if (!cur.lastActiveAt) {
      cur.lastActiveAt = row.occurred_at as string;
      out.set(slug, cur);
    }
  }

  return out;
}

// Latest of two possibly-null ISO timestamps.
export function latest(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a.localeCompare(b) >= 0 ? a : b;
}
