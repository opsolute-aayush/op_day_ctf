"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";

// Bar colors/positions are fixed (not random) so the burst is identical
// every navigation but still reads as chaotic thanks to steps() timing and
// staggered delays — see the glitch-bar/-text-burst/-reveal keyframes in
// globals.css.
const GLITCH_BARS = [
  { top: "18%", height: "3px", color: "var(--neon-500)", delay: "0s" },
  { top: "34%", height: "6px", color: "var(--cyan-400)", delay: "0.03s" },
  { top: "51%", height: "2px", color: "var(--magenta-400)", delay: "0.06s" },
  { top: "67%", height: "4px", color: "var(--neon-500)", delay: "0.02s" },
  { top: "78%", height: "2px", color: "var(--cyan-400)", delay: "0.08s" },
];

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
        {GLITCH_BARS.map((bar, i) => (
          <div
            key={i}
            className="glitch-bar"
            style={{ top: bar.top, height: bar.height, backgroundColor: bar.color, animationDelay: bar.delay }}
          />
        ))}
        <p className="glitch-text-burst absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-display text-xs uppercase tracking-[0.4em] text-neon-500/90 text-glow">
          {"> loading_module"}
          <span className="caret-blink" />
        </p>
      </div>

      <div key={`content-${pathname}`} className="glitch-reveal flex min-h-full flex-1 flex-col">
        {children}
      </div>
    </>
  );
}
