import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/adminAuth";
import { signAdminToken, setAdminCookie } from "@/lib/auth";
import { logActivity } from "@/lib/game";
import { checkRateLimit } from "@/lib/rateLimit";

// No auth required: creating a session IS how a master gets their first
// credential for it. The password is returned here exactly once.
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  const rate = checkRateLimit(`create-session:${ip}`, 10, 60_000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many attempts. Slow down." }, { status: 429 });
  }

  const { sessionId, code, password } = await createSession();
  await logActivity(sessionId, null, "SESSION_CREATED", {});

  const token = signAdminToken(sessionId);
  await setAdminCookie(token);

  return NextResponse.json({ code, password });
}
