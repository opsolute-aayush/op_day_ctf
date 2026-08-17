"use client";

import { useEffect, useState } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import TerminalPanel from "@/components/TerminalPanel";
import NeonButton from "@/components/NeonButton";

interface GameConfigResponse {
  isActive: boolean;
  isFinished: boolean;
}

export default function GameControls({ onChanged }: { onChanged: () => void }) {
  const [config, setConfig] = useState<GameConfigResponse | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
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

  async function runAction(action: "start" | "pause" | "reset") {
    if (action === "reset" && !confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 4000);
      return;
    }
    setConfirmReset(false);
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
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest ${
              config.isFinished
                ? "bg-amber-400/10 text-amber-400"
                : config.isActive
                  ? "bg-neon-500/10 text-neon-400"
                  : "bg-neon-100/10 text-neon-100/50"
            }`}
          >
            {config.isFinished ? "Finished" : config.isActive ? "Live" : "Paused"}
          </span>

          <NeonButton onClick={() => runAction("start")} disabled={config.isActive && !config.isFinished}>
            <Play className="h-4 w-4" /> Start
          </NeonButton>
          <NeonButton variant="ghost" onClick={() => runAction("pause")} disabled={!config.isActive}>
            <Pause className="h-4 w-4" /> Pause
          </NeonButton>
          <NeonButton variant="danger" onClick={() => runAction("reset")}>
            <RotateCcw className="h-4 w-4" /> {confirmReset ? "Confirm reset?" : "Reset Game"}
          </NeonButton>
        </div>
        <p className="mt-2 text-xs text-neon-100/40">
          Reset wipes all team progress back to Level 1 — teams stay registered, and each team&apos;s
          passwords/clues/words/sentence (set in the Levels tab) are untouched.
        </p>
      </TerminalPanel>

      <TerminalPanel title="readme.txt" className="border-cyan-400/20">
        <p className="text-sm text-neon-100/60">
          Each team has its own independent puzzle — passwords, location clues, word rewards, and
          final sentence are all configured per-team in the <span className="text-cyan-400">Levels</span> tab.
          This tab only controls the game clock (start / pause / reset) for everyone at once.
        </p>
      </TerminalPanel>
    </div>
  );
}
