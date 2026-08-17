import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminGuard";

export async function GET() {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const logs = await prisma.activityLog.findMany({
    where: { sessionId: admin.sessionId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { team: true },
  });

  const feed = logs.map((log) => ({
    id: log.id,
    teamName: log.team?.name ?? "—",
    eventType: log.eventType,
    details: log.details ? JSON.parse(log.details) : null,
    createdAt: log.createdAt,
  }));

  return NextResponse.json({ feed });
}
