import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminGuard";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const teams = await prisma.team.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, color: true },
  });

  return NextResponse.json({ teams });
}
