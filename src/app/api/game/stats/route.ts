import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGameConfig } from "@/lib/game";

// Public live-progress board shown to every player, not just the admin —
// intentionally excludes anything sensitive (attempts, collected words,
// clues, member names) so it's just a friendly "who's ahead" scoreboard.
export async function GET() {
  const [teams, config] = await Promise.all([
    prisma.team.findMany({
      include: { progress: true, _count: { select: { levels: true } } },
      orderBy: { teamNumber: "asc" },
    }),
    getGameConfig(),
  ]);

  const stats = teams.map((team) => {
    const totalLevels = team._count.levels + 1;
    return {
      teamNumber: team.teamNumber,
      teamName: team.name,
      color: team.color,
      currentLevel: team.progress?.currentLevel ?? 1,
      totalLevels,
      completed: team.progress?.completed ?? false,
      isFirstToFinish: config.winningTeamId === team.id,
    };
  });

  stats.sort((a, b) => {
    if (a.isFirstToFinish !== b.isFirstToFinish) return a.isFirstToFinish ? -1 : 1;
    if (a.completed !== b.completed) return a.completed ? -1 : 1;
    return b.currentLevel / b.totalLevels - a.currentLevel / a.totalLevels;
  });

  return NextResponse.json({ stats, gameActive: config.isActive, gameFinished: config.isFinished });
}
