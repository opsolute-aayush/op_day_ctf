import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminGuard";

export async function GET() {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const rows = await prisma.progressSwap.findMany({
    where: { sessionId: admin.sessionId },
    orderBy: { createdAt: "desc" },
    include: {
      initiatorTeam: { select: { name: true, teamNumber: true, color: true } },
      partnerTeam: { select: { name: true, teamNumber: true, color: true } },
    },
  });

  const swaps = rows.map((r) => ({
    id: r.id,
    initiatorTeam: r.initiatorTeam,
    partnerTeam: r.partnerTeam,
    createdAt: r.createdAt,
    revertedAt: r.revertedAt,
  }));

  return NextResponse.json({ swaps });
}
