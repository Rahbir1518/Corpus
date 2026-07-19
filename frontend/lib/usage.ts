import { getSupabase } from "@/lib/supabase";

// Aggregated view over the usage_events ledger (see supabase/schema.sql).
interface UsageStatsRow {
  project: string;
  agent: string;
  tool: string;
  event_count: number;
  total_tokens: number;
}

export interface BreakdownRow {
  label: string;
  events: number;
  tokens: number;
}

export interface UsageSummary {
  totalEvents: number; // every logged call, all tools
  tools: BreakdownRow[]; // per tool (friendly names), sorted desc by calls
}

// Concrete names for the ledger UI — the raw tool ids read like an API.
const TOOL_LABELS: Record<string, string> = {
  corpus_load: "memory loads",
  corpus_code_query: "code queries",
  corpus_log: "session logs",
  corpus_save: "state saves",
};

export async function getUsageSummary(projects: string[]): Promise<UsageSummary | null> {
  const sb = getSupabase();
  if (!sb) return demoSummary();

  const { data, error } = await sb
    .from("usage_stats")
    .select("project,agent,tool,event_count,total_tokens")
    .in("project", projects);
  if (error || !data || data.length === 0) return null;

  return summarize(data as UsageStatsRow[]);
}

function summarize(rows: UsageStatsRow[]): UsageSummary | null {
  let totalEvents = 0;
  const byTool = new Map<string, { events: number; tokens: number }>();

  for (const r of rows) {
    totalEvents += r.event_count;
    const label = TOOL_LABELS[r.tool] ?? r.tool;
    const tool = byTool.get(label) ?? { events: 0, tokens: 0 };
    tool.events += r.event_count;
    tool.tokens += r.total_tokens;
    byTool.set(label, tool);
  }

  if (totalEvents === 0) return null;

  return {
    totalEvents,
    tools: [...byTool.entries()]
      .map(([label, v]) => ({ label, ...v }))
      .sort((a, b) => b.events - a.events),
  };
}

// Keeps the ledger visible before SUPABASE_* env vars are configured.
function demoSummary(): UsageSummary {
  return summarize([
    { project: "corpus-dev", agent: "claude-code", tool: "corpus_load", event_count: 42, total_tokens: 26400 },
    { project: "corpus-dev", agent: "claude-code", tool: "corpus_code_query", event_count: 18, total_tokens: 21600 },
    { project: "corpus-dev", agent: "claude-code", tool: "corpus_log", event_count: 57, total_tokens: 3900 },
    { project: "corpus-dev", agent: "gemini", tool: "corpus_save", event_count: 9, total_tokens: 5200 },
  ])!;
}
