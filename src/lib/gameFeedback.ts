"use client";

// Centralizes exactly which sound/video fires for which game moment, so the
// rule lives in one place instead of being repeated at every call site:
// - Right (password or word correct): sound OR video, chosen at random,
//   never both at once.
// - Wrong password: video only, no sound. Wrong word: sound only.
// - Sabotage decode denied: video only, no sound. Distinct from a wrong
//   level password.
// - Help revealed: sound only (random pick, same as always).
// - Win: sound + video, then outro music ~7s later.
// - Sabotage/swap cleared (player decode, or admin bypass/revert): resolve sound only.

import {
  playRightPasswordSound,
  playRandomWrongPasswordSound,
  playHelpSound,
  playOutroMusic,
  playHackingSound,
  playAlertSound,
  playResolveSound,
  playWinningSound,
} from "@/lib/sfx";
import { playVideoClip } from "@/lib/videofx";

export function playRightFeedback() {
  if (Math.random() < 0.5) {
    playRightPasswordSound();
  } else {
    playVideoClip("right_pass");
  }
}

export function playWrongPasswordFeedback() {
  void playVideoClip("wrong_pass");
}

export function playWrongWordFeedback() {
  playRandomWrongPasswordSound();
}

/** A sabotage decode attempt came back wrong: video only, no sound. */
export function playSabotageDeniedFeedback() {
  void playVideoClip("wrong_pass");
}

export function playHelpFeedback() {
  playHelpSound();
}

/** The team that just launched a sabotage or executed a swap. */
export function playHackingFeedback() {
  playHackingSound();
}

/** The team that just got sabotaged, or whose board just got swapped by someone else. */
export function playAlertFeedback() {
  playAlertSound();
}

/** A sabotage just cleared, decoded by the team itself, or force-cleared/reverted by an admin. */
export function playResolveFeedback() {
  playResolveSound();
}

// Module-level, not a component ref. React 18/19 Strict Mode double-invokes
// effects in dev (mount → cleanup → mount). A timer stored in a ref gets
// cancelled by the simulated cleanup before the real mount can use it, so
// the outro would silently never play. A plain module flag has no lifecycle
// to race against.
let outroScheduled = false;

/** Fires the winning sound + video immediately, then the outro track ~7s later (once per page load). */
export function playWinFeedback(): void {
  playWinningSound();
  void playVideoClip("winning");
  if (outroScheduled) return;
  outroScheduled = true;
  setTimeout(() => playOutroMusic(), 7000);
}
