import { NextResponse } from "next/server";
import { getTeamFromCookies } from "@/lib/auth";
import { getConnectedPlayers } from "@/lib/game";

// Player-facing version of the admin overview panel — every squad in the
// same session, not just your own, so the standby screen feels like a live
// room instead of a solo waiting page.
export async function GET() {
  const teamAuth = await getTeamFromCookies();
  if (!teamAuth) {
    return NextResponse.json({ error: "Not registered" }, { status: 401 });
  }

  const players = await getConnectedPlayers(teamAuth.sessionId);
  return NextResponse.json({ players });
}
