"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";

/**
 * A "boot flicker" overlay plus content fade, both keyed by pathname and
 * driven by plain CSS @keyframes (globals.css) rather than Framer Motion's
 * `initial`/`animate` — those bake into the SSR'd HTML as an inline style,
 * so a full-screen opaque overlay would stay opaque until JS hydrates,
 * which on a slow connection reads as "the page shows nothing". CSS
 * animations start on paint, no JS required.
 */
export default function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <>
      <div
        key={`overlay-${pathname}`}
        aria-hidden="true"
        className="route-boot-overlay pointer-events-none fixed inset-0 z-[60] overflow-hidden bg-void"
      >
        <div className="grid-bg" />
        <div className="route-boot-sweep absolute inset-x-0 h-20 bg-gradient-to-b from-transparent via-neon-500/25 to-transparent" />
        <p className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-display text-xs uppercase tracking-[0.4em] text-neon-500/90 text-glow">
          {"> loading_module"}
          <span className="caret-blink" />
        </p>
      </div>

      <div key={`content-${pathname}`} className="fade-slide-in flex min-h-full flex-1 flex-col">
        {children}
      </div>
    </>
  );
}
