// Fixed, hand-picked nodes (not Math.random) so server and client render the
// same markup — see MatrixRain for why runtime randomization needs a mount
// gate. Each node flickers on its own infinite, independently-timed loop, so
// across the whole set nothing ever looks synchronized.
const NODES = [
  { top: "6%", left: "4%", text: "0x7F3A9C2E", color: "var(--neon-500)", duration: "7.5s", delay: "0s" },
  { top: "14%", left: "88%", text: "ケアウエオ", color: "var(--cyan-400)", duration: "6.2s", delay: "1.4s" },
  { top: "22%", left: "10%", text: "root@op:~$ ./exec", color: "var(--neon-500)", duration: "8.8s", delay: "2.7s" },
  { top: "31%", left: "92%", text: "⚠ ERR_ACCESS_DENIED", color: "var(--magenta-400)", duration: "7.1s", delay: "0.6s" },
  { top: "40%", left: "3%", text: "AES-256-GCM", color: "var(--cyan-400)", duration: "9.4s", delay: "3.6s" },
  { top: "48%", left: "90%", text: "0b10110101", color: "var(--neon-500)", duration: "6.7s", delay: "1.9s" },
  { top: "57%", left: "6%", text: "カキクケコ", color: "var(--magenta-400)", duration: "8.2s", delay: "4.3s" },
  { top: "65%", left: "89%", text: "> decrypt.sh --force", color: "var(--neon-500)", duration: "7.9s", delay: "2.1s" },
  { top: "73%", left: "5%", text: "◈ CVE-2024-####", color: "var(--cyan-400)", duration: "6.5s", delay: "0.3s" },
  { top: "81%", left: "91%", text: "GET /api/flag 403", color: "var(--magenta-400)", duration: "9s", delay: "3.1s" },
  { top: "88%", left: "8%", text: "λ chmod +x payload", color: "var(--neon-500)", duration: "7.3s", delay: "1.1s" },
  { top: "10%", left: "48%", text: "アイウ 1F", color: "var(--cyan-400)", duration: "8.6s", delay: "5.2s" },
  { top: "94%", left: "50%", text: "[OK] link established", color: "var(--neon-500)", duration: "7.7s", delay: "4.8s" },
  { top: "3%", left: "70%", text: "☠ 0xDEAD", color: "var(--magenta-400)", duration: "6.9s", delay: "2.5s" },
];

/** Ambient debris drifting in and out across the empty margins of the layout. */
export default function AmbientGlitch() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {NODES.map((n, i) => (
        <span
          key={i}
          // Hidden below sm: phones have no spare margin around the
          // centered content for this to occupy without overlapping it.
          className="ambient-glitch-node hidden whitespace-nowrap font-mono text-xs tracking-wider sm:block"
          style={{
            top: n.top,
            left: n.left,
            color: n.color,
            animationDuration: n.duration,
            animationDelay: n.delay,
          }}
        >
          {n.text}
        </span>
      ))}
    </div>
  );
}
