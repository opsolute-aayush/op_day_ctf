import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminGuard";
import { getSessionById, logActivity } from "@/lib/game";
import { revertAllActiveSwaps } from "@/lib/swap";

export async function GET() {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const [session, activeSwap] = await Promise.all([
    getSessionById(admin.sessionId),
    prisma.progressSwap.findFirst({ where: { sessionId: admin.sessionId, revertedAt: null }, select: { id: true } }),
  ]);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({
    isActive: session.isActive,
    isFinished: session.isFinished,
    winningTeamId: session.winningTeamId,
    startedAt: session.startedAt,
    sabotageCreditsPerTeam: session.sabotageCreditsPerTeam,
    sabotageCooldownSeconds: session.sabotageCooldownSeconds,
    helpCreditsPerTeam: session.helpCreditsPerTeam,
    swapCode: session.swapCode,
    swapUsed: Boolean(activeSwap),
  });
}

const sabotageCapSchema = z.object({
  sabotageCreditsPerTeam: z.number().int().min(0).max(20),
  sabotageCooldownSeconds: z.number().int().min(0).max(3600),
});

const helpCapSchema = z.object({
  helpCreditsPerTeam: z.number().int().min(0).max(20),
});

// Sets the session-wide sabotage cap + cooldown and immediately resets every
// team's remaining count to the new cap. It's a live dial the admin can turn
// up/down mid-game, not just a default for new teams. The cooldown itself
// only affects future launches (existing lastSabotageAt stamps are untouched).
export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;
  const { sessionId } = admin;

  const body = await req.json().catch(() => null);

  // Dispatch on which key is present rather than trying both schemas blind,
  // so a bad helpCreditsPerTeam value reports its own error instead of the
  // unrelated "sabotageCreditsPerTeam missing" one.
  if (body && typeof body === "object" && "helpCreditsPerTeam" in body) {
    const helpParsed = helpCapSchema.safeParse(body);
    if (!helpParsed.success) {
      return NextResponse.json({ error: helpParsed.error.issues[0]?.message ?? "Invalid value" }, { status: 400 });
    }
    const teamIds = (await prisma.team.findMany({ where: { sessionId }, select: { id: true } })).map((t) => t.id);
    await prisma.$transaction([
      prisma.gameSession.update({
        where: { id: sessionId },
        data: { helpCreditsPerTeam: helpParsed.data.helpCreditsPerTeam },
      }),
      prisma.teamProgress.updateMany({
        where: { teamId: { in: teamIds } },
        data: { helpCreditsRemaining: helpParsed.data.helpCreditsPerTeam },
      }),
    ]);
    await logActivity(sessionId, null, "HELP_CAP_CHANGED", {
      helpCreditsPerTeam: helpParsed.data.helpCreditsPerTeam,
    });

    return NextResponse.json({ helpCreditsPerTeam: helpParsed.data.helpCreditsPerTeam });
  }

  const sabotageParsed = sabotageCapSchema.safeParse(body);
  if (sabotageParsed.success) {
    const teamIds = (await prisma.team.findMany({ where: { sessionId }, select: { id: true } })).map((t) => t.id);
    await prisma.$transaction([
      prisma.gameSession.update({
        where: { id: sessionId },
        data: {
          sabotageCreditsPerTeam: sabotageParsed.data.sabotageCreditsPerTeam,
          sabotageCooldownSeconds: sabotageParsed.data.sabotageCooldownSeconds,
        },
      }),
      prisma.teamProgress.updateMany({
        where: { teamId: { in: teamIds } },
        data: { sabotageCreditsRemaining: sabotageParsed.data.sabotageCreditsPerTeam },
      }),
    ]);
    await logActivity(sessionId, null, "SABOTAGE_CAP_CHANGED", {
      sabotageCreditsPerTeam: sabotageParsed.data.sabotageCreditsPerTeam,
      sabotageCooldownSeconds: sabotageParsed.data.sabotageCooldownSeconds,
    });

    return NextResponse.json({
      sabotageCreditsPerTeam: sabotageParsed.data.sabotageCreditsPerTeam,
      sabotageCooldownSeconds: sabotageParsed.data.sabotageCooldownSeconds,
    });
  }

  return NextResponse.json({ error: sabotageParsed.error.issues[0]?.message ?? "Invalid value" }, { status: 400 });
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
      // Only stamp startedAt the first time. Resuming from a pause keeps
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
    // Only action that locks the hunt for everyone. It also clears joined-member
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
  // Any swap in effect is restored first so "puzzles untouched by reset"
  // holds even if a swap had mixed two teams' passwords/clues/words together.
  await revertAllActiveSwaps(sessionId);
  const teamIds = (await prisma.team.findMany({ where: { sessionId }, select: { id: true } })).map((t) => t.id);
  await prisma.$transaction([
    prisma.teamProgress.updateMany({
      where: { teamId: { in: teamIds } },
      data: {
        currentLevel: 1,
        unlockedLevels: "[0]",
        verifiedWordLevels: "[]",
        completed: false,
        completedAt: null,
        hintReleasedLevel: null,
        helpCreditsRemaining: current.helpCreditsPerTeam,
        sabotageCreditsRemaining: current.sabotageCreditsPerTeam,
        lastSabotageAt: null,
      },
    }),
    prisma.team.updateMany({ where: { sessionId }, data: { members: "[]" } }),
    prisma.sabotage.deleteMany({ where: { sessionId } }),
    prisma.progressSwap.deleteMany({ where: { sessionId } }),
    prisma.gameSession.update({
      where: { id: sessionId },
      data: { isActive: false, isFinished: false, winningTeamId: null, startedAt: null },
    }),
  ]);
  await logActivity(sessionId, null, "GAME_RESET", {});
  return NextResponse.json({ ok: true });
}
