import { KeyRound, Unlock, MapPin, CheckCircle2, Lightbulb, Skull, Repeat, Trophy } from "lucide-react";
import GlitchTitle from "@/components/GlitchTitle";

const RULES: { icon: typeof KeyRound; text: string; color: string }[] = [
  { icon: KeyRound, text: "Decode the Game Master's passcode to get your Level 1 password.", color: "text-neon-500" },
  { icon: Unlock, text: "Enter a level's password on the platform to unlock it.", color: "text-neon-500" },
  {
    icon: MapPin,
    text: "Unlocking reveals a location clue field. It also hides a phrase to decode; cracking it reveals the next level's password.",
    color: "text-cyan-400",
  },
  { icon: CheckCircle2, text: "Go to that location, find your word, then type it back here to confirm and advance.", color: "text-cyan-400" },
  { icon: Lightbulb, text: "Stuck? Ask for a Hint. Limited uses per game.", color: "text-amber-400" },
  { icon: Skull, text: "Sabotage a squad to lock them out until they crack your cipher. They can hit back too.", color: "text-danger-400" },
  { icon: Repeat, text: "A hidden swap code exists somewhere. Find it to trade your entire board with any squad.", color: "text-purple-400" },
  { icon: Trophy, text: "Unlock every level, then arrange all your collected words into the final sentence to win.", color: "text-neon-400" },
];

/** Shown only on the pre-start standby screen. Gone the moment the Game Master starts the hunt. */
export default function GameRules() {
  return (
    <div className="relative overflow-hidden rounded-lg border border-panel-border bg-gradient-to-b from-panel to-void-2">
      <span className="pointer-events-none absolute left-0 top-0 h-3 w-3 border-l-2 border-t-2 border-neon-500/60" />
      <span className="pointer-events-none absolute right-0 top-0 h-3 w-3 border-r-2 border-t-2 border-neon-500/60" />
      <span className="pointer-events-none absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2 border-neon-500/60" />
      <span className="pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-neon-500/60" />
      <div className="scanlines pointer-events-none absolute inset-0 opacity-20" />

      <div className="relative flex items-center gap-2 border-b border-panel-border bg-void-2/80 px-4 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-danger-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-neon-500/70" />
        <GlitchTitle text="briefing.sys" className="ml-2 text-xs normal-case tracking-widest" as="h3" />
      </div>

      <ul className="relative space-y-3 p-5">
        {RULES.map(({ icon: Icon, text, color }, i) => {
          const tag = `[${String(i + 1).padStart(2, "0")}]`;
          return (
            <li key={i} className="flex items-start gap-3 font-mono text-sm text-neon-100/80">
              <span
                data-text={tag}
                className={`ambient-glitch-node shrink-0 text-xs ${color}`}
                style={{ position: "static", ["--dur" as string]: `${5 + i}s`, ["--delay" as string]: `${i * 0.4}s` }}
              >
                {tag}
              </span>
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} />
              <span>{text}</span>
            </li>
          );
        })}
        <li className="caret-blink pt-1 font-mono text-xs text-neon-500/50">awaiting deployment</li>
      </ul>
    </div>
  );
}
