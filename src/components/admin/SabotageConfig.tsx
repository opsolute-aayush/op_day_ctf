"use client";

import { useEffect, useRef, useState } from "react";
import { Save } from "lucide-react";
import TerminalPanel from "@/components/TerminalPanel";
import NeonButton from "@/components/NeonButton";
import InputField from "@/components/InputField";

export default function SabotageConfig({ onChanged }: { onChanged: () => void }) {
  const [cap, setCap] = useState<number | null>(null);
  const [capDraft, setCapDraft] = useState("");
  const [cooldown, setCooldown] = useState<number | null>(null);
  const [cooldownDraft, setCooldownDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  // Only prefills the drafts from the server once — otherwise the poll
  // would stomp on whatever the admin is mid-typing in those fields.
  const seeded = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/admin/game", { cache: "no-store" });
      if (!res.ok || cancelled) return;
      const data = await res.json();
      setCap(data.sabotageCreditsPerTeam);
      setCooldown(data.sabotageCooldownSeconds);
      if (!seeded.current) {
        seeded.current = true;
        setCapDraft(String(data.sabotageCreditsPerTeam));
        setCooldownDraft(String(data.sabotageCooldownSeconds));
      }
    }
    load();
    const interval = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  async function saveCap() {
    const value = Number(capDraft);
    const cooldownValue = Number(cooldownDraft);
    if (!Number.isInteger(value) || value < 0) return;
    if (!Number.isInteger(cooldownValue) || cooldownValue < 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/game", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sabotageCreditsPerTeam: value, sabotageCooldownSeconds: cooldownValue }),
      });
      if (res.ok) {
        setCap(value);
        setCooldown(cooldownValue);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        onChanged();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <TerminalPanel title="sabotage-config.cfg" className="neon-border-glow">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[160px]">
          <label className="mb-1.5 block text-xs uppercase tracking-widest text-danger-400/80">Sabotages per squad</label>
          <InputField
            type="number"
            min={0}
            max={20}
            value={capDraft}
            onChange={(e) => setCapDraft(e.target.value)}
            className="text-center font-display text-lg"
          />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="mb-1.5 block text-xs uppercase tracking-widest text-danger-400/80">Cooldown (seconds)</label>
          <InputField
            type="number"
            min={0}
            max={3600}
            value={cooldownDraft}
            onChange={(e) => setCooldownDraft(e.target.value)}
            className="text-center font-display text-lg"
          />
        </div>
        <NeonButton variant="danger" onClick={saveCap} disabled={saving}>
          {saving ? "Saving…" : saved ? <Save className="h-4 w-4" /> : "Apply"}
        </NeonButton>
        {cap !== null && cooldown !== null && (
          <p className="w-full text-xs text-neon-100/40">
            Current: <span className="text-danger-400">{cap}</span> per squad, <span className="text-danger-400">{cooldown}s</span>{" "}
            cooldown between launches. Applying resets every squad&apos;s remaining count to the new cap immediately (existing
            cooldown timers are unaffected).
          </p>
        )}
      </div>
    </TerminalPanel>
  );
}
