"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, KeyRound } from "lucide-react";
import NeonButton from "@/components/NeonButton";
import InputField from "@/components/InputField";
import { playRandomWrongPasswordSound } from "@/lib/sfx";

interface PasswordModalProps {
  levelNumber: number;
  onClose: () => void;
  onUnlocked: () => void;
}

export default function PasswordModal({ levelNumber, onClose, onUnlocked }: PasswordModalProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/game/unlock-level", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Incorrect password.");
        setShakeKey((k) => k + 1);
        setSubmitting(false);
        if (res.status === 401) playRandomWrongPasswordSound();
        return;
      }
      onUnlocked();
    } catch {
      setError("Network error — try again.");
      setShakeKey((k) => k + 1);
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          onClick={(e) => e.stopPropagation()}
          className="terminal-panel neon-border-glow w-full max-w-sm rounded-lg p-6"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-neon-500">
              <KeyRound className="h-5 w-5" />
              <h3 className="font-display uppercase tracking-widest">Level {levelNumber} Lock</h3>
            </div>
            <button onClick={onClose} className="text-neon-100/50 hover:text-danger-400" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <InputField
              autoFocus
              placeholder="Enter decoded password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="off"
            />

            {error && (
              <p key={shakeKey} className="shake rounded-md border border-danger-400/40 bg-danger-400/10 px-3 py-2 text-sm text-danger-400">
                {error}
              </p>
            )}

            <NeonButton type="submit" disabled={submitting} className="w-full">
              {submitting ? "Decrypting…" : "Unlock"}
            </NeonButton>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
