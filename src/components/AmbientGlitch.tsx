// Fixed, hand-picked nodes (not Math.random) so server and client render the
// same markup — see MatrixRain for why runtime randomization needs a mount
// gate. Each node fades on its own long, independently-timed loop, so across
// the whole set nothing ever looks synchronized. One color only (the same
// neon green as everything else) — mixing in cyan/magenta read as noisy
// rather than cyberpunk, and stealing focus from the actual UI.
const NODES = [
  { top: "6%", left: "4%", text: "0x7F3A9C2E", duration: "11s", delay: "0s" },
  { top: "14%", left: "88%", text: "ケアウエオ", duration: "13s", delay: "2.4s" },
  { top: "22%", left: "10%", text: "root@op:~$ ./exec", duration: "14.5s", delay: "5.1s" },
  { top: "31%", left: "92%", text: "⚠ ERR_ACCESS_DENIED", duration: "12s", delay: "1.1s" },
  { top: "40%", left: "3%", text: "AES-256-GCM", duration: "15.5s", delay: "6.8s" },
  { top: "48%", left: "90%", text: "0b10110101", duration: "11.5s", delay: "3.6s" },
  { top: "57%", left: "6%", text: "カキクケコ", duration: "13.5s", delay: "8s" },
  { top: "65%", left: "89%", text: "> decrypt.sh --force", duration: "12.5s", delay: "4.2s" },
  { top: "73%", left: "5%", text: "◈ CVE-2024-####", duration: "14s", delay: "0.7s" },
  { top: "81%", left: "91%", text: "GET /api/flag 403", duration: "13s", delay: "6s" },
  { top: "88%", left: "8%", text: "λ chmod +x payload", duration: "12s", delay: "2s" },
  { top: "10%", left: "48%", text: "アイウ 1F", duration: "14s", delay: "9.4s" },
  { top: "94%", left: "50%", text: "[OK] link established", duration: "12.5s", delay: "8.6s" },
  { top: "3%", left: "70%", text: "0xDEAD", duration: "13.5s", delay: "4.9s" },
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
          className="ambient-glitch-node hidden whitespace-nowrap font-mono text-xs tracking-wider text-neon-500 sm:block"
          style={{
            top: n.top,
            left: n.left,
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
