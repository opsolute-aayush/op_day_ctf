"use client";

import { useCallback, useEffect, useState } from "react";

export interface UnlockedClue {
  levelNumber: number;
  locationClue: string;
  wordReward: string;
  hint?: string;
}

export interface TeamStatus {
  team: { id: string; name: string; color: string; members: string[] };
  gameActive: boolean;
  gameFinished: boolean;
  isWinner: boolean;
  totalLevels: number;
  currentLevel: number;
  unlockedLevels: number[];
  collectedWords: string[];
  unlockedClues: UnlockedClue[];
  finalUnlocked: boolean;
  activeHint: string | null;
  completed: boolean;
  completedAt: string | null;
  gameStartedAt: string | null;
}

export function useTeamStatus(pollMs = 3000) {
  const [status, setStatus] = useState<TeamStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/team/status", { cache: "no-store" });
        if (cancelled) return;
        if (res.status === 401) {
          setUnauthorized(true);
          setLoading(false);
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setStatus(data.status);
      } catch {
        // transient network error — next poll will retry
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, pollMs);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pollMs, nonce]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  return { status, loading, unauthorized, refresh };
}
