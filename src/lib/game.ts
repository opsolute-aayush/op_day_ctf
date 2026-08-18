import { prisma } from "@/lib/prisma";
import { parseIntArray, parseMembers, isMemberActive } from "@/lib/json";
import { withKeyLock } from "@/lib/mutex";
import { getActiveSabotage } from "@/lib/sabotage";

export async function getSessionById(sessionId: string) {
  return prisma.gameSession.findUnique({ where: { id: sessionId } });
}

export async function getSessionByCode(code: string) {
  return prisma.gameSession.findUnique({ where: { code } });
}

export interface ConnectedPlayer {
  name: string;
  teamId: string;
  teamNumber: number;
  teamName: string;
  color: string;
}

// Shared by the admin overview panel and the player-facing one on /play —
// both just show whoever is active right now, scoped to one session.
export async function getConnectedPlayers(sessionId: string): Promise<ConnectedPlayer[]> {
  const teams = await prisma.team.findMany({
    where: { sessionId },
    orderBy: { teamNumber: "asc" },
    select: { id: true, teamNumber: true, name: true, color: true, members: true },
  });

  const now = Date.now();
  return teams.flatMap((team) =>
    parseMembers(team.members)
      .filter((m) => isMemberActive(m.lastSeenAt, now))
      .map((m) => ({ name: m.name, teamId: team.id, teamNumber: team.teamNumber, teamName: team.name, color: team.color }))
  );
}

// Refreshes one member's lastSeenAt — called on every /api/team/status poll
// (3-5s intervals from /play, /final, /winner), which doubles as a presence
// heartbeat with no extra network traffic. A no-op if the member isn't found
// (e.g. rosters were cleared by an admin End Game/Reset since this browser
// last joined).
export async function touchMemberPresence(teamId: string, memberName: string): Promise<void> {
  await withKeyLock(`team-members:${teamId}`, async () => {
    const team = await prisma.team.findUnique({ where: { id: teamId }, select: { members: true } });
    if (!team) return;

    const members = parseMembers(team.members);
    const match = members.find((m) => m.name === memberName);
    if (!match) return;

    match.lastSeenAt = new Date().toISOString();
    await prisma.team.update({ where: { id: teamId }, data: { members: JSON.stringify(members) } });
  });
}

// Called on Leave Team so the register page's live roster stops showing
// someone who's actually gone, instead of just leaving them there until
// their presence heartbeat times out.
export async function removeMemberPresence(teamId: string, memberName: string): Promise<void> {
  await withKeyLock(`team-members:${teamId}`, async () => {
    const team = await prisma.team.findUnique({ where: { id: teamId }, select: { members: true } });
    if (!team) return;

    const members = parseMembers(team.members).filter((m) => m.name !== memberName);
    await prisma.team.update({ where: { id: teamId }, data: { members: JSON.stringify(members) } });
  });
}

export async function getTotalLevels(teamId: string): Promise<number> {
  const count = await prisma.levelConfig.count({ where: { teamId } });
  return count + 1; // + implicit final sentence-assembly level
}

export async function logActivity(
  sessionId: string,
  teamId: string | null,
  eventType: string,
  details?: Record<string, unknown>
) {
  await prisma.activityLog.create({
    data: {
      sessionId,
      teamId: teamId ?? undefined,
      eventType,
      details: details ? JSON.stringify(details) : undefined,
    },
  });
}

/** Client-safe team status — only unlocked levels' clues/words are included. */
export async function buildTeamStatus(teamId: string) {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) return null;

  const [progress, totalLevels, levelConfigs, session, activeSabotage] = await Promise.all([
    prisma.teamProgress.findUnique({ where: { teamId } }),
    getTotalLevels(teamId),
    prisma.levelConfig.findMany({ where: { teamId }, orderBy: { levelNumber: "asc" } }),
    prisma.gameSession.findUnique({ where: { id: team.sessionId } }),
    getActiveSabotage(teamId),
  ]);

  if (!progress || !session) return null;

  const unlockedLevels = parseIntArray(progress.unlockedLevels);
  const verifiedWordLevels = parseIntArray(progress.verifiedWordLevels);

  // wordReward is only included once the team has confirmed it via
  // verify-word — a correct password alone never leaks the word text.
  const unlockedClues = levelConfigs
    .filter((lc) => unlockedLevels.includes(lc.levelNumber))
    .map((lc) => ({
      levelNumber: lc.levelNumber,
      locationClue: lc.locationClue,
      wordReward: verifiedWordLevels.includes(lc.levelNumber) ? lc.wordReward : undefined,
      hint: lc.hint ?? undefined,
    }));

  const collectedWords = levelConfigs
    .filter((lc) => verifiedWordLevels.includes(lc.levelNumber))
    .sort((a, b) => a.levelNumber - b.levelNumber)
    .map((lc) => lc.wordReward);

  const finalUnlocked = progress.currentLevel >= totalLevels;

  const currentLevelConfig = levelConfigs.find((lc) => lc.levelNumber === progress.currentLevel);

  const activeHint =
    progress.hintReleasedLevel !== null && progress.hintReleasedLevel === progress.currentLevel
      ? currentLevelConfig?.hint ?? null
      : null;

  // Whether a hint *exists* for the current level (without revealing it) —
  // lets the client only show the "Ask for a Hint" button when it would
  // actually do something.
  const hintAvailable = Boolean(currentLevelConfig?.hint) && !finalUnlocked;

  // Computed server-side (not just "cooldown seconds - client clock guess")
  // so the countdown the player sees can't drift from clock skew or from
  // sitting on the page a while before this status was fetched.
  let sabotageCooldownRemainingMs = 0;
  if (session.sabotageCooldownSeconds > 0 && progress.lastSabotageAt) {
    const remaining = progress.lastSabotageAt.getTime() + session.sabotageCooldownSeconds * 1000 - Date.now();
    sabotageCooldownRemainingMs = Math.max(0, remaining);
  }

  return {
    team: {
      id: team.id,
      teamNumber: team.teamNumber,
      name: team.name,
      color: team.color,
      members: parseMembers(team.members).map((m) => m.name),
    },
    gameActive: session.isActive,
    gameFinished: session.isFinished,
    isFirstToFinish: session.winningTeamId === team.id,
    totalLevels,
    currentLevel: progress.currentLevel,
    unlockedLevels,
    collectedWords,
    unlockedClues,
    finalUnlocked,
    activeHint,
    hintAvailable,
    helpCreditsRemaining: progress.helpCreditsRemaining,
    sabotageCreditsRemaining: progress.sabotageCreditsRemaining,
    sabotageCooldownRemainingMs,
    activeSabotage,
    completed: progress.completed,
    completedAt: progress.completedAt,
    gameStartedAt: session.startedAt,
  };
}
