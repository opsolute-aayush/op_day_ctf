import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminGuard";
import { getGameConfig, logActivity } from "@/lib/game";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const config = await getGameConfig();
  return NextResponse.json({
    isActive: config.isActive,
    isFinished: config.isFinished,
    winningTeamId: config.winningTeamId,
    startedAt: config.startedAt,
  });
}

const actionSchema = z.object({ action: z.enum(["start", "pause", "end", "reset"]) });

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const body = await req.json().catch(() => null);
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const current = await getGameConfig();

  if (parsed.data.action === "start") {
    const config = await prisma.gameConfig.update({
      where: { id: 1 },
      // Only stamp startedAt the first time — resuming from a pause keeps
      // the original clock running for accurate "time to finish" tracking.
      data: { isActive: true, startedAt: current.startedAt ?? new Date() },
    });
    await logActivity(null, "GAME_STARTED", {});
    return NextResponse.json({ isActive: config.isActive, isFinished: config.isFinished });
  }

  if (parsed.data.action === "pause") {
    const config = await prisma.gameConfig.update({ where: { id: 1 }, data: { isActive: false } });
    await logActivity(null, "GAME_PAUSED", {});
    return NextResponse.json({ isActive: config.isActive, isFinished: config.isFinished });
  }

  if (parsed.data.action === "end") {
    // The only thing that actually locks the hunt for everyone — a team
    // finishing its own sentence never does this on its own.
    const config = await prisma.gameConfig.update({
      where: { id: 1 },
      data: { isActive: false, isFinished: true },
    });
    await logActivity(null, "GAME_ENDED", {});
    return NextResponse.json({ isActive: config.isActive, isFinished: config.isFinished });
  }

  // reset: wipes progress + win state, keeps registered teams and each team's puzzle/sentence.
  await prisma.$transaction([
    prisma.teamProgress.updateMany({
      data: {
        currentLevel: 1,
        unlockedLevels: "[0]",
        collectedWords: "[]",
        completed: false,
        completedAt: null,
        hintReleasedLevel: null,
        helpCreditsRemaining: 2,
      },
    }),
    prisma.gameConfig.update({
      where: { id: 1 },
      data: { isActive: false, isFinished: false, winningTeamId: null, startedAt: null },
    }),
  ]);
  await logActivity(null, "GAME_RESET", {});
  return NextResponse.json({ ok: true });
}
