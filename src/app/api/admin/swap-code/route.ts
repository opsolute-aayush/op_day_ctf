import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminGuard";
import { logActivity } from "@/lib/game";

const schema = z.object({ code: z.string().trim().min(3).max(60) });

// Sets (or replaces) the session's single swap code. The admin authors the
// plaintext themselves and hides/obscures it physically however they like.
// The platform never encodes or transforms it; players type in exactly what
// the admin wrote here.
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Enter a code." }, { status: 400 });
  }

  const code = parsed.data.code.toUpperCase();

  await prisma.gameSession.update({
    where: { id: admin.sessionId },
    data: { swapCode: code },
  });
  await logActivity(admin.sessionId, null, "SWAP_CODE_SET", {});

  return NextResponse.json({ code });
}
