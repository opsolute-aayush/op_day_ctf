"use client";

// Which public/arts/settings/ image this device was randomly assigned.
// Picked once and persisted, so the same user keeps seeing the same
// character-art render across visits instead of it changing on them.
// Different users (different devices) still land on different images.

const STORAGE_KEY = "opday:assigned-art";

export function getAssignedArtFile(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAssignedArtFile(file: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, file);
  } catch {
    // localStorage unavailable. Falls back to a fresh random pick next load.
  }
}
