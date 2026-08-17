import { prisma } from "@/lib/prisma";
import { parseIntArray } from "@/lib/json";

export async function getGameConfig() {
  const config = await prisma.gameConfig.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
  return config;
}

export async function getTotalLevels(teamId: string): Promise<number> {
  const count = await prisma.levelConfig.count({ where: { teamId } });
  return count + 1; // + implicit final sentence-assembly level
}

export async function logActivity(
  teamId: string | null,
  eventType: string,
  details?: Record<string, unknown>
) {
  await prisma.activityLog.create({
    data: {
      teamId: teamId ?? undefined,
      eventType,
      details: details ? JSON.stringify(details) : undefined,
    },
  });
}

/**
 * Builds the client-safe view of a team's progress: only clues/words for
 * levels the team has actually unlocked are ever included in the payload.
 * Every team has its own independent set of levels and its own final
 * sentence, so all lookups here are scoped to this team only.
 */
export async function buildTeamStatus(teamId: string) {
  const [team, progress, totalLevels, levelConfigs, config] = await Promise.all([
    prisma.team.findUnique({ where: { id: teamId } }),
    prisma.teamProgress.findUnique({ where: { teamId } }),
    getTotalLevels(teamId),
    prisma.levelConfig.findMany({ where: { teamId }, orderBy: { levelNumber: "asc" } }),
    getGameConfig(),
  ]);

  if (!team || !progress) return null;

  const unlockedLevels = parseIntArray(progress.unlockedLevels);
  const verifiedWordLevels = parseIntArray(progress.verifiedWordLevels);

  // The word reward is only ever revealed to the client once the team has
  // typed in and confirmed the actual word they found at the location — a
  // correct password alone unlocks the level's clue, but never leaks the
  // word text itself.
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
    gameActive: config.isActive,
    gameFinished: config.isFinished,
    isFirstToFinish: config.winningTeamId === team.id,
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
    gameStartedAt: config.startedAt,
  };
}
