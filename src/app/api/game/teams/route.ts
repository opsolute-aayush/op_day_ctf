import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionByCode } from "@/lib/game";
import { parseMembers, isMemberActive } from "@/lib/json";

// Public, minimal team list for the join screen. Just enough for a player
// to recognize and pick their own team. No puzzle content, no progress
// data. Scoped by the 6-digit session code every player enters before
// seeing any team list, since any number of independent sessions can be
// running at once.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")?.trim() ?? "";
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Enter a valid 6-digit session code." }, { status: 400 });
  }

  const session = await getSessionByCode(code);
  if (!session) {
    return NextResponse.json({ error: "No session found for that code." }, { status: 404 });
  }

  const teams = await prisma.team.findMany({
    where: { sessionId: session.id },
    orderBy: { teamNumber: "asc" },
    select: {
      id: true,
      teamNumber: true,
      name: true,
      color: true,
      members: true,
      progress: { select: { completed: true } },
    },
  });

  const now = Date.now();
  return NextResponse.json({
    teams: teams.map((t) => ({
      id: t.id,
      teamNumber: t.teamNumber,
      name: t.name,
      color: t.color,
      // Just the one flag, so a rejoining player can tell finished squads
      // apart from ones still playing, without leaking any puzzle/progress
      // detail beyond that.
      completed: t.progress?.completed ?? false,
      members: parseMembers(t.members).map((m) => ({ name: m.name, active: isMemberActive(m.lastSeenAt, now) })),
    })),
  });
}
