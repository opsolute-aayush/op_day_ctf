import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTeamFromCookies } from "@/lib/auth";
import { getGameConfig, getTotalLevels, logActivity, buildTeamStatus } from "@/lib/game";

// Self-service hint request — each team gets a limited number of these
// (TeamProgress.helpCreditsRemaining, default 2) for the whole game. Free,
// unlimited hint releases by the admin (see /api/admin/force-unlock) are a
// separate mechanism and never touch this budget.
export async function POST() {
  const teamAuth = await getTeamFromCookies();
  if (!teamAuth) {
    return NextResponse.json({ error: "Not joined to a team" }, { status: 401 });
  }

  const config = await getGameConfig();
  if (config.isFinished) {
    return NextResponse.json({ error: "The hunt has ended." }, { status: 403 });
  }
  if (!config.isActive) {
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

  // Already revealed (e.g. the admin gave it for free) — don't charge a credit again.
  const alreadyRevealed = progress.hintReleasedLevel === progress.currentLevel;

  if (!alreadyRevealed) {
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
    await logActivity(teamAuth.teamId, "HELP_USED", {
      levelNumber: progress.currentLevel,
      remaining: progress.helpCreditsRemaining - 1,
    });
  }

  const status = await buildTeamStatus(teamAuth.teamId);
  return NextResponse.json({ status });
}
