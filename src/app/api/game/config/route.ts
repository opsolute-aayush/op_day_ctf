import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGameConfig } from "@/lib/game";

// Public, minimal game state — no clues/passwords/sentence leak here.
export async function GET() {
  const config = await getGameConfig();
  const winningTeam = config.winningTeamId
    ? await prisma.team.findUnique({ where: { id: config.winningTeamId } })
    : null;

  return NextResponse.json({
    isActive: config.isActive,
    isFinished: config.isFinished,
    winningTeamName: winningTeam?.name ?? null,
  });
}
