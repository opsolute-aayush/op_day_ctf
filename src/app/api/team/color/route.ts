import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getTeamFromCookies } from "@/lib/auth";
import { logActivity } from "@/lib/game";

// Teams can override the admin's initial palette pick any time.
const schema = z.object({ color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Enter a valid hex color") });

export async function PUT(req: NextRequest) {
  const teamAuth = await getTeamFromCookies();
  if (!teamAuth) {
    return NextResponse.json({ error: "Not joined to a team" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const team = await prisma.team.update({
    where: { id: teamAuth.teamId },
    data: { color: parsed.data.color.toUpperCase() },
  });

  await logActivity(teamAuth.sessionId, teamAuth.teamId, "TEAM_RECOLORED", { color: team.color });
  return NextResponse.json({ color: team.color });
}
