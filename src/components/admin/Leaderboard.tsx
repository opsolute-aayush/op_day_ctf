"use client";

import { useEffect, useState } from "react";
import { Trophy, Unlock, Lightbulb, Trash2 } from "lucide-react";
import TerminalPanel from "@/components/TerminalPanel";
import NeonButton from "@/components/NeonButton";

interface LeaderboardRow {
  teamId: string;
  teamName: string;
  color: string;
  members: string[];
  currentLevel: number;
  totalLevels: number;
  attempts: number;
  completed: boolean;
  isWinner: boolean;
  updatedAt: string;
}

export default function Leaderboard({ refreshKey }: { refreshKey: number }) {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [busyTeam, setBusyTeam] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/admin/leaderboard", { cache: "no-store" });
      if (!res.ok || cancelled) return;
      const data = await res.json();
      setRows(data.leaderboard);
    }
    load();
    const interval = setInterval(load, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [refreshKey, nonce]);

  const reload = () => setNonce((n) => n + 1);

  async function forceUnlock(teamId: string) {
    setBusyTeam(teamId);
    await fetch("/api/admin/force-unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, mode: "unlock" }),
    });
    setBusyTeam(null);
    reload();
  }

  async function releaseHint(teamId: string) {
    setBusyTeam(teamId);
    await fetch("/api/admin/force-unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, mode: "hint" }),
    });
    setBusyTeam(null);
  }

  async function removeTeam(teamId: string, name: string) {
    if (!confirm(`Remove team "${name}"? This can't be undone.`)) return;
    setBusyTeam(teamId);
    await fetch(`/api/admin/teams/${teamId}`, { method: "DELETE" });
    setBusyTeam(null);
    reload();
  }

  return (
    <TerminalPanel title="live-leaderboard.tsv">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-widest text-neon-100/40">
              <th className="pb-2 pr-3">Team</th>
              <th className="pb-2 pr-3">Level</th>
              <th className="pb-2 pr-3">Attempts</th>
              <th className="pb-2 pr-3">Status</th>
              <th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.teamId} className="border-t border-panel-border/60">
                <td className="py-2 pr-3 font-semibold" style={{ color: row.color }}>
                  {row.isWinner && <Trophy className="mr-1 inline h-3.5 w-3.5 text-amber-400" />}
                  {row.teamName}
                </td>
                <td className="py-2 pr-3 text-neon-100/80">
                  {row.currentLevel} / {row.totalLevels}
                </td>
                <td className="py-2 pr-3 text-neon-100/60">{row.attempts}</td>
                <td className="py-2 pr-3">
                  {row.isWinner ? (
                    <span className="text-amber-400">WINNER</span>
                  ) : row.completed ? (
                    <span className="text-neon-400">Submitted</span>
                  ) : (
                    <span className="text-neon-100/40">In progress</span>
                  )}
                </td>
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    <button
                      title="Force unlock current level"
                      disabled={busyTeam === row.teamId || row.currentLevel > row.totalLevels}
                      onClick={() => forceUnlock(row.teamId)}
                      className="rounded border border-panel-border p-1.5 text-neon-100/60 hover:border-neon-500 hover:text-neon-400 disabled:opacity-30"
                    >
                      <Unlock className="h-3.5 w-3.5" />
                    </button>
                    <button
                      title="Release hint for current level"
                      disabled={busyTeam === row.teamId}
                      onClick={() => releaseHint(row.teamId)}
                      className="rounded border border-panel-border p-1.5 text-neon-100/60 hover:border-cyan-400 hover:text-cyan-400 disabled:opacity-30"
                    >
                      <Lightbulb className="h-3.5 w-3.5" />
                    </button>
                    <button
                      title="Remove team"
                      disabled={busyTeam === row.teamId}
                      onClick={() => removeTeam(row.teamId, row.teamName)}
                      className="rounded border border-panel-border p-1.5 text-neon-100/60 hover:border-danger-400 hover:text-danger-400 disabled:opacity-30"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-neon-100/30">
                  No teams registered yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-3">
        <NeonButton variant="ghost" onClick={reload}>
          Refresh
        </NeonButton>
      </div>
    </TerminalPanel>
  );
}
