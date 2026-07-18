// Demo workspaces + documents used when Supabase env is absent (or empty), so
// the dashboard always boots with a living graph for UI work and demos.
// Shapes match supabase/schema.sql: workspaces(slug,name) + documents(project,name,content).

import type { WorkspaceDoc, WorkspaceMeta } from "./similarity";

export const DEMO_WORKSPACES: WorkspaceMeta[] = [
  { slug: "corpus", name: "corpus" },
  { slug: "stripe-billing", name: "stripe-billing" },
  { slug: "webhook-service", name: "webhook-service" },
  { slug: "auth-portal", name: "auth-portal" },
  { slug: "mobile-app", name: "mobile-app" },
  { slug: "data-pipeline", name: "data-pipeline" },
  { slug: "ml-experiments", name: "ml-experiments" },
  { slug: "docs-site", name: "docs-site" },
];

export const DEMO_DOCS: WorkspaceDoc[] = [
  {
    project: "corpus",
    name: "architecture.md",
    content:
      "# Corpus architecture\n\nMCP server exposing corpus_load / corpus_save / corpus_log / corpus_code_query. Documents are markdown stored in Supabase keyed by (project, name). Token accounting compares each load against the full-corpus baseline. Realtime publication streams documents and usage_events to the dashboard graph.",
    updated_at: "2026-07-17T21:14:00Z",
  },
  {
    project: "corpus",
    name: "decisions.md",
    content:
      "# Decisions\n\n- Auth0 for dashboard login, Supabase service role only on the server.\n- One workspace per project slug; corpus-connect shares a workspace between agents.\n- TF-IDF keyword similarity links workspaces in the memory graph — no embedding API dependency.",
    updated_at: "2026-07-18T02:40:00Z",
  },
  {
    project: "stripe-billing",
    name: "webhook-bug.md",
    content:
      "# Stripe webhook bug\n\nThe invoice.paid webhook retries were double-crediting accounts. Fix: idempotency key on the ledger insert, verify stripe signature before parsing. Billing cycle anchor moved to UTC midnight.",
    updated_at: "2026-07-16T18:03:00Z",
  },
  {
    project: "stripe-billing",
    name: "pricing.md",
    content:
      "# Pricing model\n\nUsage-based billing on tokens saved. Stripe metered subscription, invoice preview endpoint for the dashboard. Free tier: 3 workspaces.",
    updated_at: "2026-07-15T11:20:00Z",
  },
  {
    project: "webhook-service",
    name: "retry-policy.md",
    content:
      "# Retry policy\n\nWebhook deliveries retry with exponential backoff and jitter. Idempotency keys dedupe replays. Stripe and GitHub signatures verified with per-endpoint secrets stored in Supabase vault.",
    updated_at: "2026-07-16T09:45:00Z",
  },
  {
    project: "auth-portal",
    name: "auth-decision.md",
    content:
      "# Auth decision\n\nAuth0 universal login with refresh token rotation. Session cookie is httpOnly; the callback handler redirects to /dashboard. Machine-to-machine tokens for the MCP server use client credentials.",
    updated_at: "2026-07-14T16:30:00Z",
  },
  {
    project: "auth-portal",
    name: "rbac.md",
    content:
      "# RBAC\n\nWorkspace roles: owner and member. Owner can claim a workspace, members connect via corpus-connect id. Auth0 sub is the user key everywhere.",
    updated_at: "2026-07-14T17:05:00Z",
  },
  {
    project: "mobile-app",
    name: "offline-sync.md",
    content:
      "# Offline sync\n\nLocal-first queue of mutations replayed against Supabase when connectivity returns. Conflict rule: last-write-wins on updated_at. Push notifications through APNs.",
    updated_at: "2026-07-13T20:12:00Z",
  },
  {
    project: "data-pipeline",
    name: "ingestion.md",
    content:
      "# Ingestion\n\nNightly batch pulls usage_events into the warehouse. Token savings aggregates roll up per project and agent. Dedupe on event id, watermark on occurred_at.",
    updated_at: "2026-07-15T04:00:00Z",
  },
  {
    project: "ml-experiments",
    name: "retrieval-eval.md",
    content:
      "# Retrieval eval\n\nCompared TF-IDF keyword retrieval against embedding search for corpus recall. Keyword baseline wins on exact identifiers, embeddings on paraphrase. Hybrid rerank planned. Token budget capped at 2k per recall.",
    updated_at: "2026-07-17T13:26:00Z",
  },
  {
    project: "docs-site",
    name: "landing-copy.md",
    content:
      "# Landing copy\n\nYour AI forgets everything the moment you switch tabs. Corpus gives your AI a portable memory — one lightweight file any model can read. Two commands, total recall.",
    updated_at: "2026-07-12T10:00:00Z",
  },
];
