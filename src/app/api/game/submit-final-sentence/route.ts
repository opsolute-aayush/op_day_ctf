import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getTeamFromCookies } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { normalizeSentence } from "@/lib/normalize";
import { getGameConfig, getTotalLevels, logActivity, buildTeamStatus } from "@/lib/game";

const schema = z.object({ sentence: z.string().min(1).max(2000) });

const MAX_ATTEMPTS = 8;
const WINDOW_MS = 60_000;

export async function POST(req: NextRequest) {
  const teamAuth = await getTeamFromCookies();
  if (!teamAuth) {
    return NextResponse.json({ error: "Not registered" }, { status: 401 });
  }

  const rate = checkRateLimit(`final:${teamAuth.teamId}`, MAX_ATTEMPTS, WINDOW_MS);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${Math.ceil(rate.retryAfterMs / 1000)}s.` },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter your assembled sentence." }, { status: 400 });
  }

  const config = await getGameConfig();
  if (config.isFinished) {
    return NextResponse.json(
      { error: "The hunt has already been won by another team." },
      { status: 403 }
    );
  }
  if (!config.isActive) {
    return NextResponse.json({ error: "The game is not currently active." }, { status: 403 });
  }

  const [progress, team] = await Promise.all([
    prisma.teamProgress.findUnique({ where: { teamId: teamAuth.teamId } }),
    prisma.team.findUnique({ where: { id: teamAuth.teamId } }),
  ]);
  if (!progress || !team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const totalLevels = await getTotalLevels(teamAuth.teamId);
  if (progress.currentLevel < totalLevels) {
    return NextResponse.json({ error: "You haven't unlocked the final level yet." }, { status: 400 });
  }

  const correct = normalizeSentence(parsed.data.sentence) === normalizeSentence(team.winningSentence);

  if (!correct) {
    await logActivity(teamAuth.teamId, "WRONG_FINAL_SENTENCE", { submitted: parsed.data.sentence });
    return NextResponse.json({ error: "Not quite — recheck the order of your words." }, { status: 401 });
  }

  // Atomically claim the win so two teams submitting near-simultaneously can't both "win".
  const claim = await prisma.gameConfig.updateMany({
    where: { id: 1, isFinished: false },
    data: { isFinished: true, isActive: false, winningTeamId: teamAuth.teamId },
  });
  const wonRace = claim.count > 0;

  await prisma.teamProgress.update({
    where: { teamId: teamAuth.teamId },
    data: { completed: true, completedAt: new Date() },
  });

  await logActivity(teamAuth.teamId, wonRace ? "WIN" : "CORRECT_BUT_TOO_LATE", {});

  const status = await buildTeamStatus(teamAuth.teamId);
  return NextResponse.json({ status, wonRace });
}
