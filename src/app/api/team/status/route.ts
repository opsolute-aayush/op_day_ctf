import { NextResponse } from "next/server";
import { getTeamFromCookies } from "@/lib/auth";
import { buildTeamStatus } from "@/lib/game";

export async function GET() {
  const teamAuth = await getTeamFromCookies();
  if (!teamAuth) {
    return NextResponse.json({ error: "Not registered" }, { status: 401 });
  }

  const status = await buildTeamStatus(teamAuth.teamId);
  if (!status) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  return NextResponse.json({ status });
}
