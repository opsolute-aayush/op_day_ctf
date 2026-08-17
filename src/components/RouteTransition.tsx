"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

/**
 * Two things fire on every route change, both keyed by pathname so a fresh
 * instance mounts (and only ever animates OUT, never removed via
 * AnimatePresence) whenever the URL changes:
 *
 * 1. A full-screen "boot flicker" overlay — mounts fully opaque over the
 *    whole viewport, showing a terminal-style "loading_module" line, then
 *    burns off. It masks Next.js's instant children-swap so navigation
 *    always reads as a deliberate decrypt/load beat instead of a hard cut.
 * 2. The actual content fades + slides in underneath, slightly after the
 *    overlay starts clearing.
 *
 * Neither ever needs an exit animation — a previous take on this used
 * AnimatePresence to fade the content OUT, which occasionally left it stuck
 * at opacity 0 because coordinating an exit with Next.js's own swap is
 * fragile. Mount-opaque-then-fade-out is simpler and can't get stuck: worst
 * case the overlay/content just don't animate, but they're never invisible.
 */
export default function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <>
      <motion.div
        key={`overlay-${pathname}`}
        aria-hidden="true"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.55, ease: "easeOut", delay: 0.1 }}
        className="pointer-events-none fixed inset-0 z-[60] overflow-hidden bg-void"
      >
        <div className="grid-bg" />
        <motion.div
          initial={{ y: "-120%" }}
          animate={{ y: "220%" }}
          transition={{ duration: 0.6, ease: "linear" }}
          className="absolute inset-x-0 h-20 bg-gradient-to-b from-transparent via-neon-500/25 to-transparent"
        />
        <p className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-display text-xs uppercase tracking-[0.4em] text-neon-500/90 text-glow">
          {"> loading_module"}
          <span className="caret-blink" />
        </p>
      </motion.div>

      <motion.div
        key={`content-${pathname}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut", delay: 0.15 }}
        className="flex min-h-full flex-1 flex-col"
      >
        {children}
      </motion.div>
    </>
  );
}
