"use client";

import { useEffect, useState } from "react";
import { Radio } from "lucide-react";
import TerminalPanel from "@/components/TerminalPanel";

interface ActivePlayer {
  name: string;
  teamNumber: number;
  teamName: string;
  color: string;
}

/** Session-wide "who's online right now" — every squad, not just your own. */
export default function ActiveSessionPanel({ selfName }: { selfName?: string }) {
  const [players, setPlayers] = useState<ActivePlayer[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/game/connected-players", { cache: "no-store" });
      if (!res.ok || cancelled) return;
      const data = await res.json();
      setPlayers(data.players);
    }
    load();
    const interval = setInterval(load, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <TerminalPanel title="active-agents.log" className="mt-6">
      <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-widest text-neon-400/70">
        <Radio className="h-3.5 w-3.5 animate-pulse" />
        {players === null ? "loading…" : `${players.length} online now`}
      </div>
      {players !== null && players.length === 0 && (
        <p className="text-sm text-neon-100/30">No one else is online right now.</p>
      )}
      {players !== null && players.length > 0 && (
        <div className="space-y-1.5">
          {players.map((p) => {
            const isYou = selfName !== undefined && p.name === selfName;
            return (
              <div
                key={`${p.teamNumber}-${p.name}`}
                className={`flex items-center gap-2 rounded-md border px-3 py-2 ${isYou ? "bg-white/5" : "bg-void-2/60"}`}
                style={{ borderColor: `${p.color}55` }}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: p.color, boxShadow: `0 0 4px 1px ${p.color}99` }}
                />
                <span className="truncate text-base font-semibold" style={{ color: p.color }}>
                  {p.name}
                </span>
                {isYou && <span className="shrink-0 text-xs text-neon-100/40">(you)</span>}
                <span className="ml-auto shrink-0 text-xs text-neon-100/30">{p.teamName}</span>
              </div>
            );
          })}
        </div>
      )}
    </TerminalPanel>
  );
}
