import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getTeamFromCookies } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { normalizeSentence } from "@/lib/normalize";
import { getSessionById, getTotalLevels, logActivity, buildTeamStatus } from "@/lib/game";

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

  const session = await getSessionById(teamAuth.sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (session.isFinished) {
    return NextResponse.json(
      { error: "The Game Master has ended the hunt — no more submissions are being accepted." },
      { status: 403 }
    );
  }
  if (!session.isActive) {
    return NextResponse.json({ error: "The game is not currently active." }, { status: 403 });
  }

  const [progress, team] = await Promise.all([
    prisma.teamProgress.findUnique({ where: { teamId: teamAuth.teamId } }),
    prisma.team.findUnique({ where: { id: teamAuth.teamId } }),
  ]);
  if (!progress || !team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  if (progress.completed) {
    return NextResponse.json({ error: "Your team has already finished the hunt." }, { status: 400 });
  }

  const totalLevels = await getTotalLevels(teamAuth.teamId);
  if (progress.currentLevel < totalLevels) {
    return NextResponse.json({ error: "You haven't unlocked the final level yet." }, { status: 400 });
  }

  const correct = normalizeSentence(parsed.data.sentence) === normalizeSentence(team.winningSentence);

  if (!correct) {
    await logActivity(teamAuth.sessionId, teamAuth.teamId, "WRONG_FINAL_SENTENCE", { submitted: parsed.data.sentence });
    return NextResponse.json({ error: "Not quite — recheck the order of your words." }, { status: 401 });
  }

  // Track (but don't act on) who finished first — bragging rights only. The
  // game itself keeps running for everyone else until the Game Master
  // explicitly ends it; one team finishing never locks anyone else out.
  const claim = await prisma.gameSession.updateMany({
    where: { id: teamAuth.sessionId, winningTeamId: null },
    data: { winningTeamId: teamAuth.teamId },
  });
  const isFirstToFinish = claim.count > 0;

  await prisma.teamProgress.update({
    where: { teamId: teamAuth.teamId },
    data: { completed: true, completedAt: new Date() },
  });

  await logActivity(teamAuth.sessionId, teamAuth.teamId, isFirstToFinish ? "WIN" : "TEAM_FINISHED", {});

  const status = await buildTeamStatus(teamAuth.teamId);
  return NextResponse.json({ status, isFirstToFinish });
}
