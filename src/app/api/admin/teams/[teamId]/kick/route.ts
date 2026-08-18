import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminGuard";
import { removeMemberPresence, logActivity } from "@/lib/game";

const schema = z.object({ name: z.string().min(1) });

// Removes one player from a team's roster without touching the rest of the
// squad — the admin-triggered equivalent of that player hitting Leave Team
// themselves. Their browser keeps its cookie and can still act as the team
// until they rejoin, but they drop off every roster/presence list
// immediately and their name is freed up to rejoin under.
export async function POST(req: NextRequest, ctx: { params: Promise<{ teamId: string }> }) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;
  const { teamId } = await ctx.params;

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team || team.sessionId !== admin.sessionId) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Missing player name" }, { status: 400 });
  }

  await removeMemberPresence(teamId, parsed.data.name);
  await logActivity(admin.sessionId, teamId, "MEMBER_KICKED", { memberName: parsed.data.name });

  return NextResponse.json({ ok: true });
}
