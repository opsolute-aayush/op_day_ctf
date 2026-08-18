import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminGuard";
import { logActivity } from "@/lib/game";

// Force-clears a sabotage without the target having to solve it — for when
// a team is genuinely stuck or the admin wants to wave it off.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;
  const { id } = await ctx.params;

  const row = await prisma.sabotage.findUnique({ where: { id } });
  if (!row || row.sessionId !== admin.sessionId) {
    return NextResponse.json({ error: "Sabotage not found" }, { status: 404 });
  }
  if (row.resolvedAt) {
    return NextResponse.json({ ok: true });
  }

  await prisma.sabotage.update({ where: { id }, data: { resolvedAt: new Date(), bypassed: true } });
  await logActivity(admin.sessionId, row.targetTeamId, "SABOTAGE_BYPASSED", { sabotageId: id });

  return NextResponse.json({ ok: true });
}
