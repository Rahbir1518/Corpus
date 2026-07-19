"use client";

import { useMemo } from "react";

// A "cloud-pruned" bonsai: an S-curved tapered trunk with rounded foliage pads.
// Each pad = one document; click it to open the doc, hover to grow/glow it. Pads
// are placed with a phyllotaxis (sunflower) distribution so the canopy stays even
// and non-overlapping for any document count.

interface Doc {
  name: string;
}
interface Props {
  documents: Doc[];
  activeName: string | null;
  onSelect: (name: string) => void;
}

const W = 620;
const H = 480;
const GA = Math.PI * (3 - Math.sqrt(5)); // golden angle ≈ 137.5°

type Pt = { x: number; y: number };

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

// Sample a cubic bézier into points.
function sampleCubic(p0: Pt, c0: Pt, c1: Pt, p1: Pt, steps: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    const x = u * u * u * p0.x + 3 * u * u * t * c0.x + 3 * u * t * t * c1.x + t * t * t * p1.x;
    const y = u * u * u * p0.y + 3 * u * u * t * c0.y + 3 * u * t * t * c1.y + t * t * t * p1.y;
    pts.push({ x, y });
  }
  return pts;
}

// Build a filled, tapered ribbon (a fat->thin limb) from a centreline polyline.
function ribbon(points: Pt[], wStart: number, wEnd: number): string {
  const n = points.length;
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(n - 1, i + 1)];
    const tx = next.x - prev.x;
    const ty = next.y - prev.y;
    const len = Math.hypot(tx, ty) || 1;
    const nx = -ty / len;
    const ny = tx / len;
    const w = (wStart + (wEnd - wStart) * (i / (n - 1))) / 2;
    left.push({ x: points[i].x + nx * w, y: points[i].y + ny * w });
    right.push({ x: points[i].x - nx * w, y: points[i].y - ny * w });
  }
  const d = [
    `M ${left[0].x.toFixed(1)} ${left[0].y.toFixed(1)}`,
    ...left.slice(1).map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`),
    ...right.reverse().map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`),
    "Z",
  ].join(" ");
  return d;
}

export default function BonsaiTree({ documents, activeName, onSelect }: Props) {
  const { trunkPath, boughPaths, pads, canopyBase } = useMemo(() => {
    const n = documents.length;

    // Canopy grows a little with document count but stays within the frame.
    const canopyRx = Math.min(232, 150 + n * 5);
    const canopyRy = Math.min(150, 108 + n * 3);
    const Cx = W / 2 + 8;
    const Cy = 172;
    const base: Pt = { x: Cx - 4, y: Cy + canopyRy * 0.7 }; // where trunk meets canopy

    // S-curved tapered trunk from the pot up to the canopy base.
    const potTop: Pt = { x: W / 2, y: H - 74 };
    const trunkPts = sampleCubic(
      potTop,
      { x: W / 2 - 70, y: H - 200 },
      { x: W / 2 + 74, y: Cy + canopyRy },
      base,
      26
    );
    const trunkPath = ribbon(trunkPts, 42, 12);

    // A couple of main boughs fanning up into the canopy (structure/depth).
    const boughPaths = [
      ribbon(
        sampleCubic(base, { x: base.x - 40, y: base.y - 30 }, { x: Cx - 120, y: Cy + 30 }, { x: Cx - 150, y: Cy - 6 }, 16),
        14,
        4
      ),
      ribbon(
        sampleCubic(base, { x: base.x + 30, y: base.y - 34 }, { x: Cx + 120, y: Cy + 20 }, { x: Cx + 150, y: Cy - 10 }, 16),
        14,
        4
      ),
      ribbon(
        sampleCubic(base, { x: base.x, y: base.y - 50 }, { x: Cx + 8, y: Cy + 40 }, { x: Cx + 4, y: Cy - canopyRy * 0.6 }, 16),
        14,
        4
      ),
    ];

    // Foliage pads via phyllotaxis inside the canopy ellipse.
    const pads = documents.map((doc, i) => {
      const t = (i + 0.5) / n;
      const r = Math.sqrt(t);
      const a = i * GA;
      const x = Cx + Math.cos(a) * r * canopyRx;
      const y = Cy + Math.sin(a) * r * canopyRy;
      const rad = 30 - r * 8 + ((i * 7) % 5); // inner pads a touch bigger; slight variance
      // a short curved stem from the canopy base to the pad (drawn behind pads)
      const stem = `M ${base.x} ${base.y} Q ${(base.x + x) / 2 + (i % 2 ? 18 : -18)} ${(base.y + y) / 2} ${x.toFixed(1)} ${y.toFixed(1)}`;
      return { doc, x, y, rad, stem, i };
    });

    return { trunkPath, boughPaths, pads, canopyBase: base };
  }, [documents]);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      style={{ display: "block", width: "100%", height: "auto" }}
      role="tree"
      aria-label="Project documents"
    >
      <defs>
        <radialGradient id="foliage" cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="55%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#15803d" />
        </radialGradient>
        <radialGradient id="foliageActive" cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#a5b4fc" />
          <stop offset="55%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#4338ca" />
        </radialGradient>
        <linearGradient id="bark" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#4a3728" />
          <stop offset="45%" stopColor="#7c5e48" />
          <stop offset="100%" stopColor="#3a2b20" />
        </linearGradient>
        <radialGradient id="soil" cx="50%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#3a2f2a" />
          <stop offset="100%" stopColor="#221b17" />
        </radialGradient>
        <filter id="softGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ground shadow */}
      <ellipse cx={W / 2} cy={H - 40} rx="120" ry="14" fill="rgba(0,0,0,0.35)" />

      {/* pot */}
      <g>
        <path
          d={`M ${W / 2 - 78} ${H - 78} L ${W / 2 + 78} ${H - 78} L ${W / 2 + 58} ${H - 40} Q ${W / 2} ${H - 30} ${W / 2 - 58} ${H - 40} Z`}
          fill="#1c1c26"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="1.5"
        />
        <rect x={W / 2 - 88} y={H - 88} width="176" height="14" rx="5" fill="#242433" stroke="rgba(255,255,255,0.14)" strokeWidth="1.5" />
        <ellipse cx={W / 2} cy={H - 81} rx="80" ry="6" fill="url(#soil)" />
      </g>

      {/* trunk + boughs */}
      <path d={trunkPath} fill="url(#bark)" stroke="rgba(0,0,0,0.35)" strokeWidth="0.6" />
      {boughPaths.map((d, i) => (
        <path key={i} d={d} fill="url(#bark)" opacity="0.95" />
      ))}

      {/* stems behind pads */}
      {pads.map((p) => {
        const active = p.doc.name === activeName;
        return (
          <path
            key={`stem-${p.doc.name}`}
            d={p.stem}
            fill="none"
            stroke={active ? "#6366f1" : "#5a4636"}
            strokeWidth={active ? 3 : 2}
            strokeLinecap="round"
            opacity={active ? 0.85 : 0.5}
          />
        );
      })}

      {/* foliage pads (documents) */}
      {pads.map((p) => {
        const active = p.doc.name === activeName;
        const fill = active ? "url(#foliageActive)" : "url(#foliage)";
        return (
          <g
            key={p.doc.name}
            className={`bonsai-pad${active ? " is-active" : ""}`}
            onClick={() => onSelect(p.doc.name)}
            style={{ ["--i" as string]: p.i }}
          >
            <title>{p.doc.name}</title>
            {/* generous invisible hit area */}
            <circle cx={p.x} cy={p.y} r={p.rad + 12} fill="transparent" />
            <g className="pad-sway">
              <g className="pad-shape" filter={active ? "url(#softGlow)" : undefined}>
                {active && <circle cx={p.x} cy={p.y} r={p.rad + 7} fill="none" stroke="#818cf8" strokeWidth="2" opacity="0.9" />}
                {/* clustered blob */}
                <circle cx={p.x - p.rad * 0.5} cy={p.y + p.rad * 0.35} r={p.rad * 0.72} fill={fill} />
                <circle cx={p.x + p.rad * 0.5} cy={p.y + p.rad * 0.3} r={p.rad * 0.72} fill={fill} />
                <circle cx={p.x} cy={p.y + p.rad * 0.5} r={p.rad * 0.68} fill={fill} />
                <circle cx={p.x - p.rad * 0.35} cy={p.y - p.rad * 0.45} r={p.rad * 0.62} fill={fill} />
                <circle cx={p.x + p.rad * 0.35} cy={p.y - p.rad * 0.45} r={p.rad * 0.62} fill={fill} />
                <circle cx={p.x} cy={p.y} r={p.rad * 0.95} fill={fill} />
                {/* top highlight */}
                <circle cx={p.x - p.rad * 0.3} cy={p.y - p.rad * 0.4} r={p.rad * 0.3} fill="rgba(255,255,255,0.28)" />
              </g>
            </g>
            <text
              x={p.x}
              y={p.y + p.rad + 15}
              textAnchor="middle"
              className="bonsai-label"
              fill={active ? "#ffffff" : "#aeb6c2"}
              fontSize="12.5"
              fontWeight={active ? 700 : 500}
            >
              {truncate(p.doc.name, 16)}
            </text>
          </g>
        );
      })}
      {/* keep canopyBase referenced for layout clarity */}
      <circle cx={canopyBase.x} cy={canopyBase.y} r="0" fill="none" />
    </svg>
  );
}
