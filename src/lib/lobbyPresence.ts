// Tracks devices that have entered a session code and are sitting on the
// "Select Your Squad" screen but haven't joined a team yet. This lets the
// admin (and other players) see them show up the moment they join the
// session, not only once they pick a squad. Per-process, in-memory only:
// this is ephemeral lobby chatter, not something worth persisting to the
// DB or surviving a restart. A device drops off ~15s after its last
// heartbeat (matches lib/json.ts's ACTIVE_WINDOW_MS), using the same
// lazy-cleanup-on-read style as lib/sessionLifecycle.ts's idle sweep.

const LOBBY_TTL_MS = 15_000;

interface LobbyEntry {
  name: string;
  lastSeenAt: number;
}

const globalForLobby = globalThis as unknown as { __lobbyPresence?: Map<string, Map<string, LobbyEntry>> };
const lobby = globalForLobby.__lobbyPresence ?? new Map<string, Map<string, LobbyEntry>>();
globalForLobby.__lobbyPresence = lobby;

export function touchLobbyPresence(sessionId: string, deviceId: string, name: string): void {
  let sessionMap = lobby.get(sessionId);
  if (!sessionMap) {
    sessionMap = new Map();
    lobby.set(sessionId, sessionMap);
  }
  sessionMap.set(deviceId, { name, lastSeenAt: Date.now() });
}

/** Everyone in this session's lobby whose last heartbeat is still within the TTL. */
export function getLobbyPresence(sessionId: string): { name: string }[] {
  const sessionMap = lobby.get(sessionId);
  if (!sessionMap) return [];

  const now = Date.now();
  const result: { name: string }[] = [];
  for (const [deviceId, entry] of sessionMap) {
    if (now - entry.lastSeenAt > LOBBY_TTL_MS) {
      sessionMap.delete(deviceId);
      continue;
    }
    result.push({ name: entry.name });
  }
  return result;
}
