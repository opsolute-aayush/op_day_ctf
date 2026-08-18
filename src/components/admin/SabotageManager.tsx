"use client";

import { useEffect, useRef, useState } from "react";
import { Skull, ShieldOff, Eye, EyeOff, Save } from "lucide-react";
import TerminalPanel from "@/components/TerminalPanel";
import NeonButton from "@/components/NeonButton";
import InputField from "@/components/InputField";

interface SabotageRow {
  id: string;
  sourceTeam: { name: string; teamNumber: number; color: string };
  targetTeam: { name: string; teamNumber: number; color: string };
  encoding: string;
  cipherText: string;
  plainText: string;
  resolvedAt: string | null;
  bypassed: boolean;
  createdAt: string;
}

export default function SabotageManager({ onChanged }: { onChanged: () => void }) {
  const [rows, setRows] = useState<SabotageRow[] | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const [cap, setCap] = useState<number | null>(null);
  const [capDraft, setCapDraft] = useState("");
  const [savingCap, setSavingCap] = useState(false);
  const [capSaved, setCapSaved] = useState(false);
  // Only prefills capDraft from the server once — otherwise the 5s poll
  // would stomp on whatever the admin is mid-typing in that field.
  const capSeeded = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [sabRes, gameRes] = await Promise.all([
        fetch("/api/admin/sabotages", { cache: "no-store" }),
        fetch("/api/admin/game", { cache: "no-store" }),
      ]);
      if (cancelled) return;
      if (sabRes.ok) {
        const data = await sabRes.json();
        if (!cancelled) setRows(data.sabotages);
      }
      if (gameRes.ok) {
        const data = await gameRes.json();
        if (cancelled) return;
        setCap(data.sabotageCreditsPerTeam);
        if (!capSeeded.current) {
          capSeeded.current = true;
          setCapDraft(String(data.sabotageCreditsPerTeam));
        }
      }
    }
    load();
    const interval = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [nonce]);

  function toggleReveal(id: string) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bypass(id: string) {
    setBusyId(id);
    try {
      await fetch(`/api/admin/sabotages/${id}/bypass`, { method: "POST" });
      setNonce((n) => n + 1);
      onChanged();
    } finally {
      setBusyId(null);
    }
  }

  async function saveCap() {
    const value = Number(capDraft);
    if (!Number.isInteger(value) || value < 0) return;
    setSavingCap(true);
    try {
      const res = await fetch("/api/admin/game", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sabotageCreditsPerTeam: value }),
      });
      if (res.ok) {
        setCap(value);
        setCapSaved(true);
        setTimeout(() => setCapSaved(false), 2000);
        onChanged();
      }
    } finally {
      setSavingCap(false);
    }
  }

  const active = rows?.filter((r) => !r.resolvedAt) ?? [];
  const resolved = rows?.filter((r) => r.resolvedAt) ?? [];

  return (
    <div className="space-y-4">
      <TerminalPanel title="sabotage-config.cfg" className="neon-border-glow">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[160px]">
            <label className="mb-1.5 block text-xs uppercase tracking-widest text-danger-400/80">
              Sabotages per squad
            </label>
            <InputField
              type="number"
              min={0}
              max={20}
              value={capDraft}
              onChange={(e) => setCapDraft(e.target.value)}
              className="text-center font-display text-lg"
            />
          </div>
          <NeonButton variant="danger" onClick={saveCap} disabled={savingCap}>
            {savingCap ? "Saving…" : capSaved ? <Save className="h-4 w-4" /> : "Apply"}
          </NeonButton>
          {cap !== null && (
            <p className="w-full text-xs text-neon-100/40">
              Current: <span className="text-danger-400">{cap}</span> per squad. Applying resets every squad&apos;s
              remaining count to this value immediately.
            </p>
          )}
        </div>
      </TerminalPanel>

      <TerminalPanel title="active-sabotages.log" className="neon-border-glow">
        {active.length === 0 ? (
          <p className="py-3 text-center text-sm text-neon-100/30">No active sabotages right now.</p>
        ) : (
          <div className="space-y-2.5">
            {active.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-danger-400/30 bg-danger-400/5 p-3"
              >
                <div className="flex items-center gap-2 text-sm">
                  <Skull className="h-4 w-4 shrink-0 text-danger-400" />
                  <span className="font-semibold" style={{ color: r.sourceTeam.color }}>
                    {r.sourceTeam.name}
                  </span>
                  <span className="text-neon-100/40">→</span>
                  <span className="font-semibold" style={{ color: r.targetTeam.color }}>
                    {r.targetTeam.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="text-neon-100/40">{r.encoding}:</span>
                  <span className="text-cyan-400">{r.cipherText}</span>
                  <button onClick={() => toggleReveal(r.id)} className="text-neon-100/40 hover:text-neon-400" title="Reveal answer">
                    {revealed.has(r.id) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                  {revealed.has(r.id) && <span className="text-neon-400">{r.plainText}</span>}
                </div>
                <NeonButton variant="ghost" onClick={() => bypass(r.id)} disabled={busyId === r.id}>
                  <ShieldOff className="h-3.5 w-3.5" /> Bypass
                </NeonButton>
              </div>
            ))}
          </div>
        )}
      </TerminalPanel>

      {resolved.length > 0 && (
        <TerminalPanel title="sabotage-history.log">
          <div className="space-y-2">
            {resolved.slice(0, 20).map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-2 text-xs text-neon-100/50">
                <span style={{ color: r.sourceTeam.color }}>{r.sourceTeam.name}</span>
                <span className="text-neon-100/30">→</span>
                <span style={{ color: r.targetTeam.color }}>{r.targetTeam.name}</span>
                <span className="text-neon-100/30">·</span>
                <span className="font-mono">{r.plainText}</span>
                <span className={r.bypassed ? "text-amber-400" : "text-neon-500"}>
                  {r.bypassed ? "bypassed" : "cleared"}
                </span>
              </div>
            ))}
          </div>
        </TerminalPanel>
      )}
    </div>
  );
}
