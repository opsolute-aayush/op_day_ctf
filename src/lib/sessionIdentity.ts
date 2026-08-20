"use client";

// The last session code this device joined. Lets /register auto-resume
// straight to the squad list after Leave Team, instead of asking for the
// code again. Cleared explicitly when the player chooses "Change code".

const STORAGE_KEY = "opday:session-code";
const EVENT = "opday:session-code-changed";

export function getSavedSessionCode(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setSavedSessionCode(code: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, code);
    window.dispatchEvent(new CustomEvent<string>(EVENT, { detail: code }));
  } catch {
    // localStorage unavailable, so it just won't auto-resume next time.
  }
}

export function clearSavedSessionCode(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent<string>(EVENT, { detail: "" }));
  } catch {
    // ignore
  }
}

/** Subscribe form expected by useSyncExternalStore: no value needed, just re-read getSavedSessionCode(). */
export function subscribeToSessionCodeStore(callback: () => void): () => void {
  window.addEventListener(EVENT, callback);
  return () => window.removeEventListener(EVENT, callback);
}
