import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTeamFromCookies } from "@/lib/auth";
import { getSessionById, getTotalLevels, logActivity, buildTeamStatus } from "@/lib/game";

// Self-service hint request, limited by TeamProgress.helpCreditsRemaining
// (default 2). The admin's own force-unlock hint release is unlimited and
// never touches this budget.
export async function POST() {
  const teamAuth = await getTeamFromCookies();
  if (!teamAuth) {
    return NextResponse.json({ error: "Not joined to a team" }, { status: 401 });
  }

  const session = await getSessionById(teamAuth.sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (session.isFinished) {
    return NextResponse.json({ error: "The hunt has ended." }, { status: 403 });
  }
  if (!session.isActive) {
    return NextResponse.json({ error: "The game is not currently active." }, { status: 403 });
  }

  const progress = await prisma.teamProgress.findUnique({ where: { teamId: teamAuth.teamId } });
  if (!progress) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const totalLevels = await getTotalLevels(teamAuth.teamId);
  if (progress.currentLevel >= totalLevels) {
    return NextResponse.json({ error: "No hints available at the final level." }, { status: 400 });
  }

  const levelConfig = await prisma.levelConfig.findUnique({
    where: { teamId_levelNumber: { teamId: teamAuth.teamId, levelNumber: progress.currentLevel } },
  });
  if (!levelConfig?.hint) {
    return NextResponse.json({ error: "No hint is available for this level." }, { status: 400 });
  }

  // Every request spends a credit and re-reveals the hint, even if this
  // level's hint was already shown before — the credit pool is a flat,
  // level-independent budget, not a one-time-per-level unlock.
  if (progress.helpCreditsRemaining <= 0) {
    return NextResponse.json({ error: "You're out of hint requests for this hunt." }, { status: 403 });
  }
  await prisma.teamProgress.update({
    where: { teamId: teamAuth.teamId },
    data: {
      hintReleasedLevel: progress.currentLevel,
      helpCreditsRemaining: { decrement: 1 },
    },
  });
  await logActivity(teamAuth.sessionId, teamAuth.teamId, "HELP_USED", {
    levelNumber: progress.currentLevel,
    remaining: progress.helpCreditsRemaining - 1,
  });

  const status = await buildTeamStatus(teamAuth.teamId);
  return NextResponse.json({ status });
}
