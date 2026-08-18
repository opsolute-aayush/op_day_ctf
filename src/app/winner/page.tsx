"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import { Trophy, PartyPopper } from "lucide-react";
import { useTeamStatus } from "@/hooks/useTeamStatus";
import GlitchTitle from "@/components/GlitchTitle";
import TerminalPanel from "@/components/TerminalPanel";
import TeamAvatar from "@/components/TeamAvatar";
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
  const [duration, setDuration] = useState<string | null>(null);
  const fired = useRef(false);

  useEffect(() => {
    if (unauthorized) router.replace("/register");
  }, [unauthorized, router]);

  useEffect(() => {
    if (status && !status.completed) router.replace("/play");
  }, [status, router]);

  useEffect(() => {
    if (!status?.completedAt) return;
    if (status.gameStartedAt) {
      const ms = new Date(status.completedAt).getTime() - new Date(status.gameStartedAt).getTime();
      setDuration(formatDuration(ms));
    }
  }, [status]);

  useEffect(() => {
    if (!status?.completed || fired.current) return;
    fired.current = true;
    playWinFeedback();

    const colors = [status.team.color, "#39FF14", "#00F0FF"];
    const isFirst = status.isFirstToFinish;
    const duration = isFirst ? 4000 : 1500;
    const end = Date.now() + duration;

    (function frame() {
      confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0 }, colors });
      confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();

    confetti({ particleCount: isFirst ? 150 : 80, spread: 100, origin: { y: 0.5 }, colors });
  }, [status]);

  if (loading || !status) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="caret-blink text-neon-500">loading</p>
      </main>
    );
  }

  const isFirst = status.isFirstToFinish;

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center">
      <div className="w-full max-w-md space-y-6">
        {isFirst ? (
          <Trophy className="mx-auto h-16 w-16 text-amber-400 text-glow" />
        ) : (
          <PartyPopper className="mx-auto h-16 w-16 text-neon-500 text-glow" />
        )}
        <GlitchTitle text={isFirst ? "VICTORY" : "HUNT COMPLETE"} className="text-3xl sm:text-4xl" />

        <div className="flex items-center justify-center gap-3">
          <TeamAvatar teamNumber={status.team.teamNumber} color={status.team.color} size="lg" />
          <p className="text-lg" style={{ color: status.team.color }}>
            {status.team.name}
          </p>
        </div>

        <TerminalPanel title="mission.log">
          <p className="text-neon-100/80">
            {isFirst
              ? "First team to fully assemble and transmit the correct sentence. Nobody beat that time."
              : "Sentence assembled and transmitted correctly — the hunt is solved. Another team beat you to first place, but great run."}
          </p>
          {duration && (
            <p className="mt-3 text-sm text-neon-100/50">
              Your time: <span className="text-neon-500">{duration}</span>
            </p>
          )}
        </TerminalPanel>

        <p className="text-xs uppercase tracking-widest text-neon-100/30">
          {status.gameFinished
            ? "The Game Master has ended the hunt."
            : "The hunt is still live for other teams."}
        </p>
      </div>
    </main>
  );
}
