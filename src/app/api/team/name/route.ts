import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getTeamFromCookies } from "@/lib/auth";
import { logActivity } from "@/lib/game";

// Players own their squad's display name; teamNumber (admin-assigned) never changes.
const schema = z.object({ name: z.string().trim().min(1, "Enter a team name").max(60) });

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
    data: { name: parsed.data.name },
  });

  await logActivity(teamAuth.sessionId, teamAuth.teamId, "TEAM_RENAMED", { name: team.name });
  return NextResponse.json({ name: team.name });
}
