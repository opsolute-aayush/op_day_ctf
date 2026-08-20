import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminGuard";
import { parseIntArray, parseMembers } from "@/lib/json";
import { getSessionById } from "@/lib/game";

export async function GET() {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const [teams, session] = await Promise.all([
    prisma.team.findMany({
      where: { sessionId: admin.sessionId },
      include: { progress: true, _count: { select: { levels: true } } },
      orderBy: { teamNumber: "asc" },
    }),
    getSessionById(admin.sessionId),
  ]);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const attemptCounts = await prisma.activityLog.groupBy({
    by: ["teamId", "eventType"],
    _count: { _all: true },
    where: {
      sessionId: admin.sessionId,
      eventType: { in: ["WRONG_PASSWORD", "LEVEL_UNLOCKED", "WRONG_FINAL_SENTENCE"] },
    },
  });

  const attemptsByTeam = new Map<string, number>();
  for (const row of attemptCounts) {
    if (!row.teamId) continue;
    attemptsByTeam.set(row.teamId, (attemptsByTeam.get(row.teamId) ?? 0) + row._count._all);
  }

  const leaderboard = teams.map((team) => {
    const progress = team.progress;
    const unlockedLevels = progress ? parseIntArray(progress.unlockedLevels) : [0];
    const totalLevels = team._count.levels + 1; // + implicit final sentence-assembly level
    return {
      teamId: team.id,
      teamNumber: team.teamNumber,
      teamName: team.name,
      color: team.color,
      members: parseMembers(team.members).map((m) => m.name),
      currentLevel: progress?.currentLevel ?? 1,
      totalLevels,
      unlockedLevels,
      attempts: attemptsByTeam.get(team.id) ?? 0,
      helpCreditsRemaining: progress?.helpCreditsRemaining ?? session.helpCreditsPerTeam,
      completed: progress?.completed ?? false,
      completedAt: progress?.completedAt ?? null,
      isFirstToFinish: session.winningTeamId === team.id,
      updatedAt: progress?.updatedAt ?? team.createdAt,
    };
  });

  // Finished teams float to the top (first-to-finish first), then sort the
  // rest by progress ratio since teams can have different numbers of levels.
  leaderboard.sort((a, b) => {
    if (a.isFirstToFinish !== b.isFirstToFinish) return a.isFirstToFinish ? -1 : 1;
    if (a.completed !== b.completed) return a.completed ? -1 : 1;
    const ratioA = a.currentLevel / a.totalLevels;
    const ratioB = b.currentLevel / b.totalLevels;
    if (ratioA !== ratioB) return ratioB - ratioA;
    return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
  });

  return NextResponse.json({
    leaderboard,
    gameConfig: {
      isActive: session.isActive,
      isFinished: session.isFinished,
      winningTeamId: session.winningTeamId,
    },
  });
}
