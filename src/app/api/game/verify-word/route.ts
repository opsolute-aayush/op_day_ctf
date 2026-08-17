import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getTeamFromCookies } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { normalizeWord } from "@/lib/normalize";
import { parseIntArray } from "@/lib/json";
import { getGameConfig, logActivity, buildTeamStatus } from "@/lib/game";

const schema = z.object({
  levelNumber: z.number().int().positive(),
  word: z.string().trim().min(1).max(200),
});

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 60_000;

// A correct password only unlocks a level's clue — the physical word itself
// has to be typed in here and confirmed before it counts toward the final
// sentence. This proves the team actually found the card, not just guessed
// or brute-forced the password.
export async function POST(req: NextRequest) {
  const teamAuth = await getTeamFromCookies();
  if (!teamAuth) {
    return NextResponse.json({ error: "Not registered" }, { status: 401 });
  }

  const rate = checkRateLimit(`word:${teamAuth.teamId}`, MAX_ATTEMPTS, WINDOW_MS);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${Math.ceil(rate.retryAfterMs / 1000)}s.` },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter the word you found." }, { status: 400 });
  }

  const config = await getGameConfig();
  if (config.isFinished) {
    return NextResponse.json({ error: "The hunt has ended." }, { status: 403 });
  }
  if (!config.isActive) {
    return NextResponse.json({ error: "The game is not currently active." }, { status: 403 });
  }

  const progress = await prisma.teamProgress.findUnique({ where: { teamId: teamAuth.teamId } });
  if (!progress) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const { levelNumber } = parsed.data;
  const unlockedLevels = parseIntArray(progress.unlockedLevels);
  if (!unlockedLevels.includes(levelNumber)) {
    return NextResponse.json({ error: "Unlock this level with its password first." }, { status: 400 });
  }

  const verifiedWordLevels = parseIntArray(progress.verifiedWordLevels);
  if (verifiedWordLevels.includes(levelNumber)) {
    // Already confirmed — idempotent no-op instead of an error.
    const status = await buildTeamStatus(teamAuth.teamId);
    return NextResponse.json({ status, alreadyVerified: true });
  }

  const levelConfig = await prisma.levelConfig.findUnique({
    where: { teamId_levelNumber: { teamId: teamAuth.teamId, levelNumber } },
  });
  if (!levelConfig) {
    return NextResponse.json({ error: "This level isn't configured." }, { status: 400 });
  }

  const isMatch = normalizeWord(parsed.data.word) === normalizeWord(levelConfig.wordReward);

  if (!isMatch) {
    await logActivity(teamAuth.teamId, "WRONG_WORD", { levelNumber, submitted: parsed.data.word });
    return NextResponse.json(
      { error: "Wrong word — check what you found at the location." },
      { status: 401 }
    );
  }

  verifiedWordLevels.push(levelNumber);
  // This is the only thing that actually advances currentLevel — a correct
  // password unlocks the clue, but the team stays "on" this level until the
  // word is confirmed, so they can never skip ahead to the next level's
  // password without having verified this one's word first.
  await prisma.teamProgress.update({
    where: { teamId: teamAuth.teamId },
    data: {
      verifiedWordLevels: JSON.stringify(verifiedWordLevels),
      currentLevel: Math.max(progress.currentLevel, levelNumber + 1),
    },
  });

  await logActivity(teamAuth.teamId, "WORD_VERIFIED", { levelNumber, word: levelConfig.wordReward });

  const status = await buildTeamStatus(teamAuth.teamId);
  return NextResponse.json({ status });
}
