"use client";

import { useEffect } from "react";
import { playButtonClickSound } from "@/lib/sfx";

/**
 * Plays a generic click blip for every click in the app — settings toggles,
 * navigation, tab switches, etc. Buttons that already have their own
 * dedicated sound/video (password submit, word-verify submit, hint request
 * — see gameFeedback.ts) opt out with a `data-sfx-exempt` attribute so the
 * generic click doesn't layer on top of their specific feedback.
 */
export default function ClickSound() {
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-sfx-exempt]")) return;
      playButtonClickSound();
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return null;
}
