"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Skull, ShieldAlert, ShieldCheck } from "lucide-react";
import CipherInput from "@/components/CipherInput";
import NeonButton from "@/components/NeonButton";
import type { ActiveSabotage } from "@/hooks/useTeamStatus";
import { playWrongPasswordFeedback, playResolveFeedback } from "@/lib/gameFeedback";

type Status = "idle" | "verifying" | "denied" | "granted";

/**
 * Full-screen, non-dismissable overlay — while a sabotage is active on this
 * team, it blocks everything else on /play (no close button) until the
 * decoded answer is submitted or an admin bypasses it.
 */
export default function SabotageModal({ sabotage, onResolved }: { sabotage: ActiveSabotage; onResolved: () => void }) {
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!answer.trim() || status === "verifying" || status === "granted") return;
    setStatus("verifying");
    setError(null);

    try {
      const res = await fetch("/api/game/resolve-sabotage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sabotageId: sabotage.id, answer }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Incorrect. Keep decoding.");
        setStatus("denied");
        playWrongPasswordFeedback();
        setTimeout(() => setStatus((s) => (s === "denied" ? "idle" : s)), 550);
        return;
      }
      setStatus("granted");
      playResolveFeedback();
      setTimeout(onResolved, 700);
    } catch {
      setError("Network error — try again.");
      setStatus("denied");
      setTimeout(() => setStatus((s) => (s === "denied" ? "idle" : s)), 550);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 backdrop-blur-sm px-4"
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className={`terminal-panel relative w-full max-w-sm overflow-hidden rounded-lg border-danger-400/50 p-6 ${
          status === "denied" ? "flash-red" : status === "granted" ? "flash-green" : ""
        }`}
      >
        <div
          className={`mb-4 flex items-center gap-2 ${
            status === "denied" ? "lock-shake text-danger-400" : status === "granted" ? "text-neon-500" : "text-danger-400"
          }`}
        >
          {status === "granted" ? <ShieldCheck className="h-5 w-5" /> : <Skull className="h-5 w-5" />}
          <h3 className="font-display uppercase tracking-widest">Squad Sabotaged</h3>
        </div>

        <p className="mb-4 text-sm text-neon-100/70">
          <span className="font-semibold text-danger-400">{sabotage.sourceTeamName}</span> hit your systems. Decode the
          string below ({sabotage.encoding}) and enter the plaintext to restore access.
        </p>

        <div className="mb-4 break-all rounded-md border border-panel-border bg-void-2 px-3 py-2.5 font-mono text-sm text-cyan-400">
          {sabotage.cipherText}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <CipherInput
            autoFocus
            placeholder="Enter decoded text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={status === "verifying" || status === "granted"}
          />

          {error && (
            <p className="flex items-center gap-1.5 rounded-md border border-danger-400/40 bg-danger-400/10 px-3 py-2 text-sm text-danger-400">
              <ShieldAlert className="h-4 w-4 shrink-0" /> {error}
            </p>
          )}

          <NeonButton
            type="submit"
            variant="danger"
            disabled={status === "verifying" || status === "granted"}
            className="w-full"
            data-sfx-exempt
          >
            {status === "granted" ? "Access Restored" : status === "verifying" ? "Decrypting…" : "Clear Sabotage"}
          </NeonButton>
        </form>
      </motion.div>
    </motion.div>
  );
}
