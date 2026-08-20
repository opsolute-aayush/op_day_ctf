import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionByCode } from "@/lib/game";
import { touchLobbyPresence } from "@/lib/lobbyPresence";

// Called on a plain interval by /register while a device sits on the
// "Select Your Squad" screen. There's no auth beyond the session code,
// since nobody has a team cookie yet at this point.
const schema = z.object({
  code: z.string().trim().regex(/^\d{6}$/),
  deviceId: z.string().min(1).max(100),
  name: z.string().trim().min(1).max(40),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const session = await getSessionByCode(parsed.data.code);
  if (!session || session.isFinished) {
    return NextResponse.json({ error: "No session found for that code." }, { status: 404 });
  }

  touchLobbyPresence(session.id, parsed.data.deviceId, parsed.data.name);
  return NextResponse.json({ ok: true });
}
