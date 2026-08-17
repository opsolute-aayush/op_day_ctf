"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";

// Bar/block colors/positions are fixed (not random) so the burst is identical
// every navigation but still reads as chaotic thanks to steps() timing and
// staggered delays — see the glitch-bar/-noise-block/-text-burst/-reveal
// keyframes in globals.css.
const GLITCH_BARS = [
  { top: "12%", left: "0%", width: "100%", height: "3px", color: "var(--neon-500)", delay: "0s" },
  { top: "23%", left: "8%", width: "55%", height: "7px", color: "var(--cyan-400)", delay: "0.03s" },
  { top: "34%", left: "0%", width: "100%", height: "2px", color: "var(--magenta-400)", delay: "0.06s" },
  { top: "45%", left: "40%", width: "60%", height: "5px", color: "var(--neon-500)", delay: "0.01s" },
  { top: "56%", left: "0%", width: "35%", height: "4px", color: "var(--cyan-400)", delay: "0.07s" },
  { top: "67%", left: "0%", width: "100%", height: "2px", color: "var(--magenta-400)", delay: "0.02s" },
  { top: "78%", left: "20%", width: "70%", height: "6px", color: "var(--neon-500)", delay: "0.05s" },
  { top: "88%", left: "0%", width: "100%", height: "3px", color: "var(--cyan-400)", delay: "0.04s" },
];

const NOISE_BLOCKS = [
  { top: "15%", left: "62%", width: "14%", height: "9%", color: "var(--magenta-400)", delay: "0.02s" },
  { top: "48%", left: "8%", width: "10%", height: "14%", color: "var(--cyan-400)", delay: "0.05s" },
  { top: "70%", left: "70%", width: "18%", height: "8%", color: "var(--neon-500)", delay: "0.08s" },
  { top: "30%", left: "30%", width: "8%", height: "6%", color: "var(--cyan-400)", delay: "0.1s" },
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
            style={{
              top: bar.top,
              left: bar.left,
              width: bar.width,
              height: bar.height,
              backgroundColor: bar.color,
              animationDelay: bar.delay,
            }}
          />
        ))}
        {NOISE_BLOCKS.map((block, i) => (
          <div
            key={i}
            className="glitch-noise-block"
            style={{
              top: block.top,
              left: block.left,
              width: block.width,
              height: block.height,
              backgroundColor: block.color,
              animationDelay: block.delay,
            }}
          />
        ))}
        <p
          data-text="> loading_module"
          className="glitch-text-burst absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-display text-xs uppercase tracking-[0.4em] text-neon-500/90 text-glow"
        >
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
