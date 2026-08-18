"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Radio } from "lucide-react";
import TerminalPanel from "@/components/TerminalPanel";
import TeamAvatar from "@/components/TeamAvatar";

interface TeamStat {
  teamNumber: number;
  teamName: string;
  color: string;
  currentLevel: number;
  totalLevels: number;
  completed: boolean;
  isFirstToFinish: boolean;
}

export default function TeamStatsPanel({ highlightTeamNumber }: { highlightTeamNumber?: number }) {
  const [stats, setStats] = useState<TeamStat[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/game/stats", { cache: "no-store" });
      if (!res.ok || cancelled) return;
      const data = await res.json();
      setStats(data.stats);
    }
    load();
    const interval = setInterval(load, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <TerminalPanel title="all-squads.tsv">
      <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-widest text-neon-400/70">
        <Radio className="h-3.5 w-3.5 animate-pulse" /> Live across every squad
      </div>
      <div className="space-y-2.5">
        {stats === null && <p className="text-sm text-neon-100/30">loading…</p>}
        {stats?.map((team, index) => {
          const pct = Math.min(100, Math.round((team.currentLevel / team.totalLevels) * 100));
          const isYou = team.teamNumber === highlightTeamNumber;
          return (
            <motion.div
              key={team.teamNumber}
              layout
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05, ease: "easeOut" }}
              className={`rounded-md border p-2.5 ${isYou ? "border-current bg-white/5" : "border-panel-border"}`}
              style={isYou ? { color: team.color, borderColor: team.color } : undefined}
            >
              <div className="flex items-center gap-2">
                <TeamAvatar teamNumber={team.teamNumber} color={team.color} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold" style={{ color: isYou ? undefined : team.color }}>
                    {team.isFirstToFinish && <Trophy className="mr-1 inline h-3 w-3 text-amber-400" />}
                    {team.teamName}
                    {isYou && <span className="ml-1 text-[10px] text-neon-100/40">(you)</span>}
                  </p>
                  <div className="hud-cut-sm mt-1 h-2.5 w-full overflow-hidden border border-panel-border bg-void-2">
                    <div
                      className="hud-segmented-fill h-full transition-all"
                      style={{ width: `${pct}%`, color: team.color }}
                    />
                  </div>
                </div>
                <span className="shrink-0 text-xs text-neon-100/50">
                  {team.completed ? "done" : `${team.currentLevel}/${team.totalLevels}`}
                </span>
              </div>
            </motion.div>
          );
        })}
        {stats?.length === 0 && <p className="text-sm text-neon-100/30">No squads yet.</p>}
      </div>
    </TerminalPanel>
  );
}
