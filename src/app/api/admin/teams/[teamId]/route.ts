import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminGuard";
import { logActivity } from "@/lib/game";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ teamId: string }> }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { teamId } = await ctx.params;
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  return NextResponse.json({
    team: {
      id: team.id,
      teamNumber: team.teamNumber,
      name: team.name,
      color: team.color,
      members: JSON.parse(team.members) as string[],
      winningSentence: team.winningSentence,
    },
  });
}

const updateSchema = z.object({ winningSentence: z.string().trim().min(1).max(2000) });

export async function PUT(req: NextRequest, ctx: { params: Promise<{ teamId: string }> }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { teamId } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const team = await prisma.team
    .update({ where: { id: teamId }, data: { winningSentence: parsed.data.winningSentence } })
    .catch(() => null);
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  await logActivity(teamId, "SENTENCE_UPDATED", {});
  return NextResponse.json({ winningSentence: team.winningSentence });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ teamId: string }> }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { teamId } = await ctx.params;
  await prisma.team.delete({ where: { id: teamId } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
