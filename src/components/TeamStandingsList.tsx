"use client";

import { motion } from "framer-motion";
import { Crown, Medal } from "lucide-react";
import TeamAvatar from "@/components/TeamAvatar";

export interface TeamStat {
  teamNumber: number;
  teamName: string;
  color: string;
  currentLevel: number;
  totalLevels: number;
  completed: boolean;
  completedAt: string | null;
  isFirstToFinish: boolean;
  position: number | null;
}

// Used by TeamStatsPanel (the live sidebar shown mid-hunt on /play) to render
// "who finished in what order" consistently with its ranking/medal styling.
export const RANK_STYLE: Record<number, { color: string; glow: string }> = {
  1: { color: "#FFD700", glow: "rgba(255, 212, 0, 0.5)" },
  2: { color: "#D8E2EC", glow: "rgba(216, 226, 236, 0.4)" },
  3: { color: "#E0954E", glow: "rgba(224, 149, 78, 0.45)" },
};

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

function RankBadge({ position, size }: { position: number | null; size: "sm" | "lg" }) {
  const dims = size === "lg" ? "h-10 w-10 text-sm" : "h-7 w-7 text-[11px]";
  if (position === null) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-full border border-panel-border font-mono text-neon-100/30 ${dims}`}
      >
        —
      </div>
    );
  }
  const style = RANK_STYLE[position];
  if (!style) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-full border border-panel-border font-mono text-neon-100/50 ${dims}`}
      >
        {position}
      </div>
    );
  }
  const Icon = position === 1 ? Crown : Medal;
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-display ${dims}`}
      style={{
        color: style.color,
        border: `2px solid ${style.color}`,
        backgroundColor: `${style.color}1a`,
        boxShadow: `0 0 12px ${style.glow}`,
      }}
    >
      <Icon className={size === "lg" ? "h-5 w-5" : "h-3.5 w-3.5"} fill={style.color} strokeWidth={1.5} />
    </div>
  );
}

interface TeamStandingsListProps {
  stats: TeamStat[] | null;
  highlightTeamNumber?: number;
  variant?: "compact" | "hero";
}

export default function TeamStandingsList({ stats, highlightTeamNumber, variant = "compact" }: TeamStandingsListProps) {
  const isHero = variant === "hero";

  if (stats === null) {
    return <p className="text-sm text-neon-100/30">loading…</p>;
  }
  if (stats.length === 0) {
    return <p className="text-sm text-neon-100/30">No squads yet.</p>;
  }

  return (
    <div className={isHero ? "space-y-3" : "space-y-2.5"}>
      {stats.map((team, index) => {
        const pct = Math.min(100, Math.round((team.currentLevel / team.totalLevels) * 100));
        const isYou = team.teamNumber === highlightTeamNumber;
        const rankStyle = team.position ? RANK_STYLE[team.position] : undefined;

        return (
          <motion.div
            key={team.teamNumber}
            layout
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05, ease: "easeOut" }}
            className={`flex items-center gap-3 rounded-md border p-2.5 ${isHero ? "p-3.5" : ""} ${
              isYou ? "bg-white/5" : "border-panel-border"
            }`}
            style={{
              borderColor: isYou ? team.color : rankStyle ? `${rankStyle.color}55` : undefined,
              boxShadow: rankStyle ? `0 0 16px ${rankStyle.glow}` : undefined,
            }}
          >
            <RankBadge position={team.position} size={isHero ? "lg" : "sm"} />
            <TeamAvatar teamNumber={team.teamNumber} color={team.color} size={isHero ? "md" : "sm"} />
            <div className="min-w-0 flex-1">
              <p className={`truncate font-semibold ${isHero ? "text-base" : "text-sm"}`} style={{ color: team.color }}>
                {team.teamName}
                {isYou && <span className="ml-1.5 text-[10px] uppercase text-neon-100/40">(you)</span>}
              </p>
              {team.completed ? (
                <p className="text-xs uppercase tracking-widest" style={{ color: rankStyle?.color ?? "var(--neon-400)" }}>
                  {team.position ? `${ordinal(team.position)} place` : "finished"}
                </p>
              ) : (
                <div className="hud-cut-sm mt-1 h-2.5 w-full overflow-hidden border border-panel-border bg-void-2">
                  <div
                    className="hud-segmented-fill h-full transition-all"
                    style={{ width: `${pct}%`, color: team.color }}
                  />
                </div>
              )}
            </div>
            <span className="shrink-0 text-xs text-neon-100/50">
              {team.completed ? "done" : `${team.currentLevel}/${team.totalLevels}`}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
