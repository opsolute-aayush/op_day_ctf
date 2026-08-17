"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, Trophy, Flag } from "lucide-react";
import { useTeamStatus } from "@/hooks/useTeamStatus";
import GlitchTitle from "@/components/GlitchTitle";
import TerminalPanel from "@/components/TerminalPanel";
import LevelCard, { LevelCardState } from "@/components/LevelCard";
import PasswordModal from "@/components/PasswordModal";

export default function PlayPage() {
  const router = useRouter();
  const { status, loading, unauthorized, refresh } = useTeamStatus(3000);
  const [activeModalLevel, setActiveModalLevel] = useState<number | null>(null);

  useEffect(() => {
    if (unauthorized) router.replace("/register");
  }, [unauthorized, router]);

  useEffect(() => {
    if (status?.completed && status.isWinner) router.replace("/winner");
  }, [status, router]);

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="caret-blink text-neon-500">loading team state</p>
      </main>
    );
  }

  if (!status) return null;

  const passwordLevelsCount = status.totalLevels - 1;
  const isWaitingForStart = !status.gameActive && status.currentLevel === 1 && status.unlockedLevels.length <= 1 && !status.gameFinished;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/register");
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-neon-100/50">Agent Squad</p>
          <h1 className="flex items-center gap-2 font-display text-xl uppercase tracking-widest" style={{ color: status.team.color }}>
            {status.team.name}
          </h1>
        </div>
        <button onClick={logout} className="flex items-center gap-1.5 text-xs text-neon-100/40 hover:text-danger-400">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </header>

      {status.gameFinished && !status.isWinner && (
        <TerminalPanel className="border-amber-400/40">
          <p className="flex items-center gap-2 text-amber-400">
            <Trophy className="h-5 w-5" /> The hunt is over — another team already claimed victory. Nice run, agents.
          </p>
        </TerminalPanel>
      )}

      {isWaitingForStart ? (
        <TerminalPanel title="standby.exe">
          <div className="space-y-3 py-6 text-center">
            <GlitchTitle text="STANDBY" className="text-2xl" as="h2" />
            <p className="caret-blink text-sm text-neon-100/70">
              Waiting for Game Master to start OP Day CTF
            </p>
            <p className="text-xs text-neon-100/40">
              Decode the physical whiteboard cipher once the countdown ends — it holds your Level 1 password.
            </p>
          </div>
        </TerminalPanel>
      ) : (
        <div className="space-y-3">
          {Array.from({ length: passwordLevelsCount }, (_, i) => i + 1).map((levelNumber) => {
            const unlocked = status.unlockedLevels.includes(levelNumber);
            const clue = status.unlockedClues.find((c) => c.levelNumber === levelNumber);
            let state: LevelCardState = "locked";
            if (unlocked) state = "completed";
            else if (levelNumber === status.currentLevel) state = "active";

            return (
              <LevelCard
                key={levelNumber}
                levelNumber={levelNumber}
                state={state}
                locationClue={clue?.locationClue}
                wordReward={clue?.wordReward}
                hint={state === "active" ? status.activeHint : null}
                onClick={() => setActiveModalLevel(levelNumber)}
              />
            );
          })}

          {/* Final sentence-assembly stage */}
          <div
            onClick={() => status.finalUnlocked && !status.gameFinished && router.push("/final")}
            className={`terminal-panel rounded-lg p-4 transition-colors ${
              status.finalUnlocked && !status.gameFinished
                ? "cursor-pointer border-cyan-400/50 hover:border-cyan-400"
                : "opacity-50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-widest text-cyan-400/80">Final Level</span>
              <Flag className="h-4 w-4 text-cyan-400" />
            </div>
            <p className="mt-2 text-sm text-neon-100/80">
              {status.finalUnlocked
                ? status.completed
                  ? "Sentence submitted. Awaiting result."
                  : "Assemble your collected words into the winning sentence →"
                : "Unlock every level above to reveal the final assembly console."}
            </p>
          </div>
        </div>
      )}

      {activeModalLevel !== null && (
        <PasswordModal
          levelNumber={activeModalLevel}
          onClose={() => setActiveModalLevel(null)}
          onUnlocked={() => {
            setActiveModalLevel(null);
            refresh();
          }}
        />
      )}

      <div className="mt-auto pt-4 text-center">
        <Link href="/final" className="text-xs uppercase tracking-widest text-neon-100/30 hover:text-cyan-400">
          Go to final assembly →
        </Link>
      </div>
    </main>
  );
}
