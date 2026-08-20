import type { CSSProperties } from "react";

// Fixed, hand-picked nodes (not Math.random) so server and client render the
// same markup. See MatrixRain for why runtime randomization needs a mount
// gate. Each node glitches in and out on its own short, independently-timed
// loop (two bursts per cycle, see globals.css). That keeps something
// flickering somewhere across the whole set without ever looking synced.
const NODES = [
  { top: "6%", left: "4%", text: "0x7F3A9C2E", duration: "5.5s", delay: "0s" },
  { top: "14%", left: "88%", text: "ケアウエオ", duration: "6.5s", delay: "0.9s" },
  { top: "22%", left: "10%", text: "root@op:~$ ./exec", duration: "7s", delay: "2.1s" },
  { top: "31%", left: "92%", text: "⚠ ERR_ACCESS_DENIED", duration: "6s", delay: "0.4s" },
  { top: "40%", left: "3%", text: "AES-256-GCM", duration: "7.5s", delay: "3s" },
  { top: "48%", left: "90%", text: "0b10110101", duration: "5.8s", delay: "1.6s" },
  { top: "57%", left: "6%", text: "カキクケコ", duration: "6.8s", delay: "3.8s" },
  { top: "65%", left: "89%", text: "> decrypt.sh --force", duration: "6.2s", delay: "1.2s" },
  { top: "73%", left: "5%", text: "◈ CVE-2024-####", duration: "7.2s", delay: "0.2s" },
  { top: "81%", left: "91%", text: "GET /api/flag 403", duration: "6.4s", delay: "2.6s" },
  { top: "88%", left: "8%", text: "λ chmod +x payload", duration: "5.6s", delay: "1s" },
  { top: "10%", left: "48%", text: "アイウ 1F", duration: "7s", delay: "4.4s" },
  { top: "94%", left: "50%", text: "[OK] link established", duration: "6.2s", delay: "3.9s" },
  { top: "3%", left: "70%", text: "0xDEAD", duration: "6.6s", delay: "2.2s" },
];

/** Ambient glitch debris drifting in and out across the empty margins of the layout. */
export default function AmbientGlitch() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {NODES.map((n, i) => (
        <span
          key={i}
          data-text={n.text}
          // Hidden below sm: phones have no spare margin around the
          // centered content for this to occupy without overlapping it.
          className="ambient-glitch-node hidden whitespace-nowrap font-mono text-base tracking-wider text-neon-500 sm:block"
          style={
            {
              top: n.top,
              left: n.left,
              "--dur": n.duration,
              "--delay": n.delay,
            } as CSSProperties
          }
        >
          {n.text}
        </span>
      ))}
    </div>
  );
}
