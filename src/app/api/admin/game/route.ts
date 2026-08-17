import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminGuard";
import { getGameConfig, getTotalLevels, logActivity } from "@/lib/game";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const [config, totalLevels] = await Promise.all([getGameConfig(), getTotalLevels()]);
  return NextResponse.json({
    isActive: config.isActive,
    isFinished: config.isFinished,
    winningTeamId: config.winningTeamId,
    winningSentence: config.winningSentence,
    startedAt: config.startedAt,
    totalLevels,
  });
}

const updateSchema = z.object({ winningSentence: z.string().trim().min(1).max(2000) });

export async function PUT(req: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  await getGameConfig();
  const config = await prisma.gameConfig.update({
    where: { id: 1 },
    data: { winningSentence: parsed.data.winningSentence },
  });

  await logActivity(null, "SENTENCE_UPDATED", {});
  return NextResponse.json({ winningSentence: config.winningSentence });
}

const actionSchema = z.object({ action: z.enum(["start", "pause", "reset"]) });

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const body = await req.json().catch(() => null);
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  await getGameConfig();

  if (parsed.data.action === "start") {
    const config = await prisma.gameConfig.update({
      where: { id: 1 },
      data: { isActive: true, startedAt: new Date() },
    });
    await logActivity(null, "GAME_STARTED", {});
    return NextResponse.json({ isActive: config.isActive, isFinished: config.isFinished });
  }

  if (parsed.data.action === "pause") {
    const config = await prisma.gameConfig.update({ where: { id: 1 }, data: { isActive: false } });
    await logActivity(null, "GAME_PAUSED", {});
    return NextResponse.json({ isActive: config.isActive, isFinished: config.isFinished });
  }

  // reset: wipes progress + win state, keeps registered teams and level configuration.
  await prisma.$transaction([
    prisma.teamProgress.updateMany({
      data: {
        currentLevel: 1,
        unlockedLevels: "[0]",
        collectedWords: "[]",
        completed: false,
        completedAt: null,
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
