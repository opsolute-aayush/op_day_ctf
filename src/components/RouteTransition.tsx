"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

/**
 * Fades + slides in whenever the route changes, so navigation never feels
 * like an instant swap. Deliberately no AnimatePresence/exit animation —
 * coordinating an exit with Next.js's own children-swap on navigation is
 * fragile and can leave content stuck at opacity 0. A plain keyed
 * remount-and-animate-in is simpler and can't get stuck.
 */
export default function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex min-h-full flex-1 flex-col"
    >
      {children}
    </motion.div>
  );
}
