import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/adminGuard";
import { setSessionAdminPassword } from "@/lib/adminAuth";
import { logActivity } from "@/lib/game";

const schema = z.object({ newPassword: z.string().min(8, "At least 8 characters").max(200) });

// Requires an existing admin session — changes the password for whichever
// session the caller's cookie is scoped to.
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid password" }, { status: 400 });
  }

  await setSessionAdminPassword(admin.sessionId, parsed.data.newPassword);
  await logActivity(admin.sessionId, null, "ADMIN_PASSWORD_CHANGED", {});
  return NextResponse.json({ ok: true });
}
