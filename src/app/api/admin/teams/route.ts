import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminGuard";
import { logActivity } from "@/lib/game";

const PALETTE = ["#39FF14", "#00F0FF", "#FF2ECC", "#FFD400", "#FF6A00", "#B026FF", "#FF3B3B", "#3B82F6"];

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const teams = await prisma.team.findMany({
    orderBy: { teamNumber: "asc" },
    select: { id: true, teamNumber: true, name: true, color: true },
  });

  return NextResponse.json({ teams });
}

// One click, zero fields — creates the next numbered team slot. Players can
// never do this themselves (see /api/auth/join-team), so the team count is
// always exactly what the admin clicked into existence for the physical
// event. The team's display name is left for whoever joins it to pick.
export async function POST() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const highest = await prisma.team.findFirst({ orderBy: { teamNumber: "desc" }, select: { teamNumber: true } });
  const teamNumber = (highest?.teamNumber ?? 0) + 1;

  const team = await prisma.team.create({
    data: {
      teamNumber,
      name: `Team ${teamNumber}`,
      color: PALETTE[(teamNumber - 1) % PALETTE.length],
      members: "[]",
      progress: { create: {} },
    },
  });

  await logActivity(team.id, "TEAM_CREATED", { teamNumber });
  return NextResponse.json({ team: { id: team.id, teamNumber: team.teamNumber, name: team.name, color: team.color } });
}
