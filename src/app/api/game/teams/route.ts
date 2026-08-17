import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public, minimal team list for the join screen — just enough for a player
// to recognize and pick their own team. No puzzle content, no team IDs
// beyond what's needed to join, no progress data.
export async function GET() {
  const teams = await prisma.team.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, color: true, members: true },
  });

  return NextResponse.json({
    teams: teams.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      members: JSON.parse(t.members) as string[],
    })),
  });
}
