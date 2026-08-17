"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import { Trophy } from "lucide-react";
import { useTeamStatus } from "@/hooks/useTeamStatus";
import GlitchTitle from "@/components/GlitchTitle";
import TerminalPanel from "@/components/TerminalPanel";

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
    if (status && !status.isWinner) router.replace("/play");
  }, [status, router]);

  useEffect(() => {
    if (!status?.completedAt) return;
    if (status.gameStartedAt) {
      const ms = new Date(status.completedAt).getTime() - new Date(status.gameStartedAt).getTime();
      setDuration(formatDuration(ms));
    }
  }, [status]);

  useEffect(() => {
    if (!status?.isWinner || fired.current) return;
    fired.current = true;

    const colors = [status.team.color, "#39FF14", "#00F0FF"];
    const duration = 4000;
    const end = Date.now() + duration;

    (function frame() {
      confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0 }, colors });
      confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();

    confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 }, colors });
  }, [status]);

  if (loading || !status) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="caret-blink text-neon-500">loading</p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center">
      <div className="w-full max-w-md space-y-6">
        <Trophy className="mx-auto h-16 w-16 text-amber-400 text-glow" />
        <GlitchTitle text="VICTORY" className="text-4xl sm:text-5xl" />
        <p className="text-lg" style={{ color: status.team.color }}>
          {status.team.name}
        </p>

        <TerminalPanel title="victory.log">
          <p className="text-neon-100/80">
            First team to fully assemble and transmit the correct sentence.
          </p>
          {duration && (
            <p className="mt-3 text-sm text-neon-100/50">
              Total time: <span className="text-neon-500">{duration}</span>
            </p>
          )}
        </TerminalPanel>

        <p className="text-xs uppercase tracking-widest text-neon-100/30">
          OP Day CTF — leaderboard is now locked.
        </p>
      </div>
    </main>
  );
}
