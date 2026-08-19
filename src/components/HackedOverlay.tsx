import type { CSSProperties } from "react";

// Fixed, hand-picked timings (not Math.random) — same reasoning as
// AmbientGlitch: server and client must render identical markup, and
// staggering the delays is what keeps this from reading as one obvious loop.
const SCAN_LINES = [
  { dur: "4.3s", delay: "0s" },
  { dur: "5.8s", delay: "2.1s" },
];

const TEAR_BARS = [
  { top: "16%", h: "5px", dur: "4.7s", delay: "0.6s" },
  { top: "48%", h: "9px", dur: "6.1s", delay: "2.4s" },
  { top: "74%", h: "4px", dur: "5.4s", delay: "3.8s" },
];

const FLASH_LAYERS = [
  { dur: "7.2s", delay: "1.2s" },
  { dur: "9.6s", delay: "4.5s" },
];

/**
 * A continuous, low-key "still being hacked" ambience for /winner — scanline
 * sweeps, brief horizontal tears, and faint whole-screen flashes, all looping
 * for as long as the page stays open (unlike .victory-flash, which is a
 * one-shot entrance burst). Mount once at the page root.
 */
export default function HackedOverlay() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[55] overflow-hidden" aria-hidden="true">
      {SCAN_LINES.map((s, i) => (
        <span key={`scan-${i}`} className="hack-scan-line" style={{ "--dur": s.dur, "--delay": s.delay } as CSSProperties} />
      ))}
      {TEAR_BARS.map((b, i) => (
        <span
          key={`tear-${i}`}
          className="hack-tear-bar"
          style={{ "--top": b.top, "--h": b.h, "--dur": b.dur, "--delay": b.delay } as CSSProperties}
        />
      ))}
      {FLASH_LAYERS.map((f, i) => (
        <span key={`flash-${i}`} className="hack-flash-layer" style={{ "--dur": f.dur, "--delay": f.delay } as CSSProperties} />
      ))}
    </div>
  );
}
