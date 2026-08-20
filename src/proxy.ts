import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { TEAM_COOKIE, verifyTeamToken } from "@/lib/jwt";

// UX-level route guarding only. Every API route re-validates the team/admin
// session and game state server-side. This just avoids flashing protected
// pages to a browser with no session before the client redirects.
const PROTECTED_PREFIXES = ["/play", "/final", "/winner"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(TEAM_COOKIE)?.value;
  const team = token ? verifyTeamToken(token) : null;

  if (PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    if (!team) {
      return NextResponse.redirect(new URL("/register", request.url));
    }
  }

  if (pathname === "/register" && team) {
    return NextResponse.redirect(new URL("/play", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/play/:path*", "/final/:path*", "/winner/:path*", "/register"],
};
