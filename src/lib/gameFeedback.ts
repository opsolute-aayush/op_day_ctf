"use client";

// Centralizes exactly which sound/video fires for which game moment, so the
// rule lives in one place instead of being repeated at every call site:
// - Right (password or word correct): sound OR video, chosen at random —
//   never both at once.
// - Wrong password: video only. Wrong word: sound only.
// - Help revealed: sound only (random pick, same as always).
// - Win: video only, then outro music ~7s later.

import { playRightPasswordSound, playRandomWrongPasswordSound, playHelpSound, playOutroMusic } from "@/lib/sfx";
import { playVideoClip } from "@/lib/videofx";

export function playRightFeedback() {
  if (Math.random() < 0.5) {
    playRightPasswordSound();
  } else {
    playVideoClip("right_pass");
  }
}

export function playWrongPasswordFeedback() {
  playVideoClip("wrong_pass");
}

export function playWrongWordFeedback() {
  playRandomWrongPasswordSound();
}

export function playHelpFeedback() {
  playHelpSound();
}

/** Fires the winning video immediately; caller owns the returned timer (clear it on unmount). */
export function playWinFeedback(): ReturnType<typeof setTimeout> {
  playVideoClip("winning");
  return setTimeout(() => playOutroMusic(), 7000);
}
