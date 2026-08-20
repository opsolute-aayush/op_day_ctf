import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rateLimit";
import { signAdminToken, setAdminCookie } from "@/lib/auth";
import { verifySessionLogin } from "@/lib/adminAuth";

// Logs a master back into a session they already created. See
// POST /api/admin/sessions for how a brand-new session (and its first
// password) gets created in the first place.
const schema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit session code"),
  password: z.string().min(1).max(200),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  const rate = checkRateLimit(`admin-login:${ip}`, 5, 60_000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many attempts. Slow down." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const sessionId = await verifySessionLogin(parsed.data.code, parsed.data.password);
  if (!sessionId) {
    return NextResponse.json({ error: "Invalid session code or password." }, { status: 401 });
  }

  const token = signAdminToken(sessionId);
  await setAdminCookie(token);
  return NextResponse.json({ ok: true });
}
