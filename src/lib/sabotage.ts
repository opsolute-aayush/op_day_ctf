import { prisma } from "@/lib/prisma";

// Inlined rather than imported from lib/game.ts (which imports this module
// for getActiveSabotage) to avoid a circular import between the two.
async function logActivity(sessionId: string, teamId: string | null, eventType: string, details?: Record<string, unknown>) {
  await prisma.activityLog.create({
    data: { sessionId, teamId: teamId ?? undefined, eventType, details: details ? JSON.stringify(details) : undefined },
  });
}

// A short word bank, not gibberish. The point is a quick, satisfying
// "aha, it says X" decode, not a cryptography puzzle.
const CHALLENGE_WORDS = [
  "FIREWALL",
  "OVERRIDE",
  "BLACKOUT",
  "PAYLOAD",
  "INTRUDER",
  "DECRYPT",
  "SANDBOX",
  "ROOTKIT",
  "BACKDOOR",
  "GLITCH",
  "MALWARE",
  "SIGNAL",
];

function randomPlainText(): string {
  return CHALLENGE_WORDS[Math.floor(Math.random() * CHALLENGE_WORDS.length)];
}

function encode(plainText: string): { encoding: "base64" | "hex"; cipherText: string } {
  const encoding = Math.random() < 0.5 ? "base64" : "hex";
  const cipherText =
    encoding === "base64" ? Buffer.from(plainText, "utf8").toString("base64") : Buffer.from(plainText, "utf8").toString("hex");
  return { encoding, cipherText };
}

export interface ActiveSabotage {
  id: string;
  cipherText: string;
  encoding: string;
  sourceTeamName: string;
  createdAt: string;
}

/** The one unresolved sabotage against this team, if any. Safe to send to the target (no plainText). */
export async function getActiveSabotage(teamId: string): Promise<ActiveSabotage | null> {
  const row = await prisma.sabotage.findFirst({
    where: { targetTeamId: teamId, resolvedAt: null },
    orderBy: { createdAt: "asc" },
    include: { sourceTeam: { select: { name: true } } },
  });
  if (!row) return null;
  return {
    id: row.id,
    cipherText: row.cipherText,
    encoding: row.encoding,
    sourceTeamName: row.sourceTeam.name,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function launchSabotage(params: {
  sessionId: string;
  sourceTeamId: string;
  targetTeamId: string;
}): Promise<{ error: string } | { ok: true }> {
  const { sessionId, sourceTeamId, targetTeamId } = params;

  if (sourceTeamId === targetTeamId) {
    return { error: "You can't sabotage your own squad." };
  }

  const [source, target, existing, session] = await Promise.all([
    prisma.teamProgress.findUnique({ where: { teamId: sourceTeamId } }),
    prisma.team.findUnique({ where: { id: targetTeamId }, select: { id: true, sessionId: true } }),
    prisma.sabotage.findFirst({ where: { targetTeamId, resolvedAt: null } }),
    prisma.gameSession.findUnique({ where: { id: sessionId }, select: { sabotageCooldownSeconds: true } }),
  ]);

  if (!target || target.sessionId !== sessionId) {
    return { error: "That squad doesn't exist." };
  }
  if (!source) {
    return { error: "Team not found." };
  }
  if (source.sabotageCreditsRemaining <= 0) {
    return { error: "You're out of sabotages for this hunt." };
  }
  if (existing) {
    return { error: "That squad is already dealing with a sabotage." };
  }
  const cooldownSeconds = session?.sabotageCooldownSeconds ?? 0;
  if (cooldownSeconds > 0 && source.lastSabotageAt) {
    const remainingMs = source.lastSabotageAt.getTime() + cooldownSeconds * 1000 - Date.now();
    if (remainingMs > 0) {
      return { error: `Sabotage systems recharging: ${Math.ceil(remainingMs / 1000)}s left.` };
    }
  }

  const plainText = randomPlainText();
  const { encoding, cipherText } = encode(plainText);

  await prisma.$transaction([
    prisma.sabotage.create({
      data: { sessionId, sourceTeamId, targetTeamId, encoding, cipherText, plainText },
    }),
    prisma.teamProgress.update({
      where: { teamId: sourceTeamId },
      data: { sabotageCreditsRemaining: { decrement: 1 }, lastSabotageAt: new Date() },
    }),
  ]);

  await logActivity(sessionId, sourceTeamId, "SABOTAGE_LAUNCHED", { targetTeamId });
  return { ok: true };
}

export async function resolveSabotage(params: {
  teamId: string;
  sabotageId: string;
  answer: string;
}): Promise<{ error: string } | { ok: true }> {
  const { teamId, sabotageId, answer } = params;

  const row = await prisma.sabotage.findUnique({ where: { id: sabotageId } });
  if (!row || row.targetTeamId !== teamId) {
    return { error: "That sabotage isn't yours to clear." };
  }
  if (row.resolvedAt) {
    return { ok: true };
  }
  if (answer.trim().toUpperCase() !== row.plainText.toUpperCase()) {
    return { error: "Incorrect. Keep decoding." };
  }

  await prisma.sabotage.update({ where: { id: sabotageId }, data: { resolvedAt: new Date() } });
  await logActivity(row.sessionId, teamId, "SABOTAGE_CLEARED", { sabotageId });
  return { ok: true };
}
