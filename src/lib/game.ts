import { prisma } from "@/lib/prisma";
import { parseIntArray } from "@/lib/json";

export async function getSessionById(sessionId: string) {
  return prisma.gameSession.findUnique({ where: { id: sessionId } });
}

export async function getSessionByCode(code: string) {
  return prisma.gameSession.findUnique({ where: { code } });
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

  const [progress, totalLevels, levelConfigs, session] = await Promise.all([
    prisma.teamProgress.findUnique({ where: { teamId } }),
    getTotalLevels(teamId),
    prisma.levelConfig.findMany({ where: { teamId }, orderBy: { levelNumber: "asc" } }),
    prisma.gameSession.findUnique({ where: { id: team.sessionId } }),
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

  return {
    team: {
      id: team.id,
      teamNumber: team.teamNumber,
      name: team.name,
      color: team.color,
      members: JSON.parse(team.members) as string[],
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
    completed: progress.completed,
    completedAt: progress.completedAt,
    gameStartedAt: session.startedAt,
  };
}
