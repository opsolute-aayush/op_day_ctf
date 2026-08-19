"use client";

import { ListOrdered } from "lucide-react";
import TerminalPanel from "@/components/TerminalPanel";
import TeamStandingsList, { type TeamStat } from "@/components/TeamStandingsList";
import { usePolledFetch } from "@/hooks/usePolledFetch";

/** The full ranked board shown on /winner — same data/ranking as TeamStatsPanel, dressed up for the win screen. */
export default function FinalStandings({ highlightTeamNumber }: { highlightTeamNumber?: number }) {
  const data = usePolledFetch<{ stats: TeamStat[] }>("/api/game/stats", 5000);
  const stats = data?.stats ?? null;

  return (
    <TerminalPanel title="final-standings.tsv" className="neon-border-glow">
      <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-widest text-neon-400/70">
        <ListOrdered className="h-3.5 w-3.5" /> Squad rankings — updates live until the Game Master ends the hunt
      </div>
      <TeamStandingsList stats={stats} highlightTeamNumber={highlightTeamNumber} variant="hero" />
    </TerminalPanel>
  );
}
