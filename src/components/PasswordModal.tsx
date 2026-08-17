"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Lock, Unlock, ShieldAlert, ShieldCheck } from "lucide-react";
import NeonButton from "@/components/NeonButton";
import CipherInput from "@/components/CipherInput";
import MatrixRain from "@/components/MatrixRain";
import { playRandomWrongPasswordSound, playRightPasswordSound } from "@/lib/sfx";
import { playVideoClip } from "@/lib/videofx";

interface PasswordModalProps {
  levelNumber: number;
  onClose: () => void;
  onUnlocked: () => void;
}

type Status = "idle" | "verifying" | "denied" | "granted";

export default function PasswordModal({ levelNumber, onClose, onUnlocked }: PasswordModalProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim() || status === "verifying" || status === "granted") return;
    setStatus("verifying");
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
        setStatus("denied");
        if (res.status === 401) {
          playRandomWrongPasswordSound();
          playVideoClip("wrong_pass");
        }
        setTimeout(() => setStatus((s) => (s === "denied" ? "idle" : s)), 550);
        return;
      }
      setStatus("granted");
      playRightPasswordSound();
      playVideoClip("right_pass");
      setTimeout(onUnlocked, 700);
    } catch {
      setError("Network error — try again.");
      setStatus("denied");
      setTimeout(() => setStatus((s) => (s === "denied" ? "idle" : s)), 550);
    }
  }

  const StatusIcon = status === "granted" ? Unlock : status === "denied" ? ShieldAlert : Lock;

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
          className={`terminal-panel neon-border-glow relative w-full max-w-sm overflow-hidden rounded-lg p-6 ${
            status === "denied" ? "flash-red" : status === "granted" ? "flash-green" : ""
          }`}
        >
          <MatrixRain columns={8} />

          <span className="hud-corner pointer-events-none absolute left-2 top-2 h-4 w-4 border-l-2 border-t-2 border-neon-500/70" />
          <span className="hud-corner pointer-events-none absolute right-2 top-2 h-4 w-4 border-r-2 border-t-2 border-neon-500/70" />
          <span className="hud-corner pointer-events-none absolute bottom-2 left-2 h-4 w-4 border-b-2 border-l-2 border-neon-500/70" />
          <span className="hud-corner pointer-events-none absolute bottom-2 right-2 h-4 w-4 border-b-2 border-r-2 border-neon-500/70" />

          <div className="relative z-10">
            <div className="mb-5 flex items-center justify-between">
              <div
                className={`flex items-center gap-2 ${
                  status === "denied"
                    ? "lock-shake text-danger-400"
                    : status === "granted"
                      ? "lock-unlock text-neon-500"
                      : "text-neon-500"
                }`}
              >
                <StatusIcon className="h-5 w-5" />
                <h3 className="font-display uppercase tracking-widest">Level {levelNumber} Breach</h3>
              </div>
              <button onClick={onClose} className="text-neon-100/50 hover:text-danger-400" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-widest text-neon-400/80">Decryption Key</label>
                <div className="relative">
                  <CipherInput
                    autoFocus
                    placeholder="Enter decoded password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={status === "verifying" || status === "granted"}
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px overflow-hidden">
                    <div className="cipher-scan-line h-px w-1/3 bg-gradient-to-r from-transparent via-neon-500 to-transparent" />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-widest text-neon-100/30">
                <span>chars: {password.length}</span>
                <span
                  className={
                    status === "denied"
                      ? "text-danger-400"
                      : status === "granted"
                        ? "text-neon-500"
                        : status === "verifying"
                          ? "text-cyan-400"
                          : ""
                  }
                >
                  {status === "denied"
                    ? "access denied"
                    : status === "granted"
                      ? "access granted"
                      : status === "verifying"
                        ? "verifying…"
                        : "awaiting input"}
                </span>
              </div>

              {error && (
                <p className="rounded-md border border-danger-400/40 bg-danger-400/10 px-3 py-2 text-sm text-danger-400">
                  {error}
                </p>
              )}

              <NeonButton
                type="submit"
                disabled={status === "verifying" || status === "granted"}
                className="w-full"
              >
                {status === "granted" ? (
                  <>
                    <ShieldCheck className="h-4 w-4" /> Access Granted
                  </>
                ) : status === "verifying" ? (
                  "Decrypting…"
                ) : (
                  "Unlock"
                )}
              </NeonButton>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
