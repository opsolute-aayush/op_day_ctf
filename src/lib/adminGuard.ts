import { NextResponse } from "next/server";
import { getAdminSessionFromCookies } from "@/lib/auth";
import type { AdminSession } from "@/lib/jwt";

/**
 * Returns the authenticated admin's session (so callers know which
 * GameSession to scope their query to) or a ready-to-return 401 response.
 * Callers narrow with `if (admin instanceof NextResponse) return admin;`.
 */
export async function requireAdmin(): Promise<AdminSession | NextResponse> {
  const admin = await getAdminSessionFromCookies();
  if (!admin) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  return admin;
}
