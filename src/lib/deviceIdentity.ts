"use client";

// A random id for this device/browser, generated once and persisted —
// lets the lobby-presence heartbeat (see lib/lobbyPresence.ts) tell one
// device's repeated pings apart from another's before either has a real
// team cookie to identify them by.

const STORAGE_KEY = "opday:device-id";

export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = window.localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}
