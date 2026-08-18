import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getTeamFromCookies, setTeamCookie, signTeamToken } from "@/lib/auth";
import { logActivity } from "@/lib/game";
import { parseMembers } from "@/lib/json";
import { withKeyLock } from "@/lib/mutex";

const schema = z.object({ name: z.string().trim().min(1, "Enter your name").max(40) });

// Renaming re-signs the team cookie with the new memberName — every other
// route (presence heartbeat, leave-team, connected-players) matches a
// player by that exact string, so a stale cookie would silently stop their
// heartbeat from finding their own roster entry.
export async function PUT(req: NextRequest) {
  const teamAuth = await getTeamFromCookies();
  if (!teamAuth?.memberName) {
    return NextResponse.json({ error: "Not joined to a team" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const oldName = teamAuth.memberName;
  const newName = parsed.data.name;

  await withKeyLock(`team-members:${teamAuth.teamId}`, async () => {
    const team = await prisma.team.findUniqueOrThrow({ where: { id: teamAuth.teamId }, select: { members: true } });
    const members = parseMembers(team.members);
    const match = members.find((m) => m.name === oldName);
    if (match) match.name = newName;
    await prisma.team.update({ where: { id: teamAuth.teamId }, data: { members: JSON.stringify(members) } });
  });

  await logActivity(teamAuth.sessionId, teamAuth.teamId, "MEMBER_RENAMED", { from: oldName, to: newName });

  // Rebuild the payload from scratch rather than spreading teamAuth — the
  // decoded token also carries iat/exp, and jwt.sign() rejects a payload
  // that already has exp when expiresIn is also passed.
  const token = signTeamToken({
    teamId: teamAuth.teamId,
    teamName: teamAuth.teamName,
    sessionId: teamAuth.sessionId,
    memberName: newName,
  });
  await setTeamCookie(token);

  return NextResponse.json({ name: newName });
}
