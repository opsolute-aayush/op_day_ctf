import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { revertSwap } from "@/lib/swap";

// Force-restores both teams' progress to exactly how it was right before
// this swap, and re-opens the (single-use) swap card for another claim.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;
  const { id } = await ctx.params;

  const result = await revertSwap(admin.sessionId, id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
