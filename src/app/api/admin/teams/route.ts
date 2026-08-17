import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminGuard";
import { logActivity } from "@/lib/game";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const teams = await prisma.team.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, color: true },
  });

  return NextResponse.json({ teams });
}

const createSchema = z.object({
  name: z.string().trim().min(2, "Team name must be at least 2 characters").max(60),
  color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Invalid color"),
});

// Only the Game Master can create a team — players can only join one they
// already see listed (see /api/auth/join-team), so the number of teams
// always matches however many the admin set up for the physical event.
export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  try {
    const team = await prisma.team.create({
      data: {
        name: parsed.data.name,
        color: parsed.data.color,
        members: "[]",
        progress: { create: {} },
      },
    });
    await logActivity(team.id, "TEAM_CREATED", { teamName: team.name });
    return NextResponse.json({ team: { id: team.id, name: team.name, color: team.color } });
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "A team with that name already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create team." }, { status: 500 });
  }
}
