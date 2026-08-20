"use client";

import { useEffect } from "react";
import { playButtonClickSound } from "@/lib/sfx";

/**
 * Plays a generic click blip, but only for clicks that actually move you to a
 * new screen: a next/link anchor, or a button explicitly marked
 * `data-sfx-nav` (e.g. "Continue", "Join Squad"). Typing into a field,
 * dragging a slider, flipping a toggle, or any other in-place adjustment
 * stays silent. `data-sfx-exempt` still wins even over a nav match, for
 * buttons with their own dedicated sound/video (see gameFeedback.ts).
 */
export default function ClickSound() {
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest("[data-sfx-exempt]")) return;
      if (!target.closest("a[href], [data-sfx-nav]")) return;
      playButtonClickSound();
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return null;
}
