"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, Skull, Radio, ChevronDown, Repeat } from "lucide-react";
import TerminalPanel from "@/components/TerminalPanel";
import NeonButton from "@/components/NeonButton";
import InputField from "@/components/InputField";
import ChromaKeyVideo from "@/components/ChromaKeyVideo";
import { subscribeToVideoClips, VideoClipEventDetail } from "@/lib/videofx";

interface OtherTeam {
  id: string;
  teamNumber: number;
  teamName: string;
  color: string;
}

interface PlayerStatsPanelProps {
  helpCreditsRemaining: number;
  sabotageCreditsRemaining: number;
  sabotageCooldownRemainingMs: number;
  swapCardEnabled: boolean;
  swapCardUsed: boolean;
  ownTeamId: string;
  gameActive: boolean;
  onSabotageLaunched: () => void;
  onSwapCompleted: () => void;
}

/** Signal monitor up top, agent stats (credits + sabotage + swap) below it. */
export default function PlayerStatsPanel({
  helpCreditsRemaining,
  sabotageCreditsRemaining,
  sabotageCooldownRemainingMs,
  swapCardEnabled,
  swapCardUsed,
  ownTeamId,
  gameActive,
  onSabotageLaunched,
  onSwapCompleted,
}: PlayerStatsPanelProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [otherTeams, setOtherTeams] = useState<OtherTeam[] | null>(null);
  const [launching, setLaunching] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastClip, setLastClip] = useState<VideoClipEventDetail | null>(null);
  const [swapCode, setSwapCode] = useState("");
  const [swapVerifying, setSwapVerifying] = useState(false);
  const [swapVerified, setSwapVerified] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [swapTeams, setSwapTeams] = useState<OtherTeam[] | null>(null);
  const [swapping, setSwapping] = useState<string | null>(null);
  const [swapResult, setSwapResult] = useState<string | null>(null);
  // Ticks down locally between poll refreshes so the countdown reads
  // smoothly instead of jumping every 3s when useTeamStatus refetches. Uses
  // React's "adjust state during render" pattern (setState in the body,
  // guarded by a prev-prop comparison) rather than an effect, so a fresh
  // server value takes effect on the very render it arrives in.
  const [prevServerMs, setPrevServerMs] = useState(sabotageCooldownRemainingMs);
  const [cooldownMs, setCooldownMs] = useState(sabotageCooldownRemainingMs);
  if (sabotageCooldownRemainingMs !== prevServerMs) {
    setPrevServerMs(sabotageCooldownRemainingMs);
    setCooldownMs(sabotageCooldownRemainingMs);
  }

  useEffect(() => {
    if (cooldownMs <= 0) return;
    const timeout = setTimeout(() => setCooldownMs((ms) => Math.max(0, ms - 1000)), 1000);
    return () => clearTimeout(timeout);
  }, [cooldownMs]);

  // right_pass/help clips show here and only here (VideoOverlay no longer
  // pops them up top-left) — wrong_pass/winning stay on VideoOverlay's own
  // bottom-center popup instead of also duplicating into this monitor.
  useEffect(
    () =>
      subscribeToVideoClips((detail) => {
        if (detail.category === "right_pass" || detail.category === "help") setLastClip(detail);
      }),
    []
  );

  useEffect(() => {
    if (!pickerOpen) return;
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/game/stats", { cache: "no-store" });
      if (!res.ok || cancelled) return;
      const data = await res.json();
      setOtherTeams((data.stats as OtherTeam[]).filter((t) => t.id !== ownTeamId));
    })();
    return () => {
      cancelled = true;
    };
  }, [pickerOpen, ownTeamId]);

  useEffect(() => {
    if (!swapVerified) return;
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/game/stats", { cache: "no-store" });
      if (!res.ok || cancelled) return;
      const data = await res.json();
      setSwapTeams((data.stats as OtherTeam[]).filter((t) => t.id !== ownTeamId));
    })();
    return () => {
      cancelled = true;
    };
  }, [swapVerified, ownTeamId]);

  async function verifySwap() {
    setSwapVerifying(true);
    setSwapError(null);
    try {
      const res = await fetch("/api/game/swap/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: swapCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSwapError(data.error ?? "Couldn't verify that code.");
        return;
      }
      setSwapVerified(true);
    } finally {
      setSwapVerifying(false);
    }
  }

  async function confirmSwap(partner: OtherTeam) {
    setSwapping(partner.id);
    setSwapError(null);
    try {
      const res = await fetch("/api/game/swap/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: swapCode, partnerTeamId: partner.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSwapError(data.error ?? "Couldn't complete the swap.");
        return;
      }
      setSwapVerified(false);
      setSwapCode("");
      setSwapTeams(null);
      setSwapResult(partner.teamName);
      onSwapCompleted();
    } finally {
      setSwapping(null);
    }
  }

  async function launch(targetTeamId: string) {
    setLaunching(targetTeamId);
    setError(null);
    try {
      const res = await fetch("/api/game/sabotage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetTeamId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Couldn't launch sabotage.");
        return;
      }
      setPickerOpen(false);
      onSabotageLaunched();
    } finally {
      setLaunching(null);
    }
  }

  return (
    <div className="space-y-6">
      <TerminalPanel title="signal-monitor.exe">
        <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-md border-2 border-panel-border bg-black">
          <div className="scanlines pointer-events-none absolute inset-0 z-10 opacity-30" />
          {lastClip ? (
            <ChromaKeyVideo
              key={lastClip.src}
              src={lastClip.src}
              onEnded={() => setLastClip(null)}
              className="h-full w-full"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-neon-500/50">
              <Radio className="h-6 w-6 animate-pulse" />
              <span className="font-mono text-[11px] uppercase tracking-widest">No Signal</span>
            </div>
          )}
        </div>
        <p className="mt-2 text-center text-[11px] text-neon-100/30">Last video feedback triggered, replayed here.</p>
      </TerminalPanel>

      <TerminalPanel title="agent-stats.cfg">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm text-neon-100/70">
              <Lightbulb className="h-4 w-4 text-cyan-400" /> Help remaining
            </span>
            <span className="font-display text-lg text-cyan-400">{helpCreditsRemaining}</span>
          </div>
          <div className="h-px bg-panel-border" />
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm text-neon-100/70">
              <Skull className="h-4 w-4 text-danger-400" /> Sabotage remaining
            </span>
            <span className="font-display text-lg text-danger-400">{sabotageCreditsRemaining}</span>
          </div>

          <NeonButton
            variant="danger"
            className="w-full"
            disabled={sabotageCreditsRemaining <= 0 || !gameActive || cooldownMs > 0}
            onClick={() => setPickerOpen((v) => !v)}
          >
            <Skull className="h-4 w-4" />
            {cooldownMs > 0 ? `Recharging ${Math.ceil(cooldownMs / 1000)}s` : "Sabotage a Squad"}
            <ChevronDown className="h-3.5 w-3.5" />
          </NeonButton>
          {cooldownMs > 0 && (
            <p className="text-center text-[11px] uppercase tracking-widest text-danger-400/60">
              Sabotage systems recharging…
            </p>
          )}

          <AnimatePresence initial={false}>
            {pickerOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-1.5 overflow-hidden"
              >
                {otherTeams === null && <p className="text-xs text-neon-100/30">loading squads…</p>}
                {otherTeams?.length === 0 && <p className="text-xs text-neon-100/30">No other squads yet.</p>}
                {otherTeams?.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => launch(t.id)}
                    disabled={launching === t.id}
                    className="flex w-full items-center justify-between rounded-md border border-panel-border bg-void-2/60 px-3 py-2 text-sm hover:border-danger-400/60 disabled:opacity-40"
                  >
                    <span className="font-semibold" style={{ color: t.color }}>
                      {t.teamName}
                    </span>
                    <span className="text-xs text-neon-100/40">{launching === t.id ? "launching…" : "target"}</span>
                  </button>
                ))}
                {error && <p className="text-xs text-danger-400">{error}</p>}
              </motion.div>
            )}
          </AnimatePresence>

          {swapCardEnabled && !swapCardUsed && (
            <>
              <div className="h-px bg-panel-border" />
              <div className="space-y-2">
                <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-neon-100/70">
                  <Repeat className="h-4 w-4 text-purple-400" /> Swap Progress
                </span>
                <p className="text-xs text-neon-100/40">Decoded a hidden swap card out in the field? Enter it below.</p>

                {!swapVerified ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <InputField
                        value={swapCode}
                        onChange={(e) => setSwapCode(e.target.value)}
                        placeholder="Decoded code"
                        disabled={!gameActive}
                        className="font-mono text-sm uppercase tracking-wide"
                      />
                    </div>
                    <NeonButton
                      variant="ghost"
                      onClick={verifySwap}
                      disabled={swapVerifying || !swapCode.trim() || !gameActive}
                      className="shrink-0"
                    >
                      {swapVerifying ? "Checking…" : "Redeem"}
                    </NeonButton>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <p className="text-xs text-purple-400">Code accepted — pick a squad to swap progress with:</p>
                    {swapTeams === null && <p className="text-xs text-neon-100/30">loading squads…</p>}
                    {swapTeams?.length === 0 && <p className="text-xs text-neon-100/30">No other squads yet.</p>}
                    {swapTeams?.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => confirmSwap(t)}
                        disabled={swapping === t.id}
                        className="flex w-full items-center justify-between rounded-md border border-panel-border bg-void-2/60 px-3 py-2 text-sm hover:border-purple-400/60 disabled:opacity-40"
                      >
                        <span className="font-semibold" style={{ color: t.color }}>
                          {t.teamName}
                        </span>
                        <span className="text-xs text-neon-100/40">{swapping === t.id ? "swapping…" : "swap"}</span>
                      </button>
                    ))}
                  </div>
                )}
                {swapError && <p className="text-xs text-danger-400">{swapError}</p>}
              </div>
            </>
          )}
          {swapCardEnabled && swapCardUsed && swapResult && (
            <>
              <div className="h-px bg-panel-border" />
              <div className="flex items-start gap-2 rounded-md border border-purple-400/40 bg-purple-400/10 px-3 py-2 text-xs text-purple-300">
                <Repeat className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Boards swapped with <strong>{swapResult}</strong> — your levels, clues and passwords just changed.
                  Check the list below.
                </span>
              </div>
            </>
          )}
          {swapCardEnabled && swapCardUsed && !swapResult && (
            <p className="text-center text-[11px] uppercase tracking-widest text-neon-100/20">
              Swap card already claimed this game.
            </p>
          )}
        </div>
      </TerminalPanel>
    </div>
  );
}
