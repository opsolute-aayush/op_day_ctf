"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, Trophy, Flag, Pencil, Check, X } from "lucide-react";
import { useTeamStatus } from "@/hooks/useTeamStatus";
import GlitchTitle from "@/components/GlitchTitle";
import TerminalPanel from "@/components/TerminalPanel";
import LevelCard, { LevelCardState } from "@/components/LevelCard";
import PasswordModal from "@/components/PasswordModal";
import TeamAvatar from "@/components/TeamAvatar";
import TeamStatsPanel from "@/components/TeamStatsPanel";
import { playHelpSound } from "@/lib/sfx";

export default function PlayPage() {
  const router = useRouter();
  const { status, loading, unauthorized, refresh } = useTeamStatus(3000);
  const [activeModalLevel, setActiveModalLevel] = useState<number | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const lastHintRef = useRef<string | null>(null);

  useEffect(() => {
    if (unauthorized) router.replace("/register");
  }, [unauthorized, router]);

  useEffect(() => {
    if (status?.completed) router.replace("/winner");
  }, [status, router]);

  useEffect(() => {
    if (status?.activeHint && status.activeHint !== lastHintRef.current) {
      playHelpSound();
    }
    lastHintRef.current = status?.activeHint ?? null;
  }, [status?.activeHint]);

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

  function startRename() {
    setNameDraft(status!.team.name);
    setRenameError(null);
    setRenaming(true);
  }

  async function saveRename() {
    if (nameDraft.trim().length < 1) {
      setRenameError("Enter a name.");
      return;
    }
    const res = await fetch("/api/team/name", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nameDraft.trim() }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setRenameError(data.error ?? "Couldn't rename.");
      return;
    }
    setRenaming(false);
    refresh();
  }

  return (
    <main className="mx-auto grid w-full max-w-5xl flex-1 grid-cols-1 gap-6 px-4 py-8 lg:grid-cols-[1fr_320px] lg:items-start">
      <div className="flex min-w-0 flex-col gap-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <TeamAvatar teamNumber={status.team.teamNumber} color={status.team.color} />
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-neon-100/50">Squad #{status.team.teamNumber}</p>
            {renaming ? (
              <div className="flex items-center gap-1.5">
                <input
                  autoFocus
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  maxLength={60}
                  className="w-36 rounded border border-neon-500/50 bg-void-2 px-2 py-1 font-display text-sm uppercase tracking-widest text-neon-100 outline-none focus:border-neon-500"
                />
                <button onClick={saveRename} className="text-neon-500 hover:text-neon-400" aria-label="Save name">
                  <Check className="h-4 w-4" />
                </button>
                <button onClick={() => setRenaming(false)} className="text-neon-100/40 hover:text-danger-400" aria-label="Cancel">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <h1
                className="flex items-center gap-2 truncate font-display text-xl uppercase tracking-widest"
                style={{ color: status.team.color }}
              >
                <span className="truncate">{status.team.name}</span>
                <button onClick={startRename} className="text-neon-100/30 hover:text-neon-400" aria-label="Rename squad">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </h1>
            )}
            {renameError && <p className="text-xs text-danger-400">{renameError}</p>}
          </div>
        </div>
        <button onClick={logout} className="flex shrink-0 items-center gap-1.5 text-xs text-neon-100/40 hover:text-danger-400">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </header>

      {status.gameFinished && (
        <TerminalPanel className="border-amber-400/40">
          <p className="flex items-center gap-2 text-amber-400">
            <Trophy className="h-5 w-5" /> The Game Master has ended the hunt. Thanks for playing, agents.
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
          {Array.from({ length: passwordLevelsCount }, (_, i) => i + 1).map((levelNumber, index) => {
            const unlocked = status.unlockedLevels.includes(levelNumber);
            const clue = status.unlockedClues.find((c) => c.levelNumber === levelNumber);
            let state: LevelCardState = "locked";
            if (unlocked) state = "completed";
            else if (levelNumber === status.currentLevel) state = "active";

            return (
              <LevelCard
                key={levelNumber}
                index={index}
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
                ? "Assemble your collected words into the winning sentence →"
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
      </div>

      <aside className="lg:sticky lg:top-8">
        <TeamStatsPanel highlightTeamNumber={status.team.teamNumber} />
      </aside>
    </main>
  );
}
