"use client";

import { useState } from "react";
import { Radio, UserX } from "lucide-react";
import TerminalPanel from "@/components/TerminalPanel";
import { usePolledFetch } from "@/hooks/usePolledFetch";

// Gray stand-in color for someone who's joined the session but hasn't
// picked a team yet — there's no team color to show them in.
const LOBBY_COLOR = "#9CA3AF";

interface ConnectedPlayer {
  name: string;
  teamId: string | null;
  teamNumber: number | null;
  teamName: string | null;
  color: string | null;
}

export default function ConnectedPlayers({ refreshKey }: { refreshKey: number }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const data = usePolledFetch<{ players: ConnectedPlayer[] }>("/api/admin/connected-players", 3000, [refreshKey, nonce]);
  const players = data?.players ?? [];

  async function kick(p: ConnectedPlayer) {
    if (!p.teamId) return;
    const key = `${p.teamId}-${p.name}`;
    setBusy(key);
    try {
      await fetch(`/api/admin/teams/${p.teamId}/kick`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: p.name }),
      });
      setNonce((n) => n + 1);
    } finally {
      setBusy(null);
    }
  }

  return (
    <TerminalPanel title="connected-players.log">
      <div className="flex items-center justify-between pb-3">
        <span className="text-xs uppercase tracking-widest text-neon-100/40">
          {players.length} connected now
        </span>
      </div>
      {players.length === 0 ? (
        <p className="py-3 text-center text-sm text-neon-100/30">No one&apos;s connected right now.</p>
      ) : (
        <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
          {players.map((p) => {
            const key = `${p.teamId ?? "lobby"}-${p.name}`;
            const color = p.color ?? LOBBY_COLOR;
            return (
              <div
                key={key}
                className="flex items-center justify-between gap-3 rounded-md border bg-void-2/60 px-3 py-2"
                style={{ borderColor: `${color}55` }}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Radio className="h-3.5 w-3.5 shrink-0 animate-pulse" style={{ color }} />
                  <span className="truncate text-base font-semibold" style={{ color }}>
                    {p.name}
                  </span>
                  <span className="shrink-0 text-xs text-neon-100/30">
                    · {p.teamName ?? "no squad yet"}
                  </span>
                </div>
                {p.teamId && (
                  <button
                    onClick={() => kick(p)}
                    disabled={busy === key}
                    title={`Kick ${p.name}`}
                    className="flex shrink-0 items-center gap-1 rounded border border-panel-border px-2 py-1 text-xs text-neon-100/50 hover:border-danger-400 hover:text-danger-400 disabled:opacity-30"
                  >
                    <UserX className="h-3.5 w-3.5" /> {busy === key ? "…" : "Kick"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </TerminalPanel>
  );
}
