"use client";

import { useMemo } from "react";

const GLYPHS = "01ABCDEF$#%&アイウエオカキクケコ";

function randomGlyphs(length: number) {
  return Array.from({ length }, () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]).join("\n");
}

interface MatrixRainProps {
  columns?: number;
  className?: string;
}

/** Cheap CSS-only "digital rain" backdrop — a handful of falling glyph columns. */
export default function MatrixRain({ columns = 10, className = "" }: MatrixRainProps) {
  const cols = useMemo(
    () =>
      Array.from({ length: columns }, (_, i) => ({
        left: `${(i / columns) * 100 + (i % 2 === 0 ? 1 : 4)}%`,
        duration: 3.5 + ((i * 37) % 10) / 3,
        delay: -((i * 13) % 8),
        text: randomGlyphs(22),
      })),
    [columns]
  );

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden opacity-20 ${className}`} aria-hidden="true">
      {cols.map((c, i) => (
        <span
          key={i}
          className="matrix-column"
          style={{
            left: c.left,
            animationDuration: `${c.duration}s`,
            animationDelay: `${c.delay}s`,
          }}
        >
          {c.text}
        </span>
      ))}
    </div>
  );
}
