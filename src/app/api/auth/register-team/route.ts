import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signTeamToken, setTeamCookie } from "@/lib/auth";
import { logActivity, buildTeamStatus, getGameConfig } from "@/lib/game";

const schema = z.object({
  teamName: z.string().trim().min(2, "Team name must be at least 2 characters").max(60),
  members: z.array(z.string().trim().min(1)).min(1, "Add at least one member").max(12),
  color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Invalid color"),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const config = await getGameConfig();
  if (config.isFinished) {
    return NextResponse.json({ error: "This OP Day CTF has already finished." }, { status: 409 });
  }

  const { teamName, members, color } = parsed.data;

  try {
    const team = await prisma.team.create({
      data: {
        name: teamName,
        members: JSON.stringify(members),
        color,
        progress: { create: {} },
      },
    });

    await logActivity(team.id, "TEAM_REGISTERED", { teamName: team.name });

    const token = signTeamToken({ teamId: team.id, teamName: team.name });
    await setTeamCookie(token);

    const status = await buildTeamStatus(team.id);
    return NextResponse.json({ status });
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "That team name is already taken." }, { status: 409 });
    }
    return NextResponse.json({ error: "Registration failed." }, { status: 500 });
  }
}
