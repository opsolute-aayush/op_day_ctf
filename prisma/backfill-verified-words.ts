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
// word-verification gate existed (currentLevel used to advance on a correct
// password alone). Those teams are stuck showing fewer words than expected
// in the final sentence-assembly screen, because collectedWords is now
// strictly derived from verifiedWordLevels. Any level strictly below a
// team's currentLevel was, by construction of the old and new unlock logic,
// a level the team already physically passed — so it's safe to mark its
// word as verified retroactively. This never removes anything, only adds.
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
