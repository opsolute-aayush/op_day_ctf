import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminGuard";
import { normalizePassword } from "@/lib/normalize";
import { generateCipher } from "@/lib/cipher";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ teamId: string }> }) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const { teamId } = await ctx.params;
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team || team.sessionId !== admin.sessionId) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const levels = await prisma.levelConfig.findMany({ where: { teamId }, orderBy: { levelNumber: "asc" } });
  return NextResponse.json({
    levels: levels.map((l) => ({
      levelNumber: l.levelNumber,
      locationClue: l.locationClue,
      wordReward: l.wordReward,
      hint: l.hint,
      cipherMessage: l.cipherMessage,
      hasPassword: Boolean(l.password),
      updatedAt: l.updatedAt,
    })),
  });
}

const createSchema = z.object({
  password: z.string().min(1).max(200),
  locationClue: z.string().min(1).max(2000),
  wordReward: z.string().min(1).max(200),
  hint: z.string().max(2000).optional(),
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ teamId: string }> }) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const { teamId } = await ctx.params;
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team || team.sessionId !== admin.sessionId) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const count = await prisma.levelConfig.count({ where: { teamId } });
  const levelNumber = count + 1;
  const passwordHash = await bcrypt.hash(normalizePassword(parsed.data.password), 10);
  const cipherMessage = generateCipher(parsed.data.password).base64;

  const level = await prisma.levelConfig.create({
    data: {
      teamId,
      levelNumber,
      password: passwordHash,
      cipherMessage,
      locationClue: parsed.data.locationClue,
      wordReward: parsed.data.wordReward,
      hint: parsed.data.hint,
    },
  });

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
