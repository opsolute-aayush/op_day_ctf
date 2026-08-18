import TerminalPanel from "@/components/TerminalPanel";

// A standing humanoid silhouette rendered from a fixed character set —
// built from simple filled rectangular regions (not hand-typed strings) so
// the geometry stays easy to reason about and adjust. Gaps between the
// torso and each arm, and between the two legs, are deliberately 2-3 cols
// wide — anything narrower gets swallowed by the glyphs and reads as one
// solid blob instead of a person.
const WIDTH = 25;
const HEIGHT = 31;

const HEAD: [number, number, number, number] = [0, 6, 9, 15];
const BODY_REGIONS: Array<[number, number, number, number]> = [
  [7, 7, 11, 13], // neck
  [8, 8, 10, 14], // shoulder transition
  [9, 17, 3, 5], // left arm
  [9, 17, 19, 21], // right arm
  [9, 14, 8, 16], // upper torso (shoulder width)
  [15, 19, 9, 15], // lower torso (tapered waist)
  [20, 20, 9, 15], // hip line
  [21, 29, 8, 10], // left leg
  [21, 29, 14, 16], // right leg
  [30, 30, 7, 11], // left foot
  [30, 30, 13, 17], // right foot
];

// Lighter ASCII glyphs make up most of the body so limb edges stay
// readable; the Chinese characters are concentrated in the head/face area
// as a deliberate accent instead of thickening every line of the silhouette.
const BODY_GLYPHS = ["0", "1", "#", "@", "!", "?", "/", ";", ":"];
const HEAD_GLYPHS = ["人", "機", "電", "@", "0", "1"];

function regionAt(row: number, col: number): "head" | "body" | null {
  const [hr0, hr1, hc0, hc1] = HEAD;
  if (row >= hr0 && row <= hr1 && col >= hc0 && col <= hc1) return "head";
  if (BODY_REGIONS.some(([r0, r1, c0, c1]) => row >= r0 && row <= r1 && col >= c0 && col <= c1)) return "body";
  return null;
}

function buildRows(): string[] {
  const rows: string[] = [];
  for (let row = 0; row < HEIGHT; row++) {
    let line = "";
    for (let col = 0; col < WIDTH; col++) {
      const region = regionAt(row, col);
      if (region === "head") {
        line += HEAD_GLYPHS[(row + col * 2) % HEAD_GLYPHS.length];
      } else if (region === "body") {
        line += BODY_GLYPHS[(row + col * 2) % BODY_GLYPHS.length];
      } else {
        line += " ";
      }
    }
    rows.push(line);
  }
  return rows;
}

const ROWS = buildRows();

/** A standing operative silhouette, textured from the app's glyph set instead of a real image. */
export default function AsciiOperative() {
  return (
    <TerminalPanel title="operative.render">
      <pre className="text-glow select-none text-center font-mono text-[10px] leading-[1.15] text-neon-500 sm:text-xs">
        {ROWS.join("\n")}
      </pre>
      <p className="mt-3 text-center text-[11px] uppercase tracking-widest text-neon-100/30">Agent Unit // Standby</p>
    </TerminalPanel>
  );
}
