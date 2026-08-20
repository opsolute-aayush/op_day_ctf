"use client";

import { useEffect, useRef, useState } from "react";
import { playArtTouchSound } from "@/lib/sfx";

// Same ASCII-from-image pipeline as AsciiOperative (public/arts/<category>/,
// no code changes to add art), but repurposed as the winner page's hero
// visual instead of a faint background silhouette: bigger, centered, and
// interactive. It adds a continuous scanning "mesh line" sweep plus a
// click/tap ripple that flickers characters outward from the touch point.
// Inspired by jmswrnr.com's 3D ASCII head (mesh-line + ripple interaction)
// without the WebGL/3D engine, since this app needs to run reliably on
// phones at a live event.
const CATEGORY = "winner";
const COLS = 56;
const CHAR_ASPECT = 0.55;
const DENSITY = [" ", ":", ";", "!", "?", "/", "1", "0", "#", "@", "人", "機", "電"];
const GLITCH_ALPHABET = ["1", "0", "@", "!", "?", "/", ";", ":", "人", "機", "電"];

function imageToGrid(img: HTMLImageElement, cols: number): string[][] {
  const rows = Math.max(1, Math.round(cols * (img.naturalHeight / img.naturalWidth) * CHAR_ASPECT));
  const canvas = document.createElement("canvas");
  canvas.width = cols;
  canvas.height = rows;
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];
  ctx.drawImage(img, 0, 0, cols, rows);
  const { data } = ctx.getImageData(0, 0, cols, rows);

  const grid: string[][] = [];
  for (let y = 0; y < rows; y++) {
    const line: string[] = [];
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4;
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / (3 * 255);
      const idx = Math.min(DENSITY.length - 1, Math.floor(brightness * DENSITY.length));
      line.push(DENSITY[idx]);
    }
    grid.push(line);
  }
  return grid;
}

export default function AsciiWinnerPortrait({ accentColor }: { accentColor?: string }) {
  const [grid, setGrid] = useState<string[][]>([]);
  const [status, setStatus] = useState<"loading" | "empty" | "ready">("loading");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const spanRefs = useRef<(HTMLSpanElement | null)[][]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const res = await fetch(`/api/arts/${CATEGORY}`, { cache: "no-store" }).catch(() => null);
      const data: { files?: string[] } = res?.ok ? await res.json() : { files: [] };
      const files = data.files ?? [];
      if (cancelled) return;
      if (files.length === 0) {
        setStatus("empty");
        return;
      }
      const file = files[Math.floor(Math.random() * files.length)];
      const img = new window.Image();
      img.onload = () => {
        if (cancelled) return;
        setGrid(imageToGrid(img, COLS));
        setStatus("ready");
      };
      img.onerror = () => {
        if (!cancelled) setStatus("empty");
      };
      img.src = `/arts/${CATEGORY}/${encodeURIComponent(file)}`;
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Ambient idle flicker. A handful of cells re-roll to a glitch glyph and
  // revert, same mechanic as AsciiOperative, so the portrait never sits
  // perfectly still even with no interaction.
  useEffect(() => {
    if (grid.length === 0) return;
    const interval = setInterval(() => {
      const count = 5 + Math.floor(Math.random() * 8);
      for (let i = 0; i < count; i++) {
        const r = Math.floor(Math.random() * grid.length);
        const c = Math.floor(Math.random() * grid[r].length);
        if (grid[r][c] === " ") continue;
        const el = spanRefs.current[r]?.[c];
        if (!el) continue;
        el.textContent = GLITCH_ALPHABET[Math.floor(Math.random() * GLITCH_ALPHABET.length)];
        el.classList.add("char-glitch-flash");
        setTimeout(() => {
          el.textContent = grid[r][c];
          el.classList.remove("char-glitch-flash");
        }, 150 + Math.random() * 220);
      }
    }, 400);
    return () => clearInterval(interval);
  }, [grid]);

  // Continuous "mesh line" scan: a bright row sweeps top-to-bottom and
  // loops, standing in for the reference piece's rotating mesh-line motion.
  useEffect(() => {
    if (grid.length === 0) return;
    const spans = spanRefs.current;
    let row = 0;
    const interval = setInterval(() => {
      const prevRow = (row - 1 + grid.length) % grid.length;
      spans[prevRow]?.forEach((el) => el?.classList.remove("mesh-scan-glow"));
      spans[row]?.forEach((el) => el?.classList.add("mesh-scan-glow"));
      row = (row + 1) % grid.length;
    }, 55);
    return () => {
      clearInterval(interval);
      spans.forEach((line) => line?.forEach((el) => el?.classList.remove("mesh-scan-glow")));
    };
  }, [grid]);

  // Click/tap ripple: flickers cells in expanding rings outward from the
  // touch point, each ring firing a little later than the last.
  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (grid.length === 0 || !containerRef.current) return;
    playArtTouchSound();
    const rect = containerRef.current.getBoundingClientRect();
    const rows = grid.length;
    const cols = grid[0]?.length ?? 0;
    if (cols === 0) return;
    const originCol = Math.floor(((e.clientX - rect.left) / rect.width) * cols);
    const originRow = Math.floor(((e.clientY - rect.top) / rect.height) * rows);

    const maxRadius = Math.ceil(Math.hypot(rows, cols));
    for (let radius = 0; radius <= maxRadius; radius++) {
      setTimeout(() => {
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (grid[r][c] === " ") continue;
            if (Math.round(Math.hypot(r - originRow, c - originCol)) !== radius) continue;
            const el = spanRefs.current[r]?.[c];
            if (!el) continue;
            el.textContent = GLITCH_ALPHABET[Math.floor(Math.random() * GLITCH_ALPHABET.length)];
            el.classList.add("char-glitch-flash");
            setTimeout(() => {
              el.textContent = grid[r][c];
              el.classList.remove("char-glitch-flash");
            }, 180);
          }
        }
      }, radius * 30);
    }
  }

  if (status === "empty") {
    return (
      <p className="py-6 text-center text-xs text-neon-100/25">
        Drop a portrait image into public/arts/winner/ to activate this effect.
      </p>
    );
  }

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      className="mx-auto w-full max-w-sm cursor-crosshair select-none touch-none"
      style={{ color: accentColor ?? "var(--neon-500)" }}
    >
      {status === "ready" ? (
        <pre className="text-glow text-center font-mono text-[7px] leading-[1.05] sm:text-[8px]">
          {grid.map((line, r) => (
            <span key={r} className="block">
              {line.map((ch, c) => (
                <span
                  key={c}
                  ref={(el) => {
                    if (!spanRefs.current[r]) spanRefs.current[r] = [];
                    spanRefs.current[r][c] = el;
                  }}
                >
                  {ch}
                </span>
              ))}
            </span>
          ))}
        </pre>
      ) : (
        <p className="py-6 text-center text-xs text-neon-100/25">loading portrait…</p>
      )}
    </div>
  );
}
