"use client";

import { Radio } from "lucide-react";
import TerminalPanel from "@/components/TerminalPanel";
import TeamStandingsList, { type TeamStat } from "@/components/TeamStandingsList";
import { usePolledFetch } from "@/hooks/usePolledFetch";

export default function TeamStatsPanel({ highlightTeamNumber }: { highlightTeamNumber?: number }) {
  const data = usePolledFetch<{ stats: TeamStat[] }>("/api/game/stats", 4000);
  const stats = data?.stats ?? null;

  return (
    <TerminalPanel title="all-squads.tsv">
      <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-widest text-neon-400/70">
        <Radio className="h-3.5 w-3.5 animate-pulse" /> Live across every squad
      </div>
      <TeamStandingsList stats={stats} highlightTeamNumber={highlightTeamNumber} variant="compact" />
    </TerminalPanel>
  );
}
