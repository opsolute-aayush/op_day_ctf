import { prisma } from "@/lib/prisma";
import { parseMembers } from "@/lib/json";

// "In use" is deliberately the same roster-based signal getConnectedPlayers
// uses (see lib/game.ts) OR the game being active, not admin activity alone.
// A session nobody ever joins, or that everyone has left with the game not
// running, starts its idle clock. Once it's been idle this long, it gets
// hard-deleted, freeing its 6-digit code back up for generateUniqueSessionCode
// (adminAuth.ts) and closing the window a forgotten code stays valid.
const DEFAULT_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
export const SESSION_IDLE_TIMEOUT_MS = process.env.SESSION_IDLE_TIMEOUT_MS
  ? Number(process.env.SESSION_IDLE_TIMEOUT_MS)
  : DEFAULT_IDLE_TIMEOUT_MS;

export const SWEEP_INTERVAL_MS = 5 * 60 * 1000;

// Per-process, in-memory only. A restart gives any currently-idle session a
// fresh grace window before the next sweep catches it again. Acceptable: a
// benign hygiene delay, not a security regression.
const idleSince = new Map<string, number>();

export async function sweepIdleSessions(now = Date.now()): Promise<void> {
  const sessions = await prisma.gameSession.findMany({
    select: { id: true, code: true, isActive: true, teams: { select: { members: true } } },
  });

  const seenIds = new Set(sessions.map((s) => s.id));
  for (const id of idleSince.keys()) {
    if (!seenIds.has(id)) idleSince.delete(id);
  }

  for (const session of sessions) {
    const hasAnyMember = session.teams.some((t) => parseMembers(t.members).length > 0);
    const inUse = hasAnyMember || session.isActive;

    if (inUse) {
      idleSince.delete(session.id);
      continue;
    }

    const since = idleSince.get(session.id);
    if (since === undefined) {
      idleSince.set(session.id, now);
      continue;
    }

    if (now - since >= SESSION_IDLE_TIMEOUT_MS) {
      await prisma.gameSession.delete({ where: { id: session.id } });
      idleSince.delete(session.id);
      console.log(
        `[session-lifecycle] Deleted idle session ${session.code} (unused for ${Math.round((now - since) / 60000)}m)`
      );
    }
  }
}

const globalForSweep = globalThis as unknown as { __sessionSweepStarted?: boolean };

/** Idempotent: safe to call multiple times (e.g. dev hot-reload); only ever starts one interval. */
export function startSessionLifecycleSweep(): void {
  if (globalForSweep.__sessionSweepStarted) return;
  globalForSweep.__sessionSweepStarted = true;

  setInterval(() => {
    sweepIdleSessions().catch((err) => console.error("[session-lifecycle] Sweep failed:", err));
  }, SWEEP_INTERVAL_MS);
}
