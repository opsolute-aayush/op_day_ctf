import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signTeamToken, setTeamCookie } from "@/lib/auth";
import { logActivity, buildTeamStatus, getSessionByCode } from "@/lib/game";
import { parseMembers } from "@/lib/json";
import { withKeyLock } from "@/lib/mutex";

// Teams are pre-created by the Game Master (see /api/admin/teams), so the
// team count always matches the physical groups at the event. Players can
// only join an existing team, never mint a new one from the app. `code` is
// required and re-validated server-side against the team's own session.
// Even though teamId alone would resolve a team, requiring the code too
// stops a client from joining a team it only reached by guessing or reusing
// an ID from a different session.
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

  // Two teammates can submit within milliseconds of each other (e.g. both
  // tapping "Join" right after scanning the same QR code). Without a lock,
  // both requests read the same members list before either write lands, and
  // whichever write finishes last silently erases the other's entry. Locking
  // per team serializes the read-modify-write so nobody gets dropped.
  const canonicalName = await withKeyLock(`team-members:${team.id}`, async () => {
    const fresh = await prisma.team.findUniqueOrThrow({ where: { id: team.id }, select: { members: true } });
    const members = parseMembers(fresh.members);
    const now = new Date().toISOString();
    const existing = members.find((m) => m.name.toLowerCase() === parsed.data.memberName.toLowerCase());
    // Rejoining reuses the stored name's original casing and just refreshes
    // presence; a genuinely new name gets its own entry.
    const name = existing?.name ?? parsed.data.memberName;
    if (existing) {
      existing.lastSeenAt = now;
    } else {
      members.push({ name, lastSeenAt: now });
    }

    const data: { members: string; name?: string; color?: string } = { members: JSON.stringify(members) };
    if (parsed.data.teamName && parsed.data.teamName !== team.name) {
      data.name = parsed.data.teamName;
    }
    if (parsed.data.teamColor && parsed.data.teamColor.toUpperCase() !== team.color) {
      data.color = parsed.data.teamColor.toUpperCase();
    }
    await prisma.team.update({ where: { id: team.id }, data });
    return name;
  });

  await logActivity(session.id, team.id, "MEMBER_JOINED", { memberName: canonicalName });

  const token = signTeamToken({ teamId: team.id, teamName: team.name, sessionId: session.id, memberName: canonicalName });
  await setTeamCookie(token);

  const status = await buildTeamStatus(team.id);
  return NextResponse.json({ status });
}
