import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminGuard";

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ teamId: string }> }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { teamId } = await ctx.params;
  await prisma.team.delete({ where: { id: teamId } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
