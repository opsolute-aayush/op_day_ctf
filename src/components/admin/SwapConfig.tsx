"use client";

import { useState } from "react";
import { Repeat, Eye, EyeOff } from "lucide-react";
import TerminalPanel from "@/components/TerminalPanel";
import NeonButton from "@/components/NeonButton";
import InputField from "@/components/InputField";
import { usePolledFetch } from "@/hooks/usePolledFetch";

export default function SwapConfig({ onChanged }: { onChanged: () => void }) {
  const gameData = usePolledFetch<{ swapCode: string | null; swapUsed: boolean }>("/api/admin/game", 5000);
  // "Adjust state during render" (setState in the body, guarded by a
  // prev-value comparison) rather than an effect, same as useGlitchKey.ts.
  // This avoids the react-hooks/set-state-in-effect lint rule.
  const [prevGameData, setPrevGameData] = useState(gameData);
  const [code, setCode] = useState<string | null>(null);
  const [swapUsed, setSwapUsed] = useState(false);
  const [codeDraft, setCodeDraft] = useState("");
  const [revealCode, setRevealCode] = useState(false);
  const [saving, setSaving] = useState(false);

  if (gameData !== prevGameData) {
    setPrevGameData(gameData);
    if (gameData) {
      setCode(gameData.swapCode);
      setSwapUsed(gameData.swapUsed);
    }
  }

  async function setSwapCode() {
    const trimmed = codeDraft.trim();
    if (trimmed.length < 3) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/swap-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setCode(data.code);
        setCodeDraft("");
        setRevealCode(true);
        onChanged();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <TerminalPanel title="swap-config.cfg" className="neon-border-glow">
      <div className="space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[160px]">
            <label className="mb-1.5 block text-xs uppercase tracking-widest text-purple-400/80">Swap card code</label>
            <InputField
              value={codeDraft}
              onChange={(e) => setCodeDraft(e.target.value)}
              placeholder="Write your own code"
              className="font-mono text-sm uppercase tracking-wide"
            />
          </div>
          <NeonButton variant="cyan" onClick={setSwapCode} disabled={saving || codeDraft.trim().length < 3}>
            <Repeat className="h-3.5 w-3.5" /> {saving ? "Saving…" : code ? "Replace" : "Set"}
          </NeonButton>
        </div>
        <p className="text-xs text-neon-100/40">
          Hide this code physically however you like. The platform doesn&apos;t encode or transform it. Players type it in
          exactly as you write it here.
        </p>

        {code ? (
          <div className="space-y-2 rounded-md border border-panel-border bg-void-2/60 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs uppercase tracking-widest text-neon-100/50">Current code (never shown to players)</span>
              <button onClick={() => setRevealCode((v) => !v)} className="text-neon-100/40 hover:text-neon-400" title="Reveal code">
                {revealCode ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            <p className="font-mono text-sm text-purple-400">{revealCode ? code : "•".repeat(code.length)}</p>
            <p className="pt-1 text-xs text-neon-100/40">
              Status:{" "}
              <span className={swapUsed ? "text-amber-400" : "text-neon-400"}>
                {swapUsed ? "already claimed this game" : "available, not yet claimed"}
              </span>
            </p>
          </div>
        ) : (
          <p className="text-xs text-neon-100/30">No swap card set. The feature stays hidden from players until you set one.</p>
        )}
      </div>
    </TerminalPanel>
  );
}
