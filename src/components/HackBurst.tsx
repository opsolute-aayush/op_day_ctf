"use client";

import { useEffect, useRef } from "react";

// Same glyph set MatrixRain uses, so this burst reads as "the same digital
// rain, exploding" rather than an unrelated effect bolted on.
const GLYPHS = "01ABCDEF$#%&アイウエオカキクケコ".split("");
const PALETTE = ["#39FF14", "#00F0FF", "#FF2ECC", "#FFD400"];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vr: number;
  char: string;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

interface HackBurstProps {
  /** Fires the burst the moment this flips true — one-shot, ignores further changes. */
  active: boolean;
  /** More particles, longer burst — reserved for the 1st-place win. */
  intense?: boolean;
  /** Worked into the particle color pool so the burst carries the team's own color too. */
  accentColor?: string;
}

/**
 * Cyberpunk stand-in for canvas-confetti's paper-square shower — a burst of
 * glowing hacker glyphs (the MatrixRain alphabet) that explodes from center
 * and falls with gravity. Replaces the old two-cannon side-of-screen confetti,
 * which read as a generic party effect rather than "you just breached the mainframe."
 */
export default function HackBurst({ active, intense = false, accentColor }: HackBurstProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    if (!active || firedRef.current) return;
    firedRef.current = true;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    const colors = accentColor ? [accentColor, ...PALETTE] : PALETTE;
    const count = intense ? 150 : 70;
    const particles: Particle[] = Array.from({ length: count }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * (intense ? 9 : 6);
      return {
        x: canvas.width / 2,
        y: canvas.height * 0.35,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        rotation: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        char: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 0,
        maxLife: 70 + Math.random() * (intense ? 70 : 35),
        size: 12 + Math.random() * 10,
      };
    });

    let raf = 0;
    function frame() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      let alive = false;
      for (const p of particles) {
        p.life += 1;
        if (p.life > p.maxLife) continue;
        alive = true;
        p.vy += 0.12;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vr;
        const t = p.life / p.maxLife;
        const alpha = t < 0.75 ? 1 : Math.max(0, 1 - (t - 0.75) / 0.25);

        ctx!.save();
        ctx!.translate(p.x, p.y);
        ctx!.rotate(p.rotation);
        ctx!.globalAlpha = alpha;
        ctx!.font = `${p.size}px monospace`;
        ctx!.fillStyle = p.color;
        ctx!.shadowColor = p.color;
        ctx!.shadowBlur = 8;
        ctx!.fillText(p.char, 0, 0);
        ctx!.restore();
      }
      if (alive) {
        raf = requestAnimationFrame(frame);
      } else {
        ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      }
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [active, intense, accentColor]);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[65]" />;
}
