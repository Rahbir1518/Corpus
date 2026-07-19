"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type ForceGraph2DGeneric from "react-force-graph-2d";
import type { ForceGraphMethods, LinkObject, NodeObject } from "react-force-graph-2d";
import type { WorkspaceWithDocs } from "@/lib/workspaces";
import { isActive } from "@/lib/activity";

// react-force-graph touches window on import — must be client-only. dynamic()
// collapses the component's generics to {}, so cast back to the library's
// generic signature to keep the node/link callbacks typed.
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
}) as unknown as typeof ForceGraph2DGeneric;

export const ROOT_ID = "__root__";

// Muted pastels on the dark glass background — one hue per workspace cluster,
// desaturated to stay inside the landing page's monochrome-first palette.
export const CLUSTER_COLORS = [
  "#a5b4fc", // indigo
  "#7dd3fc", // sky
  "#f0abfc", // fuchsia
  "#fcd34d", // amber
  "#86efac", // green
  "#fda4af", // rose
  "#5eead4", // teal
  "#c4b5fd", // violet
];

export function clusterColor(index: number): string {
  return CLUSTER_COLORS[index % CLUSTER_COLORS.length];
}

export function docNodeId(workspaceId: string, docName: string): string {
  return `${workspaceId}::${docName}`;
}

export interface GraphSelection {
  workspaceId: string;
  docName?: string;
}

interface Props {
  workspaces: WorkspaceWithDocs[];
  rootLabel: string;
  highlight: Set<string>; // node ids matching the current search
  searchActive: boolean; // true while a query is entered — non-matches dim
  onSelect: (sel: GraphSelection) => void;
}

interface CGNode {
  id: string;
  kind: "root" | "workspace" | "doc";
  label: string;
  color: string;
  wsId?: string;
  docName?: string;
  // Workspace hubs only. Derived from the write trail (usage_events +
  // documents.updated_at) rather than workspace_members, which nothing populates —
  // see lib/activity.ts.
  active?: boolean;
}

// Only the extra payload — source/target stay the library's own union, since
// the simulation mutates them from ids into node objects at runtime.
interface CGLink {
  kind: "trunk" | "leaf";
  dashed?: boolean; // trunk to a workspace with no recent writes
}

type FGNode = NodeObject<CGNode>;
type FGLink = LinkObject<CGNode, CGLink>;

export default function CorpusGraph({ workspaces, rootLabel, highlight, searchActive, onSelect }: Props) {
  const fgRef = useRef<ForceGraphMethods<FGNode, FGLink> | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setDims({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const data = useMemo(() => {
    const nodes: CGNode[] = [
      { id: ROOT_ID, kind: "root", label: rootLabel, color: "#ffffff" },
    ];
    const links: FGLink[] = [];

    workspaces.forEach((ws, i) => {
      const color = clusterColor(i);
      const active = isActive(ws.activity);
      nodes.push({
        id: ws.id,
        kind: "workspace",
        label: ws.name,
        color,
        wsId: ws.id,
        active,
      });
      links.push({
        source: ROOT_ID,
        target: ws.id,
        kind: "trunk",
        // Dashed trunk = nothing has been written there recently, so the cluster
        // reads as dormant rather than live.
        dashed: !active,
      });

      for (const doc of ws.documents) {
        const id = docNodeId(ws.id, doc.name);
        nodes.push({ id, kind: "doc", label: doc.name, color, wsId: ws.id, docName: doc.name });
        links.push({ source: ws.id, target: id, kind: "leaf" });
      }
    });

    return { nodes, links };
  }, [workspaces, rootLabel]);

  // Tree shape: long trunks root→workspace, short leaves workspace→doc, so each
  // workspace reads as its own tight cluster hanging off the center.
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    fg.d3Force("link")?.distance((l: FGLink) => (l.kind === "trunk" ? 160 : 42));
    fg.d3Force("charge")?.strength(-140);
    fg.d3ReheatSimulation();
  }, [data]);

  // Re-heat when the highlight set changes so glows animate in.
  useEffect(() => {
    fgRef.current?.d3ReheatSimulation();
  }, [highlight]);

  const dimmed = (id: string) => searchActive && !highlight.has(id);
  const linkEndId = (end: FGLink["source"]): string =>
    typeof end === "object" && end !== null ? String(end.id) : String(end);

  return (
    <div ref={containerRef} className="absolute inset-0" style={{ cursor: hovered ? "pointer" : "grab" }}>
      {dims.w > 0 && (
        <ForceGraph2D<CGNode, CGLink>
          ref={fgRef}
          width={dims.w}
          height={dims.h}
          graphData={data}
          backgroundColor="rgba(0,0,0,0)"
          linkColor={(l: FGLink) => {
            if (searchActive && (dimmed(linkEndId(l.source)) || dimmed(linkEndId(l.target)))) {
              return "rgba(255,255,255,0.04)";
            }
            if (l.dashed) return "rgba(255,255,255,0.10)";
            return l.kind === "trunk" ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.12)";
          }}
          linkLineDash={(l: FGLink) => (l.dashed ? [4, 3] : null)}
          linkWidth={(l: FGLink) => (l.kind === "trunk" ? 1.2 : 0.6)}
          nodeRelSize={5}
          onNodeClick={(node: FGNode) => {
            if (node.kind === "workspace" && node.wsId) onSelect({ workspaceId: node.wsId });
            else if (node.kind === "doc" && node.wsId) {
              onSelect({ workspaceId: node.wsId, docName: node.docName });
            }
          }}
          onNodeHover={(node: FGNode | null) =>
            setHovered(node && node.kind !== "root" ? node.id : null)
          }
          nodeCanvasObject={(node: FGNode, ctx: CanvasRenderingContext2D, scale: number) => {
            const x = node.x ?? 0;
            const y = node.y ?? 0;
            const hot = highlight.has(node.id);
            const low = dimmed(node.id);
            const r = node.kind === "root" ? 10 : node.kind === "workspace" ? 7 : hot ? 5 : 3.5;

            if (hot || node.id === hovered) {
              ctx.shadowColor = node.color;
              ctx.shadowBlur = 24;
            }
            ctx.beginPath();
            ctx.arc(x, y, r, 0, 2 * Math.PI);
            ctx.fillStyle = node.color;
            ctx.globalAlpha = low ? 0.12 : hot ? 1 : node.kind === "doc" ? 0.75 : 0.95;
            ctx.fill();
            ctx.shadowBlur = 0;

            if (node.kind === "root" || node.kind === "workspace") {
              ctx.beginPath();
              ctx.arc(x, y, r + 3, 0, 2 * Math.PI);
              ctx.strokeStyle = node.color;
              ctx.globalAlpha = low ? 0.08 : 0.35;
              ctx.lineWidth = 1 / scale;
              ctx.stroke();
            }
            ctx.globalAlpha = 1;

            // Small activity dot on the hub — green means memory was written to this
            // workspace in the last 24h, i.e. sessions are actually landing there.
            if (node.kind === "workspace") {
              ctx.beginPath();
              ctx.arc(x + r * 0.95, y - r * 0.95, 2.4, 0, 2 * Math.PI);
              ctx.fillStyle = node.active ? "#22c55e" : "#71717a";
              ctx.globalAlpha = low ? 0.2 : 1;
              ctx.fill();
              ctx.globalAlpha = 1;
            }

            const showLabel =
              node.kind !== "doc" || hot || node.id === hovered || scale > 1.6;
            if (showLabel && !low) {
              const serif = node.kind !== "doc";
              const size = (serif ? 13 : 10.5) / scale;
              ctx.font = `${hot ? 600 : 400} ${size}px ${serif ? '"Instrument Serif", Georgia, serif' : "Inter, sans-serif"}`;
              ctx.fillStyle = hot || node.kind === "root" ? "#ffffff" : "rgba(228,228,231,0.75)";
              ctx.textAlign = "center";
              ctx.textBaseline = "top";
              ctx.fillText(truncate(node.label, 28), x, y + r + 4 / scale);
            }
          }}
          nodePointerAreaPaint={(node: FGNode, color: string, ctx: CanvasRenderingContext2D) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(node.x ?? 0, node.y ?? 0, 9, 0, 2 * Math.PI);
            ctx.fill();
          }}
        />
      )}
    </div>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
