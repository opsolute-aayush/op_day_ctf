import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminGuard";
import { parseIntArray } from "@/lib/json";
import { getTotalLevels, logActivity } from "@/lib/game";

const schema = z.object({
  teamId: z.string().min(1),
  mode: z.enum(["unlock", "hint"]),
});

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const team = await prisma.team.findUnique({ where: { id: parsed.data.teamId } });
  if (!team || team.sessionId !== admin.sessionId) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const progress = await prisma.teamProgress.findUnique({ where: { teamId: parsed.data.teamId } });
  if (!progress) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const totalLevels = await getTotalLevels(parsed.data.teamId);
  const targetLevel = progress.currentLevel;

  if (parsed.data.mode === "hint") {
    await prisma.teamProgress.update({
      where: { teamId: parsed.data.teamId },
      data: { hintReleasedLevel: targetLevel },
    });
    await logActivity(admin.sessionId, parsed.data.teamId, "HINT_RELEASED", { levelNumber: targetLevel });
    return NextResponse.json({ ok: true });
  }

  // mode === "unlock": Game Master bypass — skip the password check entirely.
  if (targetLevel >= totalLevels) {
    return NextResponse.json({ error: "Team already has every level unlocked." }, { status: 400 });
  }

  const levelConfig = await prisma.levelConfig.findUnique({
    where: { teamId_levelNumber: { teamId: parsed.data.teamId, levelNumber: targetLevel } },
  });
  if (!levelConfig) {
    return NextResponse.json({ error: "That level isn't configured yet." }, { status: 400 });
  }

  const unlockedLevels = parseIntArray(progress.unlockedLevels);
  if (!unlockedLevels.includes(targetLevel)) unlockedLevels.push(targetLevel);
  // The Game Master's override is a full bypass — it also confirms the
  // word for free, since a stuck team wouldn't otherwise have any way to
  // know it.
  const verifiedWordLevels = parseIntArray(progress.verifiedWordLevels);
  if (!verifiedWordLevels.includes(targetLevel)) verifiedWordLevels.push(targetLevel);

  await prisma.teamProgress.update({
    where: { teamId: parsed.data.teamId },
    data: {
      currentLevel: targetLevel + 1,
      unlockedLevels: JSON.stringify(unlockedLevels),
      verifiedWordLevels: JSON.stringify(verifiedWordLevels),
      hintReleasedLevel: null,
    },
  });

  await logActivity(admin.sessionId, parsed.data.teamId, "FORCE_UNLOCK", { levelNumber: targetLevel });
  return NextResponse.json({ ok: true });
}
