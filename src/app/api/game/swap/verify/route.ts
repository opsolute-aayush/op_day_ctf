import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTeamFromCookies } from "@/lib/auth";
import { getSessionById } from "@/lib/game";
import { verifySwapCode } from "@/lib/swap";

const schema = z.object({ code: z.string().min(1) });

// Just checks the code. It doesn't move any progress yet. A correct response
// unlocks the partner-team picker on the client; the actual swap only
// happens once /api/game/swap/execute is called with a chosen partner.
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
    return NextResponse.json({ error: "Enter a code." }, { status: 400 });
  }

  const result = await verifySwapCode(teamAuth.sessionId, parsed.data.code);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
