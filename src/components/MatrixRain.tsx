"use client";

import { useMemo, useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

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
  // Glyphs are randomized only once mounted on the client — computing them
  // during render would produce different text on the server vs. the client
  // and trigger a hydration mismatch on any page where this renders as part
  // of the initial SSR output (it's otherwise harmless when mounted
  // client-side only, e.g. inside a modal that appears after an
  // interaction). useSyncExternalStore's getServerSnapshot/getSnapshot split
  // is the React-documented way to do this without an effect-driven re-render.
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );

  const cols = useMemo(
    () =>
      Array.from({ length: columns }, (_, i) => ({
        left: `${(i / columns) * 100 + (i % 2 === 0 ? 1 : 4)}%`,
        duration: 3.5 + ((i * 37) % 10) / 3,
        delay: -((i * 13) % 8),
        text: mounted ? randomGlyphs(22) : "",
      })),
    [columns, mounted]
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
