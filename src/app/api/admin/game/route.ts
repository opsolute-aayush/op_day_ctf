import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminGuard";
import { getSessionById, logActivity } from "@/lib/game";

export async function GET() {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const session = await getSessionById(admin.sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({
    isActive: session.isActive,
    isFinished: session.isFinished,
    winningTeamId: session.winningTeamId,
    startedAt: session.startedAt,
    sabotageCreditsPerTeam: session.sabotageCreditsPerTeam,
  });
}

const sabotageCapSchema = z.object({ sabotageCreditsPerTeam: z.number().int().min(0).max(20) });

// Sets the session-wide sabotage cap and immediately resets every team's
// remaining count to it — a live dial the admin can turn up/down mid-game,
// not just a default for new teams.
export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;
  const { sessionId } = admin;

  const body = await req.json().catch(() => null);
  const parsed = sabotageCapSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid value" }, { status: 400 });
  }

  const teamIds = (await prisma.team.findMany({ where: { sessionId }, select: { id: true } })).map((t) => t.id);
  await prisma.$transaction([
    prisma.gameSession.update({ where: { id: sessionId }, data: { sabotageCreditsPerTeam: parsed.data.sabotageCreditsPerTeam } }),
    prisma.teamProgress.updateMany({
      where: { teamId: { in: teamIds } },
      data: { sabotageCreditsRemaining: parsed.data.sabotageCreditsPerTeam },
    }),
  ]);
  await logActivity(sessionId, null, "SABOTAGE_CAP_CHANGED", { sabotageCreditsPerTeam: parsed.data.sabotageCreditsPerTeam });

  return NextResponse.json({ sabotageCreditsPerTeam: parsed.data.sabotageCreditsPerTeam });
}

const actionSchema = z.object({ action: z.enum(["start", "pause", "end", "reset"]) });

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;
  const { sessionId } = admin;

  const body = await req.json().catch(() => null);
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const current = await getSessionById(sessionId);
  if (!current) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (parsed.data.action === "start") {
    const session = await prisma.gameSession.update({
      where: { id: sessionId },
      // Only stamp startedAt the first time — resuming from a pause keeps
      // the original clock running for accurate "time to finish" tracking.
      data: { isActive: true, startedAt: current.startedAt ?? new Date() },
    });
    await logActivity(sessionId, null, "GAME_STARTED", {});
    return NextResponse.json({ isActive: session.isActive, isFinished: session.isFinished });
  }

  if (parsed.data.action === "pause") {
    const session = await prisma.gameSession.update({ where: { id: sessionId }, data: { isActive: false } });
    await logActivity(sessionId, null, "GAME_PAUSED", {});
    return NextResponse.json({ isActive: session.isActive, isFinished: session.isFinished });
  }

  if (parsed.data.action === "end") {
    // Only action that locks the hunt for everyone — also clears joined-member
    // rosters, since those names are only meaningful for the event that just ended.
    const [session] = await prisma.$transaction([
      prisma.gameSession.update({
        where: { id: sessionId },
        data: { isActive: false, isFinished: true },
      }),
      prisma.team.updateMany({ where: { sessionId }, data: { members: "[]" } }),
    ]);
    await logActivity(sessionId, null, "GAME_ENDED", {});
    return NextResponse.json({ isActive: session.isActive, isFinished: session.isFinished });
  }

  // reset: wipes progress/win state/rosters, keeps teams and their puzzles.
  const teamIds = (await prisma.team.findMany({ where: { sessionId }, select: { id: true } })).map((t) => t.id);
  await prisma.$transaction([
    prisma.teamProgress.updateMany({
      where: { teamId: { in: teamIds } },
      data: {
        currentLevel: 1,
        unlockedLevels: "[0]",
        collectedWords: "[]",
        verifiedWordLevels: "[]",
        completed: false,
        completedAt: null,
        hintReleasedLevel: null,
        helpCreditsRemaining: 2,
        sabotageCreditsRemaining: current.sabotageCreditsPerTeam,
      },
    }),
    prisma.team.updateMany({ where: { sessionId }, data: { members: "[]" } }),
    prisma.sabotage.deleteMany({ where: { sessionId } }),
    prisma.gameSession.update({
      where: { id: sessionId },
      data: { isActive: false, isFinished: false, winningTeamId: null, startedAt: null },
    }),
  ]);
  await logActivity(sessionId, null, "GAME_RESET", {});
  return NextResponse.json({ ok: true });
}
