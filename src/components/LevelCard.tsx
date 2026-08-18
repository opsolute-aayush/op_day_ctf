"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Unlock, CheckCircle2, MapPin, Sparkles, LifeBuoy, Loader2, ArrowRight } from "lucide-react";

export type LevelCardState = "locked" | "active" | "completed";

export interface WordVerifyResult {
  ok: boolean;
  error?: string;
}

interface LevelCardProps {
  levelNumber: number;
  state: LevelCardState;
  locationClue?: string;
  wordReward?: string;
  hint?: string | null;
  onClick?: () => void;
  index?: number;
  hintAvailable?: boolean;
  helpCreditsRemaining?: number;
  onRequestHint?: () => void;
  requestingHint?: boolean;
  onVerifyWord?: (levelNumber: number, word: string) => Promise<WordVerifyResult>;
}

export default function LevelCard({
  levelNumber,
  state,
  locationClue,
  wordReward,
  hint,
  onClick,
  index = 0,
  hintAvailable,
  helpCreditsRemaining,
  onRequestHint,
  requestingHint,
  onVerifyWord,
}: LevelCardProps) {
  const clickable = state === "active";
  const showHelpButton = state === "active" && !hint && hintAvailable && (helpCreditsRemaining ?? 0) > 0;

  const [wordDraft, setWordDraft] = useState("");
  const [wordError, setWordError] = useState<string | null>(null);
  const [wordSubmitting, setWordSubmitting] = useState(false);

  async function handleVerifyWord(e: React.FormEvent) {
    e.preventDefault();
    if (!wordDraft.trim() || !onVerifyWord || wordSubmitting) return;
    setWordSubmitting(true);
    setWordError(null);
    const result = await onVerifyWord(levelNumber, wordDraft);
    setWordSubmitting(false);
    if (!result.ok) {
      setWordError(result.error ?? "Wrong word.");
    }
  }

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
        {state === "locked" && (
          <span className="hazard-stripes hud-cut-sm flex items-center gap-1.5 border border-danger-400/50 bg-danger-400/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-danger-400">
            <Lock className="h-3 w-3" /> Locked
          </span>
        )}
        {state === "active" && (
          <span className="hud-cut-sm flex animate-pulse items-center gap-1.5 border border-amber-400/60 bg-amber-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-400">
            <Unlock className="h-3 w-3" /> Decrypting
          </span>
        )}
        {state === "completed" && (
          <span className="hud-cut-sm flex items-center gap-1.5 border border-neon-500/60 bg-neon-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-neon-500">
            <CheckCircle2 className="h-3 w-3" /> Unlocked
          </span>
        )}
      </div>

      {state === "locked" && (
        <p className="mt-2 text-sm text-neon-100/30">Encrypted. Unlock the previous level first.</p>
      )}

      {state === "active" && (
        <div className="mt-2 space-y-2">
          <p className="text-sm text-neon-100/80">Password required to decrypt this level.</p>

          <AnimatePresence mode="wait">
            {hint ? (
              <motion.p
                key="hint"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="flex items-start gap-1.5 text-xs text-cyan-400"
              >
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Hint: {hint}
              </motion.p>
            ) : showHelpButton ? (
              <motion.button
                key="help-button"
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onRequestHint?.();
                }}
                disabled={requestingHint}
                data-sfx-exempt
                className="flex items-center gap-1.5 rounded-md border border-cyan-400/40 bg-cyan-400/10 px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-cyan-400 hover:bg-cyan-400/20 disabled:opacity-50"
              >
                {requestingHint ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <LifeBuoy className="h-3.5 w-3.5" />
                )}
                Ask for a hint ({helpCreditsRemaining} left)
              </motion.button>
            ) : null}
          </AnimatePresence>

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

          <AnimatePresence mode="wait">
            {wordReward ? (
              <motion.span
                key="collected"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-block rounded-full border border-neon-500/40 bg-neon-500/10 px-3 py-1 text-xs font-semibold tracking-wide text-neon-400"
              >
                WORD COLLECTED: “{wordReward}”
              </motion.span>
            ) : (
              <motion.form
                key="verify-form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onSubmit={handleVerifyWord}
                className="space-y-1.5"
              >
                <p className="text-xs text-neon-100/50">Type the exact word you found at this location:</p>
                <div className="flex gap-2">
                  <input
                    value={wordDraft}
                    onChange={(e) => {
                      setWordDraft(e.target.value);
                      if (wordError) setWordError(null);
                    }}
                    placeholder="Enter word"
                    autoComplete="off"
                    className="w-full min-w-0 flex-1 rounded-md border border-panel-border bg-void-2 px-3 py-2 text-sm uppercase tracking-wide text-neon-100 placeholder:text-neon-100/30 placeholder:normal-case outline-none focus:border-neon-500 focus:ring-1 focus:ring-neon-500"
                  />
                  <button
                    type="submit"
                    disabled={wordSubmitting || !wordDraft.trim()}
                    data-sfx-exempt
                    className="flex shrink-0 items-center gap-1 rounded-md border border-neon-500/50 bg-neon-500/10 px-3 text-xs font-semibold uppercase text-neon-400 hover:bg-neon-500/20 disabled:opacity-40"
                  >
                    {wordSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
                  </button>
                </div>
                {wordError && (
                  <p className="shake text-xs text-danger-400">{wordError}</p>
                )}
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
