import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signTeamToken, setTeamCookie } from "@/lib/auth";
import { logActivity, buildTeamStatus, getGameConfig } from "@/lib/game";
import { parseStringArray } from "@/lib/json";

// Teams are pre-created by the Game Master (see /api/admin/teams) so the
// team count always matches the physical groups at the event — players can
// only join an existing team, never mint a new one from the app.
const schema = z.object({
  teamId: z.string().min(1),
  memberName: z.string().trim().min(1, "Enter your name").max(40),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const config = await getGameConfig();
  if (config.isFinished) {
    return NextResponse.json({ error: "This OP Day CTF has already finished." }, { status: 409 });
  }

  const team = await prisma.team.findUnique({ where: { id: parsed.data.teamId } });
  if (!team) {
    return NextResponse.json({ error: "That team doesn't exist. Ask the Game Master." }, { status: 404 });
  }

  const members = parseStringArray(team.members);
  const memberName = parsed.data.memberName;
  if (!members.some((m) => m.toLowerCase() === memberName.toLowerCase())) {
    members.push(memberName);
    await prisma.team.update({ where: { id: team.id }, data: { members: JSON.stringify(members) } });
  }

  await logActivity(team.id, "MEMBER_JOINED", { memberName });

  const token = signTeamToken({ teamId: team.id, teamName: team.name });
  await setTeamCookie(token);

  const status = await buildTeamStatus(team.id);
  return NextResponse.json({ status });
}
