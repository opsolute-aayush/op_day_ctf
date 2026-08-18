"use client";

import { useEffect, useRef, useState } from "react";
import { getAssignedArtFile, setAssignedArtFile } from "@/lib/artIdentity";

// Drop image files into public/arts/settings/ — no code changes needed,
// GET /api/arts/settings picks them up automatically (same convention as
// public/sounds/<category> and public/videos/<category>).
const CATEGORY = "settings";
const COLS = 42;
// Monospace glyphs are taller than they are wide, so fewer rows than cols
// are needed to preserve the source image's aspect ratio.
const CHAR_ASPECT = 0.55;
// Sparse -> dense, using the exact character set requested plus a few
// Chinese characters at the dense end for the brightest pixels.
const DENSITY = [" ", ":", ";", "!", "?", "/", "1", "0", "#", "@", "人", "機", "電"];
// What a cell can flicker into mid-glitch — swapped back to the real
// (brightness-derived) character a moment later.
const GLITCH_ALPHABET = ["1", "0", "@", "!", "?", "/", ";", ":", "人", "機", "電"];

function imageToGrid(img: HTMLImageElement, cols: number): string[][] {
  const rows = Math.max(1, Math.round(cols * (img.naturalHeight / img.naturalWidth) * CHAR_ASPECT));
  const canvas = document.createElement("canvas");
  canvas.width = cols;
  canvas.height = rows;
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];
  // Letting the browser scale the whole image down to a cols×rows canvas
  // in one drawImage call does the downsampling/averaging for us — each
  // resulting pixel is effectively one character cell's brightness.
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

/**
 * A character-art render of one image assigned to this device, living as a
 * fixed background layer pinned to the right side of the viewport — not a
 * panel in the page's content flow. Callers must keep their own content
 * clear of that region (see settings/page.tsx's content column width) since
 * nothing is meant to ever render on top of it here.
 */
export default function AsciiOperative() {
  const [grid, setGrid] = useState<string[][]>([]);
  const spanRefs = useRef<(HTMLSpanElement | null)[][]>([]);
  const [status, setStatus] = useState<"loading" | "empty" | "ready">("loading");

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

      // Keep the same assigned image across visits if it still exists;
      // otherwise (first visit, or it was removed) assign a fresh random one.
      const saved = getAssignedArtFile();
      const file = saved && files.includes(saved) ? saved : files[Math.floor(Math.random() * files.length)];
      if (file !== saved) setAssignedArtFile(file);

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

  // Periodically flickers a handful of cells (or a whole row/column) inside
  // the art's own silhouette to a random glitch character, then reverts —
  // driven via direct span refs, not React state, so it never re-renders
  // the whole grid just to swap a few characters.
  useEffect(() => {
    if (grid.length === 0) return;

    const interval = setInterval(() => {
      const targets: Array<[number, number]> = [];
      if (Math.random() < 0.4) {
        const horizontal = Math.random() < 0.5;
        if (horizontal) {
          const r = Math.floor(Math.random() * grid.length);
          for (let c = 0; c < grid[r].length; c++) if (grid[r][c] !== " ") targets.push([r, c]);
        } else {
          const c = Math.floor(Math.random() * grid[0].length);
          for (let r = 0; r < grid.length; r++) if (grid[r][c] !== " ") targets.push([r, c]);
        }
      } else {
        const count = 6 + Math.floor(Math.random() * 10);
        for (let i = 0; i < count; i++) {
          const r = Math.floor(Math.random() * grid.length);
          const c = Math.floor(Math.random() * grid[r].length);
          if (grid[r][c] !== " ") targets.push([r, c]);
        }
      }

      for (const [r, c] of targets) {
        const el = spanRefs.current[r]?.[c];
        if (!el) continue;
        el.textContent = GLITCH_ALPHABET[Math.floor(Math.random() * GLITCH_ALPHABET.length)];
        el.classList.add("char-glitch-flash");
        setTimeout(() => {
          el.textContent = grid[r][c];
          el.classList.remove("char-glitch-flash");
        }, 150 + Math.random() * 220);
      }
    }, 350);

    return () => clearInterval(interval);
  }, [grid]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-y-0 right-0 z-0 hidden w-[52%] items-center justify-center overflow-hidden lg:flex"
      style={{
        // Fades the art's left edge into the ambient grid instead of a hard
        // rectangle boundary — makes the empty space in front of it (where
        // the content column ends) read as atmosphere, not a layout gap.
        maskImage: "linear-gradient(to right, transparent, black 14%)",
        WebkitMaskImage: "linear-gradient(to right, transparent, black 14%)",
      }}
    >
      {status === "ready" ? (
        <pre className="text-glow select-none text-center font-mono text-[10px] leading-[1.05] text-neon-500/60 xl:text-xs">
          {grid.map((row, r) => (
            <span key={r} className="block">
              {row.map((ch, c) => (
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
        status === "empty" && (
          <p className="text-center text-xs text-neon-100/20">Drop images into public/arts/settings/ to activate.</p>
        )
      )}
    </div>
  );
}
