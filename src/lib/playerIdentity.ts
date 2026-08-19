"use client";

// The player's own display name, captured once at /register (alongside the
// session code) and reused everywhere afterward — the join form, and the
// prefill for renaming later in Settings — instead of asking for it again
// at every step. Persisted per-device, same pattern as settings.ts.

const STORAGE_KEY = "opday:player-name";
const EVENT = "opday:player-name-changed";

export function getPlayerName(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setPlayerName(name: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, name);
    window.dispatchEvent(new CustomEvent<string>(EVENT, { detail: name }));
  } catch {
    // localStorage unavailable (private browsing, etc.) — name just won't persist across reloads.
  }
}

/** Subscribe form expected by useSyncExternalStore — no value needed, just re-read getPlayerName(). */
export function subscribeToPlayerNameStore(callback: () => void): () => void {
  window.addEventListener(EVENT, callback);
  return () => window.removeEventListener(EVENT, callback);
}
