"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, Skull, Radio, ChevronDown } from "lucide-react";
import TerminalPanel from "@/components/TerminalPanel";
import NeonButton from "@/components/NeonButton";
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
  ownTeamId: string;
  gameActive: boolean;
  onSabotageLaunched: () => void;
}

/** Left-sidebar stat readout + the sabotage launcher, plus a standby "monitor" placeholder below. */
export default function PlayerStatsPanel({
  helpCreditsRemaining,
  sabotageCreditsRemaining,
  ownTeamId,
  gameActive,
  onSabotageLaunched,
}: PlayerStatsPanelProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [otherTeams, setOtherTeams] = useState<OtherTeam[] | null>(null);
  const [launching, setLaunching] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastClip, setLastClip] = useState<VideoClipEventDetail | null>(null);

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
            disabled={sabotageCreditsRemaining <= 0 || !gameActive}
            onClick={() => setPickerOpen((v) => !v)}
          >
            <Skull className="h-4 w-4" /> Sabotage a Squad <ChevronDown className="h-3.5 w-3.5" />
          </NeonButton>

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
        </div>
      </TerminalPanel>

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
    </div>
  );
}
