import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminGuard";
import { normalizePassword } from "@/lib/normalize";
import { generateCipher } from "@/lib/cipher";

const updateSchema = z.object({
  password: z.string().min(1).max(200).optional(),
  locationClue: z.string().min(1).max(2000).optional(),
  wordReward: z.string().min(1).max(200).optional(),
  hint: z.string().max(2000).nullable().optional(),
});

async function assertTeamOwnedByAdmin(teamId: string, sessionId: string) {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  return Boolean(team && team.sessionId === sessionId);
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ teamId: string; levelNumber: string }> }) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const { teamId, levelNumber: levelNumberParam } = await ctx.params;
  if (!(await assertTeamOwnedByAdmin(teamId, admin.sessionId))) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const levelNumber = Number(levelNumberParam);
  if (!Number.isInteger(levelNumber)) {
    return NextResponse.json({ error: "Invalid level number" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const existing = await prisma.levelConfig.findUnique({
    where: { teamId_levelNumber: { teamId, levelNumber } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Level not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.locationClue !== undefined) data.locationClue = parsed.data.locationClue;
  if (parsed.data.wordReward !== undefined) data.wordReward = parsed.data.wordReward;
  if (parsed.data.hint !== undefined) data.hint = parsed.data.hint;
  if (parsed.data.password) {
    data.password = await bcrypt.hash(normalizePassword(parsed.data.password), 10);
    data.cipherMessage = generateCipher(parsed.data.password).base64;
  }

  const level = await prisma.levelConfig.update({ where: { id: existing.id }, data });

  return NextResponse.json({
    level: {
      levelNumber: level.levelNumber,
      locationClue: level.locationClue,
      wordReward: level.wordReward,
      hint: level.hint,
      cipherMessage: level.cipherMessage,
      hasPassword: true,
    },
  });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ teamId: string; levelNumber: string }> }) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const { teamId, levelNumber: levelNumberParam } = await ctx.params;
  if (!(await assertTeamOwnedByAdmin(teamId, admin.sessionId))) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const levelNumber = Number(levelNumberParam);
  if (!Number.isInteger(levelNumber)) {
    return NextResponse.json({ error: "Invalid level number" }, { status: 400 });
  }

  const existing = await prisma.levelConfig.findUnique({
    where: { teamId_levelNumber: { teamId, levelNumber } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Level not found" }, { status: 404 });
  }

  // Renumber every level above this one (for this team only) down by one, so
  // numbering stays contiguous (1..N) within that team's own puzzle.
  await prisma.$transaction(async (tx) => {
    await tx.levelConfig.delete({ where: { id: existing.id } });
    const higher = await tx.levelConfig.findMany({
      where: { teamId, levelNumber: { gt: levelNumber } },
      orderBy: { levelNumber: "asc" },
    });
    for (const lvl of higher) {
      await tx.levelConfig.update({ where: { id: lvl.id }, data: { levelNumber: lvl.levelNumber - 1 } });
    }
  });

  return NextResponse.json({ ok: true });
}
