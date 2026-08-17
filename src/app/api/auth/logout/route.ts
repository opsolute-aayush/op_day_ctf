import { NextResponse } from "next/server";
import { clearTeamCookie, getTeamFromCookies } from "@/lib/auth";
import { removeMemberPresence, logActivity } from "@/lib/game";

export async function POST() {
  const teamAuth = await getTeamFromCookies();
  if (teamAuth?.memberName) {
    await removeMemberPresence(teamAuth.teamId, teamAuth.memberName);
    await logActivity(teamAuth.sessionId, teamAuth.teamId, "MEMBER_LEFT", { memberName: teamAuth.memberName });
  }

  await clearTeamCookie();
  return NextResponse.json({ ok: true });
}
