"use client";

import { useEffect, useState } from "react";
import { Play, Pause, RotateCcw, Save } from "lucide-react";
import TerminalPanel from "@/components/TerminalPanel";
import NeonButton from "@/components/NeonButton";

interface GameConfigResponse {
  isActive: boolean;
  isFinished: boolean;
  winningSentence: string;
  totalLevels: number;
}

export default function GameControls({ onChanged }: { onChanged: () => void }) {
  const [config, setConfig] = useState<GameConfigResponse | null>(null);
  const [sentenceDraft, setSentenceDraft] = useState("");
  const [seeded, setSeeded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
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

  // Seed the sentence textarea once from the server, so later reloads (after
  // start/pause/reset) never clobber whatever the admin is currently typing.
  if (config && !seeded) {
    setSeeded(true);
    setSentenceDraft(config.winningSentence);
  }

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

  async function saveSentence() {
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/admin/game", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ winningSentence: sentenceDraft }),
    });
    setSaving(false);
    if (res.ok) {
      setMessage("Winning sentence updated.");
      onChanged();
    } else {
      const data = await res.json().catch(() => ({}));
      setMessage(data.error ?? "Failed to update.");
    }
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
          Reset wipes all team progress back to Level 1 — teams stay registered. This can&apos;t be undone.
        </p>
      </TerminalPanel>

      <TerminalPanel title="winning-sentence.cfg">
        <p className="mb-2 text-xs text-neon-100/50">
          Editable any time — even mid-game. Teams only see this once they submit at the final level.
        </p>
        <textarea
          value={sentenceDraft}
          onChange={(e) => setSentenceDraft(e.target.value)}
          rows={3}
          className="w-full resize-none rounded-md border border-panel-border bg-void-2 px-3 py-2.5 text-neon-100 outline-none focus:border-neon-500 focus:ring-1 focus:ring-neon-500"
        />
        <div className="mt-3 flex items-center gap-3">
          <NeonButton onClick={saveSentence} disabled={saving || !sentenceDraft.trim()}>
            <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save Sentence"}
          </NeonButton>
          {message && <span className="text-xs text-neon-400">{message}</span>}
        </div>
      </TerminalPanel>
    </div>
  );
}
