import { NextResponse } from "next/server";
import { getIsAdminFromCookies } from "@/lib/auth";

/** Returns a 401 response if the caller is not an authenticated admin, else null. */
export async function requireAdmin(): Promise<NextResponse | null> {
  const isAdmin = await getIsAdminFromCookies();
  if (!isAdmin) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  return null;
}
