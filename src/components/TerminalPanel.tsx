"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";

interface TerminalPanelProps {
  children: ReactNode;
  title?: string;
  className?: string;
}

export default function TerminalPanel({ children, title, className = "" }: TerminalPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`terminal-panel rounded-lg overflow-hidden ${className}`}
    >
      {title && (
        <div className="flex items-center gap-2 border-b border-panel-border bg-void-2/80 px-4 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-danger-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-neon-500/70" />
          <span className="ml-2 text-xs tracking-widest text-neon-400/80">{title}</span>
        </div>
      )}
      <div className="p-5">{children}</div>
    </motion.div>
  );
}
