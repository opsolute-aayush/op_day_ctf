"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";

// Scoped to the incoming page's own content — a key-remount + .glitch-reveal,
// the exact same mechanism the admin dashboard uses when switching tabs.
// There used to also be a full-viewport "boot" overlay (black screen +
// centered loading text + scattered glitch bars) layered on top of this, but
// that made every navigation feel like the whole screen was wiping out
// instead of just the content glitching in — removed in favor of this
// component-level effect alone.
export default function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="glitch-reveal flex min-h-full flex-1 flex-col">
      {children}
    </div>
  );
}
