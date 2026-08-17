import { prisma } from "@/lib/prisma";
import { parseIntArray, parseStringArray } from "@/lib/json";

export async function getGameConfig() {
  const config = await prisma.gameConfig.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, winningSentence: "" },
  });
  return config;
}

export async function getTotalLevels(): Promise<number> {
  const count = await prisma.levelConfig.count();
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
 */
export async function buildTeamStatus(teamId: string) {
  const [team, progress, totalLevels, levelConfigs, config] = await Promise.all([
    prisma.team.findUnique({ where: { id: teamId } }),
    prisma.teamProgress.findUnique({ where: { teamId } }),
    getTotalLevels(),
    prisma.levelConfig.findMany({ orderBy: { levelNumber: "asc" } }),
    getGameConfig(),
  ]);

  if (!team || !progress) return null;

  const unlockedLevels = parseIntArray(progress.unlockedLevels);
  const collectedWords = parseStringArray(progress.collectedWords);

  const unlockedClues = levelConfigs
    .filter((lc) => unlockedLevels.includes(lc.levelNumber))
    .map((lc) => ({
      levelNumber: lc.levelNumber,
      locationClue: lc.locationClue,
      wordReward: lc.wordReward,
      hint: lc.hint ?? undefined,
    }));

  const finalUnlocked = progress.currentLevel >= totalLevels;

  const activeHint =
    progress.hintReleasedLevel !== null && progress.hintReleasedLevel === progress.currentLevel
      ? levelConfigs.find((lc) => lc.levelNumber === progress.currentLevel)?.hint ?? null
      : null;

  return {
    team: { id: team.id, name: team.name, color: team.color, members: JSON.parse(team.members) as string[] },
    gameActive: config.isActive,
    gameFinished: config.isFinished,
    isWinner: config.winningTeamId === team.id,
    totalLevels,
    currentLevel: progress.currentLevel,
    unlockedLevels,
    collectedWords,
    unlockedClues,
    finalUnlocked,
    activeHint,
    completed: progress.completed,
    completedAt: progress.completedAt,
    gameStartedAt: config.startedAt,
  };
}
