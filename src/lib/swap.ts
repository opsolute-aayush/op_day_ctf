import { prisma } from "@/lib/prisma";
import { withKeyLock } from "@/lib/mutex";

// Inlined rather than imported from lib/game.ts (which will import this
// module for getSwapStatusFlags) to avoid a circular import, same reasoning
// as lib/sabotage.ts.
async function logActivity(sessionId: string, teamId: string | null, eventType: string, details?: Record<string, unknown>) {
  await prisma.activityLog.create({
    data: { sessionId, teamId: teamId ?? undefined, eventType, details: details ? JSON.stringify(details) : undefined },
  });
}

interface ProgressFields {
  currentLevel: number;
  unlockedLevels: string;
  verifiedWordLevels: string;
  hintReleasedLevel: number | null;
  completed: boolean;
  completedAt: string | null; // ISO — null means not completed
}

interface LevelContent {
  levelNumber: number;
  password: string;
  locationClue: string;
  wordReward: string;
  hint: string | null;
}

// Everything captured before a swap so an admin revert can put it back
// exactly, whether or not the teams kept playing in the meantime.
interface TeamSnapshot {
  progress: ProgressFields;
  winningSentence: string;
  levels: LevelContent[];
}

function progressToFields(p: {
  currentLevel: number;
  unlockedLevels: string;
  verifiedWordLevels: string;
  hintReleasedLevel: number | null;
  completed: boolean;
  completedAt: Date | null;
}): ProgressFields {
  return {
    currentLevel: p.currentLevel,
    unlockedLevels: p.unlockedLevels,
    verifiedWordLevels: p.verifiedWordLevels,
    hintReleasedLevel: p.hintReleasedLevel,
    completed: p.completed,
    completedAt: p.completedAt ? p.completedAt.toISOString() : null,
  };
}

function progressUpdateData(p: ProgressFields) {
  return {
    currentLevel: p.currentLevel,
    unlockedLevels: p.unlockedLevels,
    verifiedWordLevels: p.verifiedWordLevels,
    hintReleasedLevel: p.hintReleasedLevel,
    completed: p.completed,
    completedAt: p.completedAt ? new Date(p.completedAt) : null,
  };
}

/** Whether this session has a swap card configured, and whether it's already been claimed. */
export async function getSwapStatusFlags(sessionId: string): Promise<{ swapCardEnabled: boolean; swapCardUsed: boolean }> {
  const [session, active] = await Promise.all([
    prisma.gameSession.findUnique({ where: { id: sessionId }, select: { swapCode: true } }),
    prisma.progressSwap.findFirst({ where: { sessionId, revertedAt: null }, select: { id: true } }),
  ]);
  return { swapCardEnabled: Boolean(session?.swapCode), swapCardUsed: Boolean(active) };
}

export async function verifySwapCode(sessionId: string, code: string): Promise<{ error: string } | { ok: true }> {
  const session = await prisma.gameSession.findUnique({ where: { id: sessionId }, select: { swapCode: true } });
  if (!session?.swapCode) {
    return { error: "No swap card is active this game." };
  }
  // Checked before the used-gate so a wrong guess never reveals whether the
  // real card has already been claimed.
  if (code.trim().toUpperCase() !== session.swapCode.toUpperCase()) {
    return { error: "Incorrect code." };
  }
  const active = await prisma.progressSwap.findFirst({ where: { sessionId, revertedAt: null } });
  if (active) {
    return { error: "The swap card has already been claimed this game." };
  }
  return { ok: true };
}

async function loadSnapshot(teamId: string): Promise<TeamSnapshot | null> {
  const [progress, team, levels] = await Promise.all([
    prisma.teamProgress.findUnique({ where: { teamId } }),
    prisma.team.findUnique({ where: { id: teamId }, select: { winningSentence: true } }),
    prisma.levelConfig.findMany({ where: { teamId }, orderBy: { levelNumber: "asc" } }),
  ]);
  if (!progress || !team) return null;
  return {
    progress: progressToFields(progress),
    winningSentence: team.winningSentence,
    levels: levels.map((l) => ({
      levelNumber: l.levelNumber,
      password: l.password,
      locationClue: l.locationClue,
      wordReward: l.wordReward,
      hint: l.hint,
    })),
  };
}

/**
 * Applies `incoming`'s board (level content + winning sentence) and progress
 * onto `teamId`. Callers must have already filtered `incoming.levels` down
 * to level numbers `teamId` actually still has a row for — teamId/levelNumber
 * themselves (the unique key) are never touched, only the content columns,
 * so a pre-filtered list can never collide with or 404 against another row.
 */
function applySnapshot(teamId: string, incoming: TeamSnapshot) {
  return [
    prisma.teamProgress.update({ where: { teamId }, data: progressUpdateData(incoming.progress) }),
    prisma.team.update({ where: { id: teamId }, data: { winningSentence: incoming.winningSentence } }),
    ...incoming.levels.map((level) =>
      prisma.levelConfig.update({
        where: { teamId_levelNumber: { teamId, levelNumber: level.levelNumber } },
        data: { password: level.password, locationClue: level.locationClue, wordReward: level.wordReward, hint: level.hint },
      })
    ),
  ];
}

async function existingLevelNumbers(teamId: string): Promise<Set<number>> {
  const rows = await prisma.levelConfig.findMany({ where: { teamId }, select: { levelNumber: true } });
  return new Set(rows.map((r) => r.levelNumber));
}

export async function executeSwap(params: {
  sessionId: string;
  initiatorTeamId: string;
  partnerTeamId: string;
  code: string;
}): Promise<{ error: string } | { ok: true }> {
  const { sessionId, initiatorTeamId, partnerTeamId, code } = params;

  if (initiatorTeamId === partnerTeamId) {
    return { error: "You can't swap with your own squad." };
  }

  // Serialized per session so two teams racing to redeem the same
  // single-use card can't both slip past the "already claimed" check.
  return withKeyLock(`progress-swap:${sessionId}`, async () => {
    const verified = await verifySwapCode(sessionId, code);
    if ("error" in verified) return verified;

    const partnerTeam = await prisma.team.findUnique({ where: { id: partnerTeamId }, select: { id: true, sessionId: true } });
    if (!partnerTeam || partnerTeam.sessionId !== sessionId) {
      return { error: "That squad doesn't exist." };
    }

    const [initiatorSnapshot, partnerSnapshot] = await Promise.all([
      loadSnapshot(initiatorTeamId),
      loadSnapshot(partnerTeamId),
    ]);
    if (!initiatorSnapshot || !partnerSnapshot) {
      return { error: "Team not found." };
    }

    // Only level numbers both teams actually have get their content traded —
    // see applySnapshot's comment. Level content only, matched by number:
    // each team keeps its own set of LevelConfig rows, just with the other
    // team's password/clue/word/hint written into them.
    const commonLevels = new Set(partnerSnapshot.levels.map((l) => l.levelNumber));
    const initiatorForPartner: TeamSnapshot = {
      ...initiatorSnapshot,
      levels: initiatorSnapshot.levels.filter((l) => commonLevels.has(l.levelNumber)),
    };
    const initiatorLevelNumbers = new Set(initiatorSnapshot.levels.map((l) => l.levelNumber));
    const partnerForInitiator: TeamSnapshot = {
      ...partnerSnapshot,
      levels: partnerSnapshot.levels.filter((l) => initiatorLevelNumbers.has(l.levelNumber)),
    };

    await prisma.$transaction([
      prisma.progressSwap.create({
        data: {
          sessionId,
          initiatorTeamId,
          partnerTeamId,
          initiatorSnapshot: JSON.stringify(initiatorSnapshot),
          partnerSnapshot: JSON.stringify(partnerSnapshot),
        },
      }),
      ...applySnapshot(initiatorTeamId, partnerForInitiator),
      ...applySnapshot(partnerTeamId, initiatorForPartner),
    ]);

    await logActivity(sessionId, initiatorTeamId, "SWAP_EXECUTED", { partnerTeamId });
    return { ok: true };
  });
}

/** Admin-only: force-restores both teams' board + progress to how it was right before this swap. */
export async function revertSwap(sessionId: string, swapId: string): Promise<{ error: string } | { ok: true }> {
  const row = await prisma.progressSwap.findUnique({ where: { id: swapId } });
  if (!row || row.sessionId !== sessionId) {
    return { error: "Swap not found." };
  }
  if (row.revertedAt) {
    return { ok: true };
  }

  const initiatorRestore: TeamSnapshot = JSON.parse(row.initiatorSnapshot);
  const partnerRestore: TeamSnapshot = JSON.parse(row.partnerSnapshot);

  // A level an admin deleted since this swap happened has nothing left to
  // restore content onto — filter those out rather than 404ing the whole revert.
  const [initiatorLevels, partnerLevels] = await Promise.all([
    existingLevelNumbers(row.initiatorTeamId),
    existingLevelNumbers(row.partnerTeamId),
  ]);
  initiatorRestore.levels = initiatorRestore.levels.filter((l) => initiatorLevels.has(l.levelNumber));
  partnerRestore.levels = partnerRestore.levels.filter((l) => partnerLevels.has(l.levelNumber));

  await prisma.$transaction([
    ...applySnapshot(row.initiatorTeamId, initiatorRestore),
    ...applySnapshot(row.partnerTeamId, partnerRestore),
    prisma.progressSwap.update({ where: { id: swapId }, data: { revertedAt: new Date() } }),
  ]);

  await logActivity(sessionId, row.initiatorTeamId, "SWAP_REVERTED", { swapId, partnerTeamId: row.partnerTeamId });
  return { ok: true };
}

// Called by Game Reset — restores every team's original board content before
// progress gets wiped, so "puzzles are untouched by reset" stays true even
// if a swap had mixed two teams' passwords/clues/words together.
export async function revertAllActiveSwaps(sessionId: string): Promise<void> {
  const active = await prisma.progressSwap.findMany({ where: { sessionId, revertedAt: null }, select: { id: true } });
  for (const { id } of active) {
    await revertSwap(sessionId, id);
  }
}
