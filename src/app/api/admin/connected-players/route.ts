import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { getConnectedPlayers } from "@/lib/game";

// Same "active" window presence already uses for the register page's live
// roster (see /api/game/teams) — a member drops off here the moment they
// leave (logout removes them outright) or within ~15s of going quiet
// (closed tab, lost connection) without needing an explicit leave.
export async function GET() {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const players = await getConnectedPlayers(admin.sessionId);
  return NextResponse.json({ players });
}
