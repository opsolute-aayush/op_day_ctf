import { NextResponse } from "next/server";
import { getTeamFromCookies } from "@/lib/auth";
import { buildTeamStatus, touchMemberPresence } from "@/lib/game";

export async function GET() {
  const teamAuth = await getTeamFromCookies();
  if (!teamAuth) {
    return NextResponse.json({ error: "Not registered" }, { status: 401 });
  }

  // Polled every few seconds from /play, /final, /winner — doubles as this
  // member's presence heartbeat for the register page's "active now" display.
  if (teamAuth.memberName) {
    await touchMemberPresence(teamAuth.teamId, teamAuth.memberName);
  }

  const status = await buildTeamStatus(teamAuth.teamId);
  if (!status) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  return NextResponse.json({ status });
}
