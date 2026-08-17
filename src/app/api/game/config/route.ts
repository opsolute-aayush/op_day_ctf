import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionByCode } from "@/lib/game";

// Public, minimal game state for a given session code — no clues/passwords/
// sentence leak here.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")?.trim() ?? "";
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Enter a valid 6-digit session code." }, { status: 400 });
  }

  const session = await getSessionByCode(code);
  if (!session) {
    return NextResponse.json({ error: "No session found for that code." }, { status: 404 });
  }

  const winningTeam = session.winningTeamId
    ? await prisma.team.findUnique({ where: { id: session.winningTeamId } })
    : null;

  return NextResponse.json({
    isActive: session.isActive,
    isFinished: session.isFinished,
    winningTeamName: winningTeam?.name ?? null,
  });
}
