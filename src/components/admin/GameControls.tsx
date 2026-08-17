"use client";

import { useEffect, useState } from "react";
import { Play, Pause, RotateCcw, Flag } from "lucide-react";
import TerminalPanel from "@/components/TerminalPanel";
import NeonButton from "@/components/NeonButton";

interface GameConfigResponse {
  isActive: boolean;
  isFinished: boolean;
}

export default function GameControls({ onChanged }: { onChanged: () => void }) {
  const [config, setConfig] = useState<GameConfigResponse | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/admin/game", { cache: "no-store" });
      if (!res.ok || cancelled) return;
      const data = await res.json();
      setConfig(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [nonce]);

  async function runAction(action: "start" | "pause" | "end" | "reset") {
    if (action === "reset" && !confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 4000);
      return;
    }
    if (action === "end" && !confirmEnd) {
      setConfirmEnd(true);
      setTimeout(() => setConfirmEnd(false), 4000);
      return;
    }
    setConfirmReset(false);
    setConfirmEnd(false);
    await fetch("/api/admin/game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setNonce((n) => n + 1);
    onChanged();
  }

  if (!config) return null;

  return (
    <div className="space-y-4">
      <TerminalPanel title="game-control.center">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest ${
              config.isFinished
                ? "bg-amber-400/10 text-amber-400"
                : config.isActive
                  ? "bg-neon-500/10 text-neon-400"
                  : "bg-neon-100/10 text-neon-100/50"
            }`}
          >
            {config.isFinished ? "Ended" : config.isActive ? "Live" : "Paused"}
          </span>
          <p className="text-xs text-neon-100/40">
            {config.isFinished
              ? "The hunt is over — nobody can unlock levels or submit sentences anymore."
              : config.isActive
                ? "Teams can unlock levels and submit sentences right now."
                : "Teams are locked out until you hit Start."}
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <p className="mb-1.5 text-xs uppercase tracking-widest text-neon-400/70">Run the clock</p>
            <div className="flex flex-wrap items-center gap-3">
              <NeonButton onClick={() => runAction("start")} disabled={config.isFinished || config.isActive}>
                <Play className="h-4 w-4" /> Start
              </NeonButton>
              <NeonButton variant="ghost" onClick={() => runAction("pause")} disabled={config.isFinished || !config.isActive}>
                <Pause className="h-4 w-4" /> Pause
              </NeonButton>
            </div>
          </div>

          <div className="border-t border-panel-border pt-3">
            <p className="mb-1.5 text-xs uppercase tracking-widest text-amber-400/70">Danger zone</p>
            <div className="flex flex-wrap items-center gap-3">
              <NeonButton variant="cyan" onClick={() => runAction("end")} disabled={config.isFinished}>
                <Flag className="h-4 w-4" /> {confirmEnd ? "Confirm — end for everyone?" : "End Game"}
              </NeonButton>
              <NeonButton variant="danger" onClick={() => runAction("reset")}>
                <RotateCcw className="h-4 w-4" /> {confirmReset ? "Confirm reset?" : "Reset Game"}
              </NeonButton>
            </div>
            <p className="mt-2 text-xs text-neon-100/40">
              <span className="text-amber-400/80">End Game</span> is the only thing that stops the hunt — a team
              finishing its own sentence never ends it for anyone else, they just get their own results screen.
              <br />
              <span className="text-danger-400/80">Reset</span> wipes all team progress back to Level 1 — teams
              stay joined, and each team&apos;s passwords/clues/words/sentence (set in Team Puzzles) are untouched.
            </p>
          </div>
        </div>
      </TerminalPanel>
    </div>
  );
}
