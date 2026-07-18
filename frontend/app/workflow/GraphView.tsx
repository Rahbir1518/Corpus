"use client";

import { useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { Graph, NODE_COLORS, NodeType } from "@/lib/graph";

// react-force-graph touches window on import — must be client-only.
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

interface Props {
  graph: Graph;
  highlight: Set<string>; // node ids currently "recalled" — these glow
}

export default function GraphView({ graph, highlight }: Props) {
  const fgRef = useRef<any>(null);

  const data = useMemo(
    () => ({
      nodes: graph.nodes.map((n) => ({ ...n })),
      links: graph.edges.map((e) => ({ source: e.source_id, target: e.target_id, rel: e.rel })),
    }),
    [graph],
  );

  // Re-heat the simulation when the highlight set changes so glows animate in.
  useEffect(() => {
    if (fgRef.current) fgRef.current.d3ReheatSimulation?.();
  }, [highlight]);

  return (
    <ForceGraph2D
      ref={fgRef}
      graphData={data}
      backgroundColor="#0a0a0f"
      linkColor={(l: any) => (isHot(l, highlight) ? "#818cf8" : "rgba(255,255,255,0.10)")}
      linkWidth={(l: any) => (isHot(l, highlight) ? 2 : 0.5)}
      linkDirectionalParticles={(l: any) => (isHot(l, highlight) ? 3 : 0)}
      linkDirectionalParticleWidth={2}
      nodeRelSize={5}
      nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, scale: number) => {
        const on = highlight.has(node.id);
        const r = on ? 8 : 5;
        const color = NODE_COLORS[node.type as NodeType] ?? "#a1a1aa";

        if (on) {
          ctx.shadowColor = color;
          ctx.shadowBlur = 22;
        }
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.globalAlpha = on ? 1 : highlight.size ? 0.28 : 0.9;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        // Labels only when zoomed in enough, or always for highlighted nodes.
        if (scale > 1.4 || on) {
          const label = node.title as string;
          ctx.font = `${on ? 700 : 400} ${11 / scale}px Inter, sans-serif`;
          ctx.fillStyle = on ? "#ffffff" : "#a1a1aa";
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillText(truncate(label, 34), node.x, node.y + r + 2);
        }
      }}
      nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 8, 0, 2 * Math.PI);
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
