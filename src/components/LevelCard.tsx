"use client";

import { motion } from "framer-motion";
import { Lock, Unlock, CheckCircle2, MapPin, Sparkles } from "lucide-react";

export type LevelCardState = "locked" | "active" | "completed";

interface LevelCardProps {
  levelNumber: number;
  state: LevelCardState;
  locationClue?: string;
  wordReward?: string;
  hint?: string | null;
  onClick?: () => void;
  index?: number;
}

export default function LevelCard({
  levelNumber,
  state,
  locationClue,
  wordReward,
  hint,
  onClick,
  index = 0,
}: LevelCardProps) {
  const clickable = state === "active";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06, ease: "easeOut" }}
      whileHover={clickable ? { scale: 1.015 } : undefined}
      whileTap={clickable ? { scale: 0.985 } : undefined}
      onClick={clickable ? onClick : undefined}
      className={`terminal-panel rounded-lg p-4 transition-colors ${
        clickable ? "cursor-pointer hover:border-neon-500/60" : ""
      } ${state === "completed" ? "border-neon-500/40" : ""} ${
        state === "locked" ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-neon-400/70">Level {levelNumber}</span>
        {state === "locked" && <Lock className="h-4 w-4 text-neon-100/30" />}
        {state === "active" && <Unlock className="h-4 w-4 text-amber-400 animate-pulse" />}
        {state === "completed" && <CheckCircle2 className="h-4 w-4 text-neon-500" />}
      </div>

      {state === "locked" && (
        <p className="mt-2 text-sm text-neon-100/30">Encrypted. Unlock the previous level first.</p>
      )}

      {state === "active" && (
        <div className="mt-2 space-y-1">
          <p className="text-sm text-neon-100/80">Password required to decrypt this level.</p>
          {hint && (
            <p className="flex items-start gap-1.5 text-xs text-cyan-400">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Hint: {hint}
            </p>
          )}
          <span className="mt-1 inline-block text-xs font-semibold uppercase tracking-widest text-amber-400">
            Tap to enter password →
          </span>
        </div>
      )}

      {state === "completed" && (
        <div className="mt-2 space-y-2">
          {locationClue && (
            <p className="flex items-start gap-1.5 text-sm text-neon-100/70">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-neon-500" /> {locationClue}
            </p>
          )}
          {wordReward && (
            <span className="inline-block rounded-full border border-neon-500/40 bg-neon-500/10 px-3 py-1 text-xs font-semibold tracking-wide text-neon-400">
              WORD COLLECTED: “{wordReward}”
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}
