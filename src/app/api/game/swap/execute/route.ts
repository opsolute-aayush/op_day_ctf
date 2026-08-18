import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTeamFromCookies } from "@/lib/auth";
import { getSessionById, buildTeamStatus } from "@/lib/game";
import { executeSwap } from "@/lib/swap";

const schema = z.object({ code: z.string().min(1), partnerTeamId: z.string().min(1) });

export async function POST(req: NextRequest) {
  const teamAuth = await getTeamFromCookies();
  if (!teamAuth) {
    return NextResponse.json({ error: "Not joined to a team" }, { status: 401 });
  }

  const session = await getSessionById(teamAuth.sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (!session.isActive || session.isFinished) {
    return NextResponse.json({ error: "The game isn't currently active." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Pick a squad to swap with." }, { status: 400 });
  }

  const result = await executeSwap({
    sessionId: teamAuth.sessionId,
    initiatorTeamId: teamAuth.teamId,
    partnerTeamId: parsed.data.partnerTeamId,
    code: parsed.data.code,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const status = await buildTeamStatus(teamAuth.teamId);
  return NextResponse.json({ status });
}
