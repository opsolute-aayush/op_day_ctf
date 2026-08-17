import { NextResponse } from "next/server";
import { getAdminSessionFromCookies } from "@/lib/auth";
import { getSessionById } from "@/lib/game";

export async function GET() {
  const admin = await getAdminSessionFromCookies();
  if (!admin) {
    return NextResponse.json({ isAdmin: false });
  }

  const session = await getSessionById(admin.sessionId);
  if (!session) {
    // Session was deleted out from under a still-valid cookie.
    return NextResponse.json({ isAdmin: false });
  }

  return NextResponse.json({ isAdmin: true, code: session.code });
}
