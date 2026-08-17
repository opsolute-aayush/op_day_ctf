import jwt from "jsonwebtoken";

const envSecret = process.env.JWT_SECRET;
if (!envSecret) {
  throw new Error("JWT_SECRET is not set. Copy .env.example to .env and configure it.");
}
const JWT_SECRET: string = envSecret;

export const TEAM_COOKIE = "opday_team_session";
export const ADMIN_COOKIE = "opday_admin_session";

export interface TeamTokenPayload {
  teamId: string;
  teamName: string;
  sessionId: string;
  memberName: string;
}

export interface AdminSession {
  sessionId: string;
}

interface AdminTokenPayload extends AdminSession {
  role: "admin";
}

export function signTeamToken(payload: TeamTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "16h" });
}

export function signAdminToken(sessionId: string): string {
  const payload: AdminTokenPayload = { role: "admin", sessionId };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "16h" });
}

export function verifyTeamToken(token: string): TeamTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (typeof decoded === "object" && decoded && "teamId" in decoded && "sessionId" in decoded) {
      return decoded as unknown as TeamTokenPayload;
    }
    return null;
  } catch {
    return null;
  }
}

export function verifyAdminToken(token: string): AdminSession | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (
      typeof decoded === "object" &&
      decoded !== null &&
      (decoded as { role?: string }).role === "admin" &&
      typeof (decoded as { sessionId?: unknown }).sessionId === "string"
    ) {
      return { sessionId: (decoded as unknown as AdminTokenPayload).sessionId };
    }
    return null;
  } catch {
    return null;
  }
}
