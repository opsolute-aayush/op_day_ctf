"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Crown, ShieldCheck, Home } from "lucide-react";
import { useTeamStatus } from "@/hooks/useTeamStatus";
import { usePolledFetch } from "@/hooks/usePolledFetch";
import GlitchTitle from "@/components/GlitchTitle";
import TerminalPanel from "@/components/TerminalPanel";
import TeamAvatar from "@/components/TeamAvatar";
import AsciiWinnerPortrait from "@/components/AsciiWinnerPortrait";
import VideoMonitor from "@/components/VideoMonitor";
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
      <Link
        href="/"
        className="absolute left-4 top-4 z-20 flex items-center gap-1.5 text-xs uppercase tracking-widest text-neon-100/40 hover:text-cyan-400"
      >
        <Home className="h-4 w-4" /> Home
      </Link>

      <div className="relative z-10 flex w-full max-w-5xl flex-col items-center gap-10 md:flex-row md:items-start md:justify-center">
        {/* Left — the interactive ASCII portrait: sweeps with a continuous
            mesh-line scan, and ripples outward from a tap/click. Drop an
            image into public/arts/winner/ to activate it. Left untouched
            by the glitch-flicker treatment below — it's already alive on its own. */}
        <div className="w-full md:w-2/5 md:sticky md:top-16">
          <AsciiWinnerPortrait accentColor={status.team.color} />
        </div>

        {/* Right — exactly three blocks: the headline, the team/rank line,
            and mission.log. Each flickers on its own continuous loop (see
            .glitch-flicker in globals.css — the same tearing/RGB-split
            reveal used for nav transitions, just slower and looping) instead
            of a single whole-page effect, so they never glitch in unison. */}
        <div className="flex w-full flex-col items-center gap-6 text-center md:w-3/5">
          <div className="glitch-flicker">
            {isFirst ? (
              <Crown className="rank-pulse mx-auto h-14 w-14" style={{ color: "#FFD400" }} fill="#FFD400" strokeWidth={1.25} />
            ) : (
              <ShieldCheck
                className="rank-pulse mx-auto h-12 w-12"
                style={{ color: rankStyle?.color ?? "var(--neon-500)" }}
                strokeWidth={1.5}
              />
            )}
            <GlitchTitle text={isFirst ? "MAINFRAME BREACHED" : "ACCESS GRANTED"} className="text-3xl sm:text-4xl" />
          </div>

          <div
            className="glitch-flicker flex items-center justify-center gap-3"
            style={{ animationDelay: "0.9s" }}
          >
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

          <div className="glitch-flicker w-full max-w-md" style={{ animationDelay: "1.8s" }}>
            <TerminalPanel title="mission.log">
              <div className="space-y-1.5 text-left font-mono text-sm">
                {bootLines.map((line, i) => (
                  <motion.p
                    key={line}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: 0.1 + i * 0.15 }}
                    className="text-neon-500/90"
                  >
                    {line}
                  </motion.p>
                ))}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 + bootLines.length * 0.15 }}
                  className="caret-blink text-neon-100/50"
                >
                  awaiting next transmission
                </motion.p>
              </div>
            </TerminalPanel>
          </div>

          <div className="glitch-flicker w-full max-w-md" style={{ animationDelay: "2.4s" }}>
            <VideoMonitor categories={["winning"]} caption="Victory transmission, replayed here." />
          </div>
        </div>
      </div>
    </main>
  );
}
