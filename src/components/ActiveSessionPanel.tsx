"use client";

import { Radio } from "lucide-react";
import TerminalPanel from "@/components/TerminalPanel";
import { usePolledFetch } from "@/hooks/usePolledFetch";

// Gray stand-in color for someone who's joined the session but hasn't
// picked a team yet — there's no team color to show them in.
const LOBBY_COLOR = "#9CA3AF";

interface ActivePlayer {
  name: string;
  teamNumber: number | null;
  teamName: string | null;
  color: string | null;
}

/** Session-wide "who's online right now" — every squad, not just your own. */
export default function ActiveSessionPanel({ selfName }: { selfName?: string }) {
  const data = usePolledFetch<{ players: ActivePlayer[] }>("/api/game/connected-players", 4000);
  const players = data?.players ?? null;

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
        <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
          {players.map((p) => {
            const isYou = selfName !== undefined && p.name === selfName;
            const color = p.color ?? LOBBY_COLOR;
            return (
              <div
                key={`${p.teamNumber ?? "lobby"}-${p.name}`}
                className={`flex items-center gap-2 rounded-md border px-3 py-2 ${isYou ? "bg-white/5" : "bg-void-2/60"}`}
                style={{ borderColor: `${color}55` }}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: color, boxShadow: `0 0 4px 1px ${color}99` }}
                />
                <span className="truncate text-base font-semibold" style={{ color }}>
                  {p.name}
                </span>
                {isYou && <span className="shrink-0 text-xs text-neon-100/40">(you)</span>}
                <span className="ml-auto shrink-0 text-xs text-neon-100/30">{p.teamName ?? "no squad yet"}</span>
              </div>
            );
          })}
        </div>
      )}
    </TerminalPanel>
  );
}
