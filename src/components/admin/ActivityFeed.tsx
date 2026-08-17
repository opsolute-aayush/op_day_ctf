"use client";

import { useEffect, useState } from "react";
import TerminalPanel from "@/components/TerminalPanel";

interface ActivityItem {
  id: string;
  teamName: string;
  eventType: string;
  createdAt: string;
}

const LABELS: Record<string, string> = {
  TEAM_REGISTERED: "registered for the hunt",
  LEVEL_UNLOCKED: "unlocked a level",
  WRONG_PASSWORD: "entered a wrong password",
  WRONG_FINAL_SENTENCE: "submitted an incorrect final sentence",
  WIN: "WON THE HUNT",
  CORRECT_BUT_TOO_LATE: "solved it — but too late",
  FORCE_UNLOCK: "was force-unlocked by the Game Master",
  HINT_RELEASED: "received a hint from the Game Master",
  GAME_STARTED: "— Game Master started the game",
  GAME_PAUSED: "— Game Master paused the game",
  GAME_RESET: "— Game Master reset the game",
  SENTENCE_UPDATED: "— Game Master updated the winning sentence",
};

export default function ActivityFeed({ refreshKey }: { refreshKey: number }) {
  const [items, setItems] = useState<ActivityItem[]>([]);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/admin/activity", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.feed);
    }
    load();
    const interval = setInterval(load, 2500);
    return () => clearInterval(interval);
  }, [refreshKey]);

  return (
    <TerminalPanel title="activity-feed.log">
      <div className="max-h-80 space-y-1.5 overflow-y-auto font-mono text-xs">
        {items.map((item) => (
          <p key={item.id} className="text-neon-100/70">
            <span className="text-neon-100/30">{new Date(item.createdAt).toLocaleTimeString()}</span>{" "}
            <span className="text-neon-500">{item.teamName}</span>{" "}
            {LABELS[item.eventType] ?? item.eventType.toLowerCase()}
          </p>
        ))}
        {items.length === 0 && <p className="text-neon-100/30">No activity yet.</p>}
      </div>
    </TerminalPanel>
  );
}
