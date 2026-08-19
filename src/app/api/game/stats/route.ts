import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTeamFromCookies } from "@/lib/auth";
import { getSessionById } from "@/lib/game";

// Live progress board for every player, scoped to their own session.
// Deliberately excludes anything sensitive (attempts, words, clues).
export async function GET() {
  const teamAuth = await getTeamFromCookies();
  if (!teamAuth) {
    return NextResponse.json({ error: "Not registered" }, { status: 401 });
  }

  const [teams, session] = await Promise.all([
    prisma.team.findMany({
      where: { sessionId: teamAuth.sessionId },
      include: { progress: true, _count: { select: { levels: true } } },
      orderBy: { teamNumber: "asc" },
    }),
    getSessionById(teamAuth.sessionId),
  ]);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const stats = teams.map((team) => {
    const totalLevels = team._count.levels + 1;
    return {
      id: team.id,
      teamNumber: team.teamNumber,
      teamName: team.name,
      color: team.color,
      currentLevel: team.progress?.currentLevel ?? 1,
      totalLevels,
      completed: team.progress?.completed ?? false,
      completedAt: team.progress?.completedAt?.toISOString() ?? null,
      isFirstToFinish: session.winningTeamId === team.id,
    };
  });

  // Finishers first, ordered by actual finish time (not just the "isFirstToFinish"
  // flag, which only marks 1st place) — this is what lets the board rank 2nd,
  // 3rd, etc. Still-playing teams follow, ordered by progress.
  stats.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? -1 : 1;
    if (a.completed && b.completed) return new Date(a.completedAt!).getTime() - new Date(b.completedAt!).getTime();
    return b.currentLevel / b.totalLevels - a.currentLevel / a.totalLevels;
  });

  let finishRank = 0;
  const ranked = stats.map((s) => ({ ...s, position: s.completed ? ++finishRank : null }));

  return NextResponse.json({ stats: ranked, gameActive: session.isActive, gameFinished: session.isFinished });
}
