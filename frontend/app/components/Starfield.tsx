"use client";

import { useEffect, useRef } from "react";

// Animated night-sky background for /dashboard. A single fixed, click-through
// canvas that layers four effects tuned "subtle & calm":
//   - twinkling stars (per-star opacity oscillation)
//   - slow parallax drift (near layers move faster than far ones)
//   - occasional shooting stars (streak + fading tail, every ~6-10s)
//   - cursor-reactive constellation lines (faint links between nearby stars)
// Respects prefers-reduced-motion: paints one static frame and stops.

interface Star {
  x: number;
  y: number;
  z: number; // depth layer 0..1 (0 = far, 1 = near) -> drift speed + size + brightness
  r: number;
  baseAlpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
  tint: string; // "255,255,255" (white) .. pale blue for variety
}

interface Shooter {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // 0..1 remaining
  len: number;
}

const ACCENT = "99, 102, 241"; // --accent rgb, for constellation tint

export default function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const canvas: HTMLCanvasElement = canvasEl;
    const context = canvas.getContext("2d");
    if (!context) return;
    // Bind to an explicitly non-null type so the nested draw closures don't
    // re-widen it back to `... | null`.
    const ctx: CanvasRenderingContext2D = context;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let stars: Star[] = [];
    const shooters: Shooter[] = [];
    const mouse = { x: -9999, y: -9999 };

    // Dense but calm starfield, scaled to viewport area (matches the screenshot's
    // richly-populated sky). Most stars are tiny; a few near ones are brighter.
    function buildStars() {
      const count = Math.min(600, Math.round((width * height) / 3200));
      stars = Array.from({ length: count }, () => {
        const z = Math.pow(Math.random(), 1.6); // bias toward small/far stars
        // Mostly white, some pale blue, a rare warm one — like a real sky.
        const roll = Math.random();
        const tint =
          roll < 0.7 ? "255,255,255" : roll < 0.93 ? "200,220,255" : "255,240,214";
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          z,
          r: 0.35 + z * 1.2,
          baseAlpha: 0.3 + z * 0.55,
          twinkleSpeed: 0.6 + Math.random() * 1.6,
          twinklePhase: Math.random() * Math.PI * 2,
          tint,
        };
      });
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildStars();
    }

    function paintSky() {
      // Deep navy at the top easing to a slightly lighter blue toward the
      // horizon — matches the landing hero's night-sky tone.
      const g = ctx.createLinearGradient(0, 0, 0, height);
      g.addColorStop(0, "#050a18");
      g.addColorStop(0.55, "#0a1730");
      g.addColorStop(1, "#132a46");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);

      // Faint atmospheric haze low on the horizon for depth.
      const haze = ctx.createRadialGradient(
        width * 0.5,
        height * 1.05,
        0,
        width * 0.5,
        height * 1.05,
        Math.max(width, height) * 0.9
      );
      haze.addColorStop(0, "rgba(60, 110, 180, 0.16)");
      haze.addColorStop(1, "rgba(60, 110, 180, 0)");
      ctx.fillStyle = haze;
      ctx.fillRect(0, 0, width, height);
    }

    function drawStars(t: number) {
      for (const s of stars) {
        const twinkle = reduceMotion
          ? 1
          : 0.65 + 0.35 * Math.sin(t * 0.001 * s.twinkleSpeed + s.twinklePhase);
        const alpha = (s.baseAlpha * twinkle).toFixed(3);
        // Soft glow on the brighter (nearer) stars for a twinkly, atmospheric look.
        if (s.r > 1.1) {
          ctx.shadowColor = `rgba(${s.tint},${alpha})`;
          ctx.shadowBlur = 4;
        } else {
          ctx.shadowBlur = 0;
        }
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${s.tint},${alpha})`;
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    }

    // Glowing constellation that forms around the cursor: bright links between
    // nearby stars, lines reaching from the pointer itself, highlighted nodes,
    // and a soft halo at the cursor — so the interaction really pops.
    function drawConstellations() {
      if (mouse.x < -1000) return;
      const R = 170; // link radius around cursor
      const near = stars.filter(
        (s) => Math.abs(s.x - mouse.x) < R && Math.abs(s.y - mouse.y) < R
      );

      ctx.save();
      ctx.lineCap = "round";

      // 1) star-to-star links
      for (let i = 0; i < near.length; i++) {
        const a = near[i];
        const dca = Math.hypot(a.x - mouse.x, a.y - mouse.y);
        if (dca > R) continue;
        const cursorFade = 1 - dca / R; // stronger closer to the cursor
        for (let j = i + 1; j < near.length; j++) {
          const b = near[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d > 120) continue;
          const alpha = 0.22 * (1 - d / 120) * cursorFade;
          if (alpha < 0.015) continue;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(${ACCENT},${alpha.toFixed(3)})`;
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }
      }

      // 2) lines reaching from the cursor to the closest stars
      const byDist = near
        .map((s) => ({ s, d: Math.hypot(s.x - mouse.x, s.y - mouse.y) }))
        .filter((o) => o.d < R)
        .sort((p, q) => p.d - q.d)
        .slice(0, 4);
      for (const { s, d } of byDist) {
        const alpha = 0.18 * (1 - d / R);
        ctx.beginPath();
        ctx.moveTo(mouse.x, mouse.y);
        ctx.lineTo(s.x, s.y);
        ctx.strokeStyle = `rgba(180,200,255,${alpha.toFixed(3)})`;
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }

      // 3) gently lift the connected nodes
      for (const { s, d } of byDist) {
        const alpha = 0.4 * (1 - d / R);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r + 0.6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(210,225,255,${alpha.toFixed(3)})`;
        ctx.fill();
      }
      ctx.restore();

      // 4) very soft indigo halo at the cursor
      const halo = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 48);
      halo.addColorStop(0, `rgba(${ACCENT},0.06)`);
      halo.addColorStop(1, `rgba(${ACCENT},0)`);
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 48, 0, Math.PI * 2);
      ctx.fill();
    }

    function spawnShooter() {
      const fromLeft = Math.random() < 0.5;
      const speed = 6 + Math.random() * 4;
      const angle = (Math.PI / 8) + Math.random() * (Math.PI / 10); // shallow downward
      shooters.push({
        x: fromLeft ? -50 : width * (0.3 + Math.random() * 0.6),
        y: Math.random() * height * 0.5,
        vx: Math.cos(angle) * speed * (fromLeft ? 1 : 1),
        vy: Math.sin(angle) * speed,
        life: 1,
        len: 120 + Math.random() * 80,
      });
    }

    function drawShooters() {
      for (let i = shooters.length - 1; i >= 0; i--) {
        const sh = shooters[i];
        sh.x += sh.vx;
        sh.y += sh.vy;
        sh.life -= 0.012;
        if (sh.life <= 0 || sh.x > width + 60 || sh.y > height + 60) {
          shooters.splice(i, 1);
          continue;
        }
        const tailX = sh.x - (sh.vx / Math.hypot(sh.vx, sh.vy)) * sh.len;
        const tailY = sh.y - (sh.vy / Math.hypot(sh.vx, sh.vy)) * sh.len;
        const grad = ctx.createLinearGradient(sh.x, sh.y, tailX, tailY);
        grad.addColorStop(0, `rgba(255,255,255,${(0.9 * sh.life).toFixed(3)})`);
        grad.addColorStop(1, "rgba(255,255,255,0)");
        ctx.beginPath();
        ctx.moveTo(sh.x, sh.y);
        ctx.lineTo(tailX, tailY);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.stroke();
      }
    }

    // Static single frame for reduced motion.
    if (reduceMotion) {
      resize();
      paintSky();
      drawStars(0);
      const onResizeStatic = () => {
        resize();
        paintSky();
        drawStars(0);
      };
      window.addEventListener("resize", onResizeStatic);
      return () => window.removeEventListener("resize", onResizeStatic);
    }

    let raf = 0;
    let lastShoot = performance.now() + 2500;
    let nextShootGap = 6000 + Math.random() * 4000;

    function frame(t: number) {
      paintSky();

      // parallax drift: nearer stars (higher z) drift a touch faster
      for (const s of stars) {
        s.x += (0.02 + s.z * 0.06);
        s.y += (0.01 + s.z * 0.03);
        if (s.x > width + 2) s.x = -2;
        if (s.y > height + 2) s.y = -2;
      }

      drawConstellations();
      drawStars(t);

      if (t - lastShoot > nextShootGap) {
        spawnShooter();
        lastShoot = t;
        nextShootGap = 6000 + Math.random() * 4000;
      }
      drawShooters();

      raf = requestAnimationFrame(frame);
    }

    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    const onLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseout", onLeave);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseout", onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        width: "100%",
        height: "100%",
      }}
    />
  );
}
