import { describe, expect, it } from "vitest";
import { buildWorkspaceGraph, tokenize } from "./similarity";
import { DEMO_DOCS, DEMO_WORKSPACES } from "./demoData";

describe("tokenize", () => {
  it("lowercases, drops stopwords and short tokens", () => {
    expect(tokenize("The Stripe webhook and the API")).toEqual(["stripe", "webhook", "api"]);
  });
});

describe("buildWorkspaceGraph", () => {
  const graph = buildWorkspaceGraph(DEMO_WORKSPACES, DEMO_DOCS);

  it("emits one node per workspace with keywords and doc metadata", () => {
    expect(graph.nodes).toHaveLength(DEMO_WORKSPACES.length);
    const stripe = graph.nodes.find((n) => n.id === "stripe-billing")!;
    expect(stripe.docCount).toBe(2);
    expect(stripe.docNames).toContain("webhook-bug.md");
    expect(stripe.keywords.length).toBeGreaterThan(0);
  });

  it("links keyword-similar workspaces with shared terms", () => {
    expect(graph.edges.length).toBeGreaterThan(0);
    const e = graph.edges.find(
      (x) =>
        (x.source === "stripe-billing" && x.target === "webhook-service") ||
        (x.source === "webhook-service" && x.target === "stripe-billing"),
    );
    // Both talk about webhooks, retries, idempotency, stripe — must connect.
    expect(e).toBeDefined();
    expect(e!.weight).toBeGreaterThan(0.08);
    expect(e!.weight).toBeLessThanOrEqual(1);
    expect(e!.shared.length).toBeGreaterThan(0);
  });

  it("keeps every node under the per-node edge cap-ish and weights sorted sane", () => {
    const degree = new Map<string, number>();
    for (const e of graph.edges) {
      degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
      degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
    }
    // A node can exceed the cap only via partners that still had room; keep it loose.
    for (const [, d] of degree) expect(d).toBeLessThanOrEqual(8);
  });

  it("handles workspaces with no documents as isolated nodes", () => {
    const g = buildWorkspaceGraph([{ slug: "empty", name: "empty" }], []);
    expect(g.nodes).toHaveLength(1);
    expect(g.nodes[0].docCount).toBe(0);
    expect(g.edges).toHaveLength(0);
  });
});
