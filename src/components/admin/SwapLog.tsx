"use client";

import { useState } from "react";
import { Repeat, RotateCcw } from "lucide-react";
import TerminalPanel from "@/components/TerminalPanel";
import NeonButton from "@/components/NeonButton";
import { usePolledFetch } from "@/hooks/usePolledFetch";
import { playResolveFeedback } from "@/lib/gameFeedback";

interface SwapRow {
  id: string;
  initiatorTeam: { name: string; teamNumber: number; color: string };
  partnerTeam: { name: string; teamNumber: number; color: string };
  createdAt: string;
  revertedAt: string | null;
}

export default function SwapLog({ onChanged }: { onChanged: () => void }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const data = usePolledFetch<{ swaps: SwapRow[] }>("/api/admin/swaps", 5000, [nonce]);
  const rows = data?.swaps ?? null;

  async function revert(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/swaps/${id}/revert`, { method: "POST" });
      if (res.ok) playResolveFeedback();
      setNonce((n) => n + 1);
      onChanged();
    } finally {
      setBusyId(null);
    }
  }

  const active = rows?.filter((r) => !r.revertedAt) ?? [];
  const history = rows?.filter((r) => r.revertedAt) ?? [];

  if (active.length === 0 && history.length === 0) return null;

  return (
    <div className="space-y-4">
      {active.length > 0 && (
        <TerminalPanel title="active-swap.log" className="neon-border-glow">
          <div className="space-y-2.5">
            {active.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-purple-400/30 bg-purple-400/5 p-3"
              >
                <div className="flex items-center gap-2 text-sm">
                  <Repeat className="h-4 w-4 shrink-0 text-purple-400" />
                  <span className="font-semibold" style={{ color: r.initiatorTeam.color }}>
                    {r.initiatorTeam.name}
                  </span>
                  <span className="text-neon-100/40">⇄</span>
                  <span className="font-semibold" style={{ color: r.partnerTeam.color }}>
                    {r.partnerTeam.name}
                  </span>
                </div>
                <NeonButton variant="ghost" onClick={() => revert(r.id)} disabled={busyId === r.id}>
                  <RotateCcw className="h-3.5 w-3.5" /> Revert
                </NeonButton>
              </div>
            ))}
          </div>
        </TerminalPanel>
      )}

      {history.length > 0 && (
        <TerminalPanel title="swap-history.log">
          <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {history.slice(0, 20).map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-2 text-xs text-neon-100/50">
                <span style={{ color: r.initiatorTeam.color }}>{r.initiatorTeam.name}</span>
                <span className="text-neon-100/30">⇄</span>
                <span style={{ color: r.partnerTeam.color }}>{r.partnerTeam.name}</span>
                <span className="text-neon-100/30">·</span>
                <span className="text-amber-400">reverted</span>
              </div>
            ))}
          </div>
        </TerminalPanel>
      )}
    </div>
  );
}
