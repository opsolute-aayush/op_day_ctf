import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminGuard";
import { parseIntArray, parseStringArray } from "@/lib/json";
import { getTotalLevels, getGameConfig } from "@/lib/game";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const [teams, totalLevels, config] = await Promise.all([
    prisma.team.findMany({
      include: { progress: true },
      orderBy: { createdAt: "asc" },
    }),
    getTotalLevels(),
    getGameConfig(),
  ]);

  const attemptCounts = await prisma.activityLog.groupBy({
    by: ["teamId", "eventType"],
    _count: { _all: true },
    where: { eventType: { in: ["WRONG_PASSWORD", "LEVEL_UNLOCKED", "WRONG_FINAL_SENTENCE"] } },
  });

  const attemptsByTeam = new Map<string, number>();
  for (const row of attemptCounts) {
    if (!row.teamId) continue;
    attemptsByTeam.set(row.teamId, (attemptsByTeam.get(row.teamId) ?? 0) + row._count._all);
  }

  const leaderboard = teams.map((team) => {
    const progress = team.progress;
    const unlockedLevels = progress ? parseIntArray(progress.unlockedLevels) : [0];
    const collectedWords = progress ? parseStringArray(progress.collectedWords) : [];
    return {
      teamId: team.id,
      teamName: team.name,
      color: team.color,
      members: JSON.parse(team.members) as string[],
      currentLevel: progress?.currentLevel ?? 1,
      totalLevels,
      unlockedLevels,
      collectedWords,
      attempts: attemptsByTeam.get(team.id) ?? 0,
      completed: progress?.completed ?? false,
      completedAt: progress?.completedAt ?? null,
      isWinner: config.winningTeamId === team.id,
      updatedAt: progress?.updatedAt ?? team.createdAt,
    };
  });

  leaderboard.sort((a, b) => {
    if (a.isWinner !== b.isWinner) return a.isWinner ? -1 : 1;
    if (a.currentLevel !== b.currentLevel) return b.currentLevel - a.currentLevel;
    return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
  });

  return NextResponse.json({
    leaderboard,
    gameConfig: {
      isActive: config.isActive,
      isFinished: config.isFinished,
      winningTeamId: config.winningTeamId,
    },
  });
}
