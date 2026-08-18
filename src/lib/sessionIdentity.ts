"use client";

// The last session code this device joined — lets /register auto-resume
// straight to the squad list after Leave Team, instead of asking for the
// code again. Cleared explicitly when the player chooses "Change code".

const STORAGE_KEY = "opday:session-code";

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
  } catch {
    // localStorage unavailable — just won't auto-resume next time.
  }
}

export function clearSavedSessionCode(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
