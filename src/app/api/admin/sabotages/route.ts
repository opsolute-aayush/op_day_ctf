import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminGuard";

// Admin sees everything, including the correct decoded answer. Players
// on the receiving end only ever get cipherText (see lib/sabotage.ts).
export async function GET() {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const rows = await prisma.sabotage.findMany({
    where: { sessionId: admin.sessionId },
    orderBy: { createdAt: "desc" },
    include: {
      sourceTeam: { select: { name: true, teamNumber: true, color: true } },
      targetTeam: { select: { name: true, teamNumber: true, color: true } },
    },
  });

  const sabotages = rows.map((r) => ({
    id: r.id,
    sourceTeam: r.sourceTeam,
    targetTeam: r.targetTeam,
    encoding: r.encoding,
    cipherText: r.cipherText,
    plainText: r.plainText,
    resolvedAt: r.resolvedAt,
    bypassed: r.bypassed,
    createdAt: r.createdAt,
  }));

  return NextResponse.json({ sabotages });
}
