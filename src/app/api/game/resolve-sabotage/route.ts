import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTeamFromCookies } from "@/lib/auth";
import { buildTeamStatus, logActivity } from "@/lib/game";
import { resolveSabotage } from "@/lib/sabotage";

const schema = z.object({ sabotageId: z.string().min(1), answer: z.string().min(1).max(200) });

export async function POST(req: NextRequest) {
  const teamAuth = await getTeamFromCookies();
  if (!teamAuth) {
    return NextResponse.json({ error: "Not joined to a team" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter the decoded text." }, { status: 400 });
  }

  const result = await resolveSabotage({
    teamId: teamAuth.teamId,
    sabotageId: parsed.data.sabotageId,
    answer: parsed.data.answer,
  });
  if ("error" in result) {
    await logActivity(teamAuth.sessionId, teamAuth.teamId, "SABOTAGE_ATTEMPT_FAILED", {});
    return NextResponse.json({ error: result.error }, { status: 401 });
  }

  const status = await buildTeamStatus(teamAuth.teamId);
  return NextResponse.json({ status });
}
