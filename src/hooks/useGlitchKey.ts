"use client";

import { useState } from "react";

/**
 * Drives a `key`-remount glitch-reveal without double-playing it on first
 * mount. RouteTransition already plays the glitch once when a page is
 * navigated to; if content inside the page also key-remounts into its
 * "initial" state on that same mount (e.g. /play's standby-vs-levels split
 * resolving right after the loading gate), the glitch fires twice back to
 * back. This hook suppresses the reveal class for whichever value is seen
 * first, and only turns it on once `value` genuinely changes afterward.
 *
 * Uses React's "adjust state during render" pattern (a setState call in the
 * component body, guarded by a prev-value comparison) rather than an effect.
 * This lets React re-render with the new state before anything is ever
 * painted, instead of an effect flashing the old, unanimated state for a
 * frame before catching up.
 */
export function useGlitchKey<T>(value: T): { key: string; className: string } {
  const [prevValue, setPrevValue] = useState(value);
  const [animate, setAnimate] = useState(false);

  if (value !== prevValue) {
    setPrevValue(value);
    setAnimate(true);
  }

  return { key: String(prevValue), className: animate ? "glitch-reveal" : "" };
}
