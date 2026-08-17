import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rateLimit";
import { signAdminToken, setAdminCookie } from "@/lib/auth";

const schema = z.object({ key: z.string().min(1).max(200) });

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  const rate = checkRateLimit(`admin-login:${ip}`, 5, 60_000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many attempts. Slow down." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter the master key." }, { status: 400 });
  }

  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey || parsed.data.key !== adminKey) {
    return NextResponse.json({ error: "Invalid master key." }, { status: 401 });
  }

  const token = signAdminToken();
  await setAdminCookie(token);
  return NextResponse.json({ ok: true });
}
