import { cookies } from "next/headers";
import {
  TEAM_COOKIE,
  ADMIN_COOKIE,
  signTeamToken,
  signAdminToken,
  verifyTeamToken,
  verifyAdminToken,
  type TeamTokenPayload,
} from "@/lib/jwt";

export { TEAM_COOKIE, ADMIN_COOKIE, signTeamToken, signAdminToken, verifyTeamToken, verifyAdminToken };

const isProd = process.env.NODE_ENV === "production";

export async function setTeamCookie(token: string) {
  const store = await cookies();
  store.set(TEAM_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 16,
  });
}

export async function setAdminCookie(token: string) {
  const store = await cookies();
  store.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 16,
  });
}

export async function clearTeamCookie() {
  const store = await cookies();
  store.delete(TEAM_COOKIE);
}

export async function clearAdminCookie() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}

export async function getTeamFromCookies(): Promise<TeamTokenPayload | null> {
  const store = await cookies();
  const token = store.get(TEAM_COOKIE)?.value;
  if (!token) return null;
  return verifyTeamToken(token);
}

export async function getIsAdminFromCookies(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  return verifyAdminToken(token);
}
