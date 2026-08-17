import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getTeamFromCookies } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { normalizePassword } from "@/lib/normalize";
import { parseIntArray, parseStringArray } from "@/lib/json";
import { getGameConfig, getTotalLevels, logActivity, buildTeamStatus } from "@/lib/game";

const schema = z.object({ password: z.string().min(1).max(200) });

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60_000;

export async function POST(req: NextRequest) {
  const teamAuth = await getTeamFromCookies();
  if (!teamAuth) {
    return NextResponse.json({ error: "Not registered" }, { status: 401 });
  }

  const rate = checkRateLimit(`unlock:${teamAuth.teamId}`, MAX_ATTEMPTS, WINDOW_MS);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${Math.ceil(rate.retryAfterMs / 1000)}s.` },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a password." }, { status: 400 });
  }

  const config = await getGameConfig();
  if (!config.isActive) {
    return NextResponse.json({ error: "The game is not currently active." }, { status: 403 });
  }
  if (config.isFinished) {
    return NextResponse.json({ error: "The game has already finished." }, { status: 403 });
  }

  const progress = await prisma.teamProgress.findUnique({ where: { teamId: teamAuth.teamId } });
  if (!progress) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }
  if (progress.completed) {
    return NextResponse.json({ error: "Your team has already finished the hunt." }, { status: 400 });
  }

  const totalLevels = await getTotalLevels(teamAuth.teamId);
  const targetLevel = progress.currentLevel;

  if (targetLevel >= totalLevels) {
    return NextResponse.json(
      { error: "All physical levels are unlocked — head to the final sentence screen." },
      { status: 400 }
    );
  }

  const levelConfig = await prisma.levelConfig.findUnique({
    where: { teamId_levelNumber: { teamId: teamAuth.teamId, levelNumber: targetLevel } },
  });
  if (!levelConfig) {
    return NextResponse.json({ error: "This level isn't configured yet. Ask the Game Master." }, { status: 500 });
  }

  const attempt = normalizePassword(parsed.data.password);
  const isMatch = await bcrypt.compare(attempt, levelConfig.password);

  if (!isMatch) {
    await logActivity(teamAuth.teamId, "WRONG_PASSWORD", { levelNumber: targetLevel });
    return NextResponse.json({ error: "Incorrect password. Keep hunting." }, { status: 401 });
  }

  const unlockedLevels = parseIntArray(progress.unlockedLevels);
  if (!unlockedLevels.includes(targetLevel)) unlockedLevels.push(targetLevel);
  const collectedWords = parseStringArray(progress.collectedWords);
  collectedWords.push(levelConfig.wordReward);

  const nextLevel = targetLevel + 1;

  await prisma.teamProgress.update({
    where: { teamId: teamAuth.teamId },
    data: {
      currentLevel: nextLevel,
      unlockedLevels: JSON.stringify(unlockedLevels),
      collectedWords: JSON.stringify(collectedWords),
    },
  });

  await logActivity(teamAuth.teamId, "LEVEL_UNLOCKED", {
    levelNumber: targetLevel,
    wordReward: levelConfig.wordReward,
  });

  const status = await buildTeamStatus(teamAuth.teamId);
  return NextResponse.json({ status });
}
