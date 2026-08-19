"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Crown, ShieldCheck } from "lucide-react";
import { useTeamStatus } from "@/hooks/useTeamStatus";
import { usePolledFetch } from "@/hooks/usePolledFetch";
import GlitchTitle from "@/components/GlitchTitle";
import TerminalPanel from "@/components/TerminalPanel";
import TeamAvatar from "@/components/TeamAvatar";
import MatrixRain from "@/components/MatrixRain";
import HackedOverlay from "@/components/HackedOverlay";
import HackBurst from "@/components/HackBurst";
import FinalStandings from "@/components/FinalStandings";
import { ordinal, RANK_STYLE, type TeamStat } from "@/components/TeamStandingsList";
import { playWinFeedback } from "@/lib/gameFeedback";

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

export default function WinnerPage() {
  const router = useRouter();
  const { status, loading, unauthorized } = useTeamStatus(5000);
  const statsData = usePolledFetch<{ stats: TeamStat[] }>("/api/game/stats", 5000);
  const fired = useRef(false);

  useEffect(() => {
    if (unauthorized) router.replace("/register");
  }, [unauthorized, router]);

  useEffect(() => {
    if (status && !status.completed) router.replace("/play");
  }, [status, router]);

  useEffect(() => {
    if (!status?.completed || fired.current) return;
    fired.current = true;
    playWinFeedback();
  }, [status]);

  if (loading || !status) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="caret-blink text-neon-500">loading</p>
      </main>
    );
  }

  const isFirst = status.isFirstToFinish;
  const myStat = statsData?.stats.find((s) => s.teamNumber === status.team.teamNumber) ?? null;
  const position = myStat?.position ?? (isFirst ? 1 : null);
  const rankStyle = position ? RANK_STYLE[position] : undefined;
  const duration =
    status.completedAt && status.gameStartedAt
      ? formatDuration(new Date(status.completedAt).getTime() - new Date(status.gameStartedAt).getTime())
      : null;

  const bootLines = [
    "> decrypting final payload... OK",
    "> integrity check: PASSED",
    `> operative squad: ${status.team.name.toUpperCase()}`,
    duration ? `> mission clock: ${duration}` : "> mission clock: —",
    `> clearance rank: ${position ? ordinal(position).toUpperCase() : "PENDING"}`,
  ];

  return (
    <main className="relative flex flex-1 flex-col items-center px-4 py-10">
      {/* One-shot breach flash — layered on top of the route's regular glitch-reveal. */}
      <div className="victory-flash pointer-events-none fixed inset-0 z-[60]" aria-hidden="true" />
      {/* Keeps glitching for as long as this page is open, not just on entry. */}
      <HackedOverlay />
      <HackBurst active={status.completed} intense={isFirst} accentColor={status.team.color} />
      <MatrixRain columns={16} className="fixed inset-0 opacity-25" />

      <div className="relative z-10 w-full max-w-md space-y-6 text-center">
        <div>
          {isFirst ? (
            <Crown className="rank-pulse mx-auto h-20 w-20" style={{ color: "#FFD400" }} fill="#FFD400" strokeWidth={1.25} />
          ) : (
            <ShieldCheck
              className="rank-pulse mx-auto h-16 w-16"
              style={{ color: rankStyle?.color ?? "var(--neon-500)" }}
              strokeWidth={1.5}
            />
          )}
        </div>

        <div className="space-y-1">
          <GlitchTitle text={isFirst ? "MAINFRAME BREACHED" : "ACCESS GRANTED"} className="text-3xl sm:text-4xl" />
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-neon-100/40">
            {isFirst ? "root privileges escalated — hunt fully solved" : "sentence verified — hunt solved"}
          </p>
        </div>

        <div className="flex items-center justify-center gap-3">
          <TeamAvatar teamNumber={status.team.teamNumber} color={status.team.color} size="lg" />
          <div className="text-left">
            <p className="text-lg font-semibold" style={{ color: status.team.color }}>
              {status.team.name}
            </p>
            {position && (
              <p className="text-xs uppercase tracking-widest" style={{ color: rankStyle?.color ?? "var(--neon-400)" }}>
                {ordinal(position)} place
              </p>
            )}
          </div>
        </div>

        <TerminalPanel title="mission.log">
          <div className="space-y-1.5 text-left font-mono text-sm">
            {bootLines.map((line, i) => (
              <motion.p
                key={line}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: 0.15 + i * 0.18 }}
                className="text-neon-500/90"
              >
                {line}
              </motion.p>
            ))}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 + bootLines.length * 0.18 }}
              className="caret-blink text-neon-100/50"
            >
              awaiting next transmission
            </motion.p>
          </div>
        </TerminalPanel>

        <p className="text-xs uppercase tracking-widest text-neon-100/30">
          {status.gameFinished ? "The Game Master has ended the hunt." : "The hunt is still live for other teams."}
        </p>
      </div>

      <div className="relative z-10 mt-8 w-full max-w-md">
        <FinalStandings highlightTeamNumber={status.team.teamNumber} />
      </div>
    </main>
  );
}
