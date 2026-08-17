import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signTeamToken, setTeamCookie } from "@/lib/auth";
import { logActivity, buildTeamStatus, getSessionByCode } from "@/lib/game";
import { parseStringArray } from "@/lib/json";

// Players join an existing team (see /api/admin/teams); `code` is
// re-validated against the team's own session so a guessed/reused teamId
// from another session can't be joined.
const schema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit session code"),
  teamId: z.string().min(1),
  memberName: z.string().trim().min(1, "Enter your name").max(40),
  teamName: z.string().trim().min(1).max(60).optional(),
  teamColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Enter a valid hex color")
    .optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const session = await getSessionByCode(parsed.data.code);
  if (!session) {
    return NextResponse.json({ error: "No session found for that code." }, { status: 404 });
  }
  if (session.isFinished) {
    return NextResponse.json({ error: "This OP Day CTF has already finished." }, { status: 409 });
  }

  const team = await prisma.team.findUnique({ where: { id: parsed.data.teamId } });
  if (!team || team.sessionId !== session.id) {
    return NextResponse.json({ error: "That team doesn't exist. Ask the Game Master." }, { status: 404 });
  }

  const members = parseStringArray(team.members);
  const memberName = parsed.data.memberName;
  if (!members.some((m) => m.toLowerCase() === memberName.toLowerCase())) {
    members.push(memberName);
  }

  const data: { members: string; name?: string; color?: string } = { members: JSON.stringify(members) };
  if (parsed.data.teamName && parsed.data.teamName !== team.name) {
    data.name = parsed.data.teamName;
  }
  if (parsed.data.teamColor && parsed.data.teamColor.toUpperCase() !== team.color) {
    data.color = parsed.data.teamColor.toUpperCase();
  }
  await prisma.team.update({ where: { id: team.id }, data });

  await logActivity(session.id, team.id, "MEMBER_JOINED", { memberName });

  const token = signTeamToken({ teamId: team.id, teamName: team.name, sessionId: session.id });
  await setTeamCookie(token);

  const status = await buildTeamStatus(team.id);
  return NextResponse.json({ status });
}
