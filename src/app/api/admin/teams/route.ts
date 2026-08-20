import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminGuard";
import { getSessionById, logActivity } from "@/lib/game";

const PALETTE = ["#39FF14", "#00F0FF", "#FF2ECC", "#FFD400", "#FF6A00", "#B026FF", "#FF3B3B", "#3B82F6"];

export async function GET() {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const teams = await prisma.team.findMany({
    where: { sessionId: admin.sessionId },
    orderBy: { teamNumber: "asc" },
    select: { id: true, teamNumber: true, name: true, color: true },
  });

  return NextResponse.json({ teams });
}

// Zero-input team creation, scoped to the admin's own session. Players can
// never create teams themselves (see /api/auth/join-team).
export async function POST() {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const [highest, session] = await Promise.all([
    prisma.team.findFirst({
      where: { sessionId: admin.sessionId },
      orderBy: { teamNumber: "desc" },
      select: { teamNumber: true },
    }),
    getSessionById(admin.sessionId),
  ]);
  const teamNumber = (highest?.teamNumber ?? 0) + 1;

  const team = await prisma.team.create({
    data: {
      sessionId: admin.sessionId,
      teamNumber,
      name: `Team ${teamNumber}`,
      color: PALETTE[(teamNumber - 1) % PALETTE.length],
      members: "[]",
      progress: { create: { sabotageCreditsRemaining: session?.sabotageCreditsPerTeam ?? 2 } },
    },
  });

  await logActivity(admin.sessionId, team.id, "TEAM_CREATED", { teamNumber });
  return NextResponse.json({ team: { id: team.id, teamNumber: team.teamNumber, name: team.name, color: team.color } });
}
