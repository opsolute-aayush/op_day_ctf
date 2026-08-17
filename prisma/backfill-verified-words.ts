import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function parseIntArray(json: string): number[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n === "number") : [];
  } catch {
    return [];
  }
}

// One-time repair for teams that progressed past a level before the
// word-verification gate existed (currentLevel used to advance on password
// alone). Any level below currentLevel was already physically passed, so
// it's safe to mark it verified retroactively. Only adds, never removes.
async function main() {
  const allProgress = await prisma.teamProgress.findMany({ include: { team: true } });
  let patchedTeams = 0;

  for (const progress of allProgress) {
    const levelConfigs = await prisma.levelConfig.findMany({
      where: { teamId: progress.teamId },
      select: { levelNumber: true },
    });
    const validLevelNumbers = new Set(levelConfigs.map((lc) => lc.levelNumber));

    const verifiedWordLevels = parseIntArray(progress.verifiedWordLevels);
    const verifiedSet = new Set(verifiedWordLevels);

    let changed = false;
    for (const levelNumber of validLevelNumbers) {
      if (levelNumber < progress.currentLevel && !verifiedSet.has(levelNumber)) {
        verifiedSet.add(levelNumber);
        changed = true;
      }
    }

    if (changed) {
      const updated = Array.from(verifiedSet).sort((a, b) => a - b);
      await prisma.teamProgress.update({
        where: { teamId: progress.teamId },
        data: { verifiedWordLevels: JSON.stringify(updated) },
      });
      patchedTeams += 1;
      console.log(`Backfilled ${progress.team.name} (team #${progress.team.teamNumber}): verifiedWordLevels -> [${updated.join(", ")}]`);
    }
  }

  console.log(`Done. Patched ${patchedTeams} of ${allProgress.length} team(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
