"use client";

import { useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import type { WorkspaceGraph, WorkspaceNode } from "@/lib/similarity";

// react-force-graph touches window on import — must be client-only.
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

// Graphify-style palette: soft, saturated dots on near-black.
export const PALETTE = [
  "#7dabf8", // blue
  "#f28cb1", // pink
  "#f2c94c", // gold
  "#5fd4a2", // mint
  "#b78cf2", // violet
  "#f2a35f", // orange
  "#56cfd8", // teal
  "#f27d72", // coral
  "#a8d861", // lime
  "#93a6f8", // periwinkle
];

export function workspaceColor(slug: string): string {
  let h = 7;
  for (let i = 0; i < slug.length; i++) h = ((h * 31 + slug.charCodeAt(i)) >>> 0) % 100_000;
  return PALETTE[h % PALETTE.length];
}

interface Props {
  graph: WorkspaceGraph;
  highlight: Set<string>; // workspace ids matching the current search — these glow
  searching: boolean; // true when a query is active (dim non-matches even if none match)
  onNodeClick: (node: WorkspaceNode) => void;
}

export default function GraphView({ graph, highlight, searching, onNodeClick }: Props) {
  const fgRef = useRef<any>(null);
  const fittedRef = useRef(false);

  const data = useMemo(
    () => ({
      nodes: graph.nodes.map((n) => ({ ...n, color: workspaceColor(n.id) })),
      links: graph.edges.map((e) => ({
        source: e.source,
        target: e.target,
        weight: e.weight,
        shared: e.shared,
      })),
    }),
    [graph],
  );

  useEffect(() => {
    fittedRef.current = false;
  }, [graph]);

  // Space the constellation out: gentler charge, similarity-scaled link length.
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    fg.d3Force("charge")?.strength(-180);
    fg.d3Force("link")?.distance((l: any) => 60 + (1 - (l.weight ?? 0.2)) * 90);
  }, [data]);

  return (
    <ForceGraph2D
      ref={fgRef}
      graphData={data}
      backgroundColor="rgba(0,0,0,0)"
      onEngineStop={() => {
        if (!fittedRef.current) {
          fittedRef.current = true;
          fgRef.current?.zoomToFit(600, 90);
        }
      }}
      onNodeClick={(node: any) => onNodeClick(node as WorkspaceNode)}
      linkColor={(l: any) =>
        isHot(l, highlight) ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.09)"
      }
      linkWidth={(l: any) => (isHot(l, highlight) ? 1.8 : 0.4 + (l.weight ?? 0) * 2.5)}
      linkDirectionalParticles={(l: any) => (isHot(l, highlight) ? 2 : 0)}
      linkDirectionalParticleWidth={2}
      linkLabel={(l: any) =>
        l.shared?.length
          ? `<div style="font-family:monospace;font-size:11px">linked via: ${l.shared.join(", ")}</div>`
          : ""
      }
      nodeRelSize={5}
      nodeVal={(n: any) => 1 + Math.sqrt(n.docCount ?? 0)}
      nodeLabel={(n: any) =>
        `<div style="font-family:Inter,sans-serif;font-size:12px;max-width:240px">
           <b>${esc(n.name)}</b> · ${n.docCount} doc${n.docCount === 1 ? "" : "s"}<br/>
           <span style="opacity:0.65">${(n.keywords ?? []).slice(0, 5).map(esc).join(" · ")}</span>
         </div>`
      }
      nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, scale: number) => {
        const on = highlight.has(node.id);
        const dim = searching && !on;
        const r = 4 + Math.sqrt(node.docCount ?? 0) * 2.2 + (on ? 2 : 0);

        if (on) {
          ctx.shadowColor = node.color;
          ctx.shadowBlur = 26;
        }
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
        ctx.fillStyle = node.color;
        ctx.globalAlpha = dim ? 0.14 : 0.95;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Faint halo ring, like the landing's graph mock.
        if (!dim) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, r + 2.5, 0, 2 * Math.PI);
          ctx.strokeStyle = node.color;
          ctx.globalAlpha = on ? 0.5 : 0.18;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        ctx.globalAlpha = 1;

        if ((scale > 1.1 || on) && !dim) {
          ctx.font = `${on ? 600 : 400} ${11 / scale}px Inter, sans-serif`;
          ctx.fillStyle = on ? "#ffffff" : "rgba(228,228,231,0.75)";
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillText(truncate(node.name, 28), node.x, node.y + r + 3);
        }
      }}
      nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
        const r = 6 + Math.sqrt(node.docCount ?? 0) * 2.2;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 3, 0, 2 * Math.PI);
        ctx.fill();
      }}
    />
  );
}

function isHot(link: any, highlight: Set<string>): boolean {
  const s = typeof link.source === "object" ? link.source.id : link.source;
  const t = typeof link.target === "object" ? link.target.id : link.target;
  return highlight.has(s) && highlight.has(t);
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function esc(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
