import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminGuard";

// Global reference content (see prisma/schema.prisma's CipherHint). It's not scoped to a session,
// so every admin sees the same hint bank for the technique cipher-selector.sh just ran.
export async function GET() {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const rows = await prisma.cipherHint.findMany();
  const hints: Record<string, string[]> = {};
  for (const row of rows) {
    try {
      const parsed = JSON.parse(row.hints);
      if (Array.isArray(parsed)) hints[row.methodId] = parsed.filter((h) => typeof h === "string");
    } catch {
      // Malformed row: skip it rather than breaking the whole panel.
    }
  }

  return NextResponse.json({ hints });
}
