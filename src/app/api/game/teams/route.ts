import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionByCode } from "@/lib/game";

// Public team list for the join screen, scoped by session code. No puzzle
// content or progress data — just enough to recognize your own team.
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
    select: { id: true, teamNumber: true, name: true, color: true, members: true },
  });

  return NextResponse.json({
    teams: teams.map((t) => ({
      id: t.id,
      teamNumber: t.teamNumber,
      name: t.name,
      color: t.color,
      members: JSON.parse(t.members) as string[],
    })),
  });
}
