"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import TerminalPanel from "@/components/TerminalPanel";
import NeonButton from "@/components/NeonButton";
import InputField from "@/components/InputField";
import { usePolledFetch } from "@/hooks/usePolledFetch";

export default function HelpConfig({ onChanged }: { onChanged: () => void }) {
  const gameData = usePolledFetch<{ helpCreditsPerTeam: number }>("/api/admin/game", 5000);
  const [prevGameData, setPrevGameData] = useState(gameData);
  const [cap, setCap] = useState<number | null>(null);
  const [capDraft, setCapDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  // Only prefills the draft from the server once. Otherwise the poll would
  // stomp on whatever the admin is mid-typing. Same "adjust state during
  // render" pattern as SabotageConfig.tsx, to avoid the
  // react-hooks/set-state-in-effect lint rule.
  const [draftSeeded, setDraftSeeded] = useState(false);

  if (gameData !== prevGameData) {
    setPrevGameData(gameData);
    if (gameData) {
      setCap(gameData.helpCreditsPerTeam);
      if (!draftSeeded) {
        setDraftSeeded(true);
        setCapDraft(String(gameData.helpCreditsPerTeam));
      }
    }
  }

  async function saveCap() {
    const value = Number(capDraft);
    if (!Number.isInteger(value) || value < 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/game", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ helpCreditsPerTeam: value }),
      });
      if (res.ok) {
        setCap(value);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        onChanged();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <TerminalPanel title="help-config.cfg" className="neon-border-glow">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[160px]">
          <label className="mb-1.5 block text-xs uppercase tracking-widest text-neon-400/80">Help credits per squad</label>
          <InputField
            type="number"
            min={0}
            max={20}
            value={capDraft}
            onChange={(e) => setCapDraft(e.target.value)}
            className="text-center font-display text-lg"
          />
        </div>
        <NeonButton variant="primary" onClick={saveCap} disabled={saving}>
          {saving ? "Saving…" : saved ? <Save className="h-4 w-4" /> : "Apply"}
        </NeonButton>
        {cap !== null && (
          <p className="w-full text-xs text-neon-100/40">
            Current: <span className="text-neon-400">{cap}</span> self-service help uses per squad. Applying resets every
            squad&apos;s remaining count to the new cap immediately.
          </p>
        )}
      </div>
    </TerminalPanel>
  );
}
