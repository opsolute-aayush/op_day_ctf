import { cookies } from "next/headers";
import {
  TEAM_COOKIE,
  ADMIN_COOKIE,
  signTeamToken,
  signAdminToken,
  verifyTeamToken,
  verifyAdminToken,
  type TeamTokenPayload,
  type AdminSession,
} from "@/lib/jwt";

export { TEAM_COOKIE, ADMIN_COOKIE, signTeamToken, signAdminToken, verifyTeamToken, verifyAdminToken };

// This runs on venue wifi over plain http:// (see docker/docker-compose.yml)
// — there's no TLS cert for a LAN IP or a local-only domain, so a `Secure`
// cookie would just get silently dropped by every player's phone. They'd
// still show as joined server-side, but every following request would come
// back 401 and bounce them straight back to /register, which looks exactly
// like the join never worked.
export async function setTeamCookie(token: string) {
  const store = await cookies();
  store.set(TEAM_COOKIE, token, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 16,
  });
}

export async function setAdminCookie(token: string) {
  const store = await cookies();
  store.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: false,
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

/** Returns the session the admin cookie is authenticated against, or null. */
export async function getAdminSessionFromCookies(): Promise<AdminSession | null> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}
