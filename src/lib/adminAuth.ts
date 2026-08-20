import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// Each session has its own admin password, generated at creation time and
// returned once in the API response. It's never stored or shown in plaintext again.

function generateRandomPassword(): string {
  return crypto.randomBytes(6).toString("hex");
}

function generateSixDigitCode(): string {
  // Always exactly 6 digits, including a possible leading zero. "042817" is
  // a valid code, just as easy to read off a screen as any other.
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
}

async function generateUniqueSessionCode(): Promise<string> {
  for (let attempt = 0; attempt < 25; attempt++) {
    const code = generateSixDigitCode();
    const existing = await prisma.gameSession.findUnique({ where: { code } });
    if (!existing) return code;
  }
  throw new Error("Could not generate a unique session code. Try again.");
}

/** Creates a brand-new session with its own 6-digit code and admin password. */
export async function createSession(): Promise<{ sessionId: string; code: string; password: string }> {
  const code = await generateUniqueSessionCode();
  const password = generateRandomPassword();
  const hash = await bcrypt.hash(password, 10);
  const session = await prisma.gameSession.create({ data: { code, adminPasswordHash: hash } });
  return { sessionId: session.id, code: session.code, password };
}

/** Verifies a master's {code, password} pair and returns the matching sessionId. */
export async function verifySessionLogin(code: string, password: string): Promise<string | null> {
  const session = await prisma.gameSession.findUnique({ where: { code } });
  if (!session || !session.adminPasswordHash) return null;
  const valid = await bcrypt.compare(password, session.adminPasswordHash);
  return valid ? session.id : null;
}

export async function setSessionAdminPassword(sessionId: string, newPassword: string): Promise<void> {
  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.gameSession.update({ where: { id: sessionId }, data: { adminPasswordHash: hash } });
}
