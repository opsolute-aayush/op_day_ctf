import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { getConnectedPlayers } from "@/lib/game";

// Unlike the register page's live roster (see /api/game/teams), this is NOT
// filtered by the ~15s heartbeat window. A member only drops off here via
// an explicit Leave Team/kick, so someone reading a physical clue with their
// phone locked still shows as connected. See getConnectedPlayers.
export async function GET() {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const players = await getConnectedPlayers(admin.sessionId);
  return NextResponse.json({ players });
}
