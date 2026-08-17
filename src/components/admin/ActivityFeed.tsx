"use client";

import { useEffect, useState } from "react";
import TerminalPanel from "@/components/TerminalPanel";

interface ActivityItem {
  id: string;
  teamName: string;
  eventType: string;
  details: Record<string, unknown> | null;
  createdAt: string;
}

function describe(item: ActivityItem): string {
  switch (item.eventType) {
    case "TEAM_CREATED":
      return "was created by the Game Master";
    case "MEMBER_JOINED":
      return `— ${String(item.details?.memberName ?? "someone")} joined`;
    case "TEAM_RENAMED":
      return `renamed their squad to "${String(item.details?.name ?? "")}"`;
    case "LEVEL_UNLOCKED":
      return "unlocked a level";
    case "WRONG_PASSWORD":
      return "entered a wrong password";
    case "WRONG_FINAL_SENTENCE":
      return "submitted an incorrect final sentence";
    case "WIN":
      return "FINISHED FIRST 🏆";
    case "TEAM_FINISHED":
      return "finished the hunt";
    case "FORCE_UNLOCK":
      return "was force-unlocked by the Game Master";
    case "HELP_USED":
      return `used a hint request (${String(item.details?.remaining ?? "?")} left)`;
    case "HINT_RELEASED":
      return "received a hint from the Game Master";
    case "GAME_STARTED":
      return "— Game Master started the game";
    case "GAME_PAUSED":
      return "— Game Master paused the game";
    case "GAME_ENDED":
      return "— Game Master ended the hunt for everyone";
    case "GAME_RESET":
      return "— Game Master reset the game";
    case "SENTENCE_UPDATED":
      return "— Game Master updated the winning sentence";
    default:
      return item.eventType.toLowerCase();
  }
}

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
            <span className="text-neon-500">{item.teamName}</span> {describe(item)}
          </p>
        ))}
        {items.length === 0 && <p className="text-neon-100/30">No activity yet.</p>}
      </div>
    </TerminalPanel>
  );
}
