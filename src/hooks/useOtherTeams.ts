"use client";

import { useEffect, useState } from "react";

export interface OtherTeam {
  id: string;
  teamNumber: number;
  teamName: string;
  color: string;
}

/**
 * Loads every other team in the session (for a "pick a target squad" list),
 * once `trigger` becomes true. Shared by PlayerStatsPanel's sabotage and
 * swap pickers, which differ only in what opens them (the sabotage button
 * vs. a verified swap code).
 */
export function useOtherTeams(trigger: boolean, ownTeamId: string): OtherTeam[] | null {
  const [teams, setTeams] = useState<OtherTeam[] | null>(null);

  useEffect(() => {
    if (!trigger) return;
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/game/stats", { cache: "no-store" });
      if (!res.ok || cancelled) return;
      const data = await res.json();
      setTeams((data.stats as OtherTeam[]).filter((t) => t.id !== ownTeamId));
    })();
    return () => {
      cancelled = true;
    };
  }, [trigger, ownTeamId]);

  return teams;
}
