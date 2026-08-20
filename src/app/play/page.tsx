"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Trophy, Flag, Pencil, Check, X, Settings } from "lucide-react";
import { useTeamStatus } from "@/hooks/useTeamStatus";
import { useGlitchKey } from "@/hooks/useGlitchKey";
import GlitchTitle from "@/components/GlitchTitle";
import TerminalPanel from "@/components/TerminalPanel";
import LevelCard, { LevelCardState, WordVerifyResult } from "@/components/LevelCard";
import PasswordModal from "@/components/PasswordModal";
import TeamAvatar from "@/components/TeamAvatar";
import TeamStatsPanel from "@/components/TeamStatsPanel";
import ActiveSessionPanel from "@/components/ActiveSessionPanel";
import PlayerStatsPanel from "@/components/PlayerStatsPanel";
import GameRules from "@/components/GameRules";
import SabotageModal from "@/components/SabotageModal";
import ColorPicker from "@/components/ColorPicker";
import { getPlayerName } from "@/lib/playerIdentity";
import { startIntroMusic, stopIntroMusic } from "@/lib/sfx";
import { playHelpFeedback, playWrongWordFeedback, playRightFeedback, playAlertFeedback } from "@/lib/gameFeedback";

export default function PlayPage() {
  const router = useRouter();
  const { status, loading, unauthorized, refresh } = useTeamStatus(3000);
  const [activeModalLevel, setActiveModalLevel] = useState<number | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [requestingHint, setRequestingHint] = useState(false);
  const [hintError, setHintError] = useState<string | null>(null);
  const lastHintRef = useRef<string | null>(null);
  const lastSabotageIdRef = useRef<string | null>(null);
  const lastSwapAlertRef = useRef<string | null>(null);

  useEffect(() => {
    if (unauthorized) router.replace("/register");
  }, [unauthorized, router]);

  useEffect(() => {
    if (status?.completed) router.replace("/winner");
  }, [status, router]);

  useEffect(() => {
    if (status?.activeHint && status.activeHint !== lastHintRef.current) {
      playHelpFeedback();
    }
    lastHintRef.current = status?.activeHint ?? null;
  }, [status?.activeHint]);

  // Alerts the team being sabotaged or having its board swapped by someone
  // else. The team that performed the action already gets its own immediate
  // "hacking" sound from the button click, so this only needs to fire for
  // the passive, affected side.
  useEffect(() => {
    const sabotageId = status?.activeSabotage?.id ?? null;
    if (sabotageId && sabotageId !== lastSabotageIdRef.current) {
      playAlertFeedback();
    }
    lastSabotageIdRef.current = sabotageId;
  }, [status?.activeSabotage?.id]);

  useEffect(() => {
    const swapAlertId = status?.swapAlert ?? null;
    if (swapAlertId && swapAlertId !== lastSwapAlertRef.current) {
      playAlertFeedback();
    }
    lastSwapAlertRef.current = swapAlertId;
  }, [status?.swapAlert]);

  const isWaitingForStart = Boolean(
    status &&
      !status.gameActive &&
      status.currentLevel === 1 &&
      status.unlockedLevels.length <= 1 &&
      !status.gameFinished
  );

  // Intro music loops for a team parked on the standby screen, and stops the
  // instant the Game Master starts the hunt (or this page unmounts).
  useEffect(() => {
    if (isWaitingForStart) startIntroMusic();
    else stopIntroMusic();
    return () => stopIntroMusic();
  }, [isWaitingForStart]);

  const standbyGlitch = useGlitchKey(isWaitingForStart);

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="caret-blink text-neon-500">loading team state</p>
      </main>
    );
  }

  if (!status) return null;

  const passwordLevelsCount = status.totalLevels - 1;

  async function leaveTeam() {
    if (!confirmLeave) {
      setConfirmLeave(true);
      setTimeout(() => setConfirmLeave(false), 4000);
      return;
    }
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

  async function saveColor(color: string) {
    const res = await fetch("/api/team/color", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ color }),
    });
    if (res.ok) {
      setColorPickerOpen(false);
      refresh();
    }
  }

  async function requestHint() {
    setRequestingHint(true);
    setHintError(null);
    try {
      const res = await fetch("/api/game/help", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setHintError(data.error ?? "Couldn't get a hint.");
        return;
      }
      refresh();
    } finally {
      setRequestingHint(false);
    }
  }

  async function verifyWord(levelNumber: number, word: string): Promise<WordVerifyResult> {
    const res = await fetch("/api/game/verify-word", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ levelNumber, word }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      playWrongWordFeedback();
      return { ok: false, error: data.error ?? "Wrong word." };
    }
    playRightFeedback();
    refresh();
    return { ok: true };
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-6 px-4 py-8 lg:grid-cols-[260px_1fr_320px] lg:items-start">
      {status.activeSabotage && <SabotageModal sabotage={status.activeSabotage} onResolved={refresh} />}

      <aside className="lg:sticky lg:top-8 lg:order-1">
        <PlayerStatsPanel
          helpCreditsRemaining={status.helpCreditsRemaining}
          sabotageCreditsRemaining={status.sabotageCreditsRemaining}
          sabotageCooldownRemainingMs={status.sabotageCooldownRemainingMs}
          swapCardEnabled={status.swapCardEnabled}
          swapCardUsed={status.swapCardUsed}
          ownTeamId={status.team.id}
          gameActive={status.gameActive}
          onSabotageLaunched={refresh}
          onSwapCompleted={refresh}
        />
      </aside>

      <div className="flex min-w-0 flex-col gap-6 lg:order-2">
      <header className="flex items-center justify-between gap-3">
        <div className="relative flex min-w-0 items-center gap-3">
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
                <button
                  onClick={() => setColorPickerOpen((v) => !v)}
                  aria-label="Change squad theme color"
                  title="Change squad theme color"
                  className="relative h-4 w-4 shrink-0 rounded-full transition-transform hover:scale-110"
                  style={{
                    backgroundColor: status.team.color,
                    boxShadow: `0 0 8px 1px ${status.team.color}99`,
                  }}
                />
              </h1>
            )}
            {renameError && <p className="text-xs text-danger-400">{renameError}</p>}
          </div>

          <AnimatePresence>
            {colorPickerOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="terminal-panel absolute left-0 top-full z-20 mt-2 rounded-lg p-3"
              >
                <ColorPicker value={status.team.color} onChange={saveColor} size="sm" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <Link href="/settings" className="text-neon-100/40 hover:text-cyan-400" aria-label="Settings">
            <Settings className="h-4 w-4" />
          </Link>
          <button
            onClick={leaveTeam}
            data-sfx-nav
            className={`flex items-center gap-1.5 text-xs ${
              confirmLeave ? "text-danger-400" : "text-neon-100/40 hover:text-danger-400"
            }`}
          >
            <LogOut className="h-4 w-4" /> {confirmLeave ? "Confirm leave?" : "Leave Team"}
          </button>
        </div>
      </header>

      {status.gameFinished && (
        <TerminalPanel className="border-amber-400/40">
          <p className="flex items-center gap-2 text-amber-400">
            <Trophy className="h-5 w-5" /> The Game Master has ended the hunt. Thanks for playing, agents.
          </p>
        </TerminalPanel>
      )}

      {/* Same glitch-reveal keyframe the admin dashboard uses when
          switching tabs. Reused here (fresh key remounting the div, not
          Framer Motion) so the standby↔level-list swap feels consistent
          with the rest of the app instead of popping in instantly. */}
      <div key={standbyGlitch.key} className={standbyGlitch.className}>
      {isWaitingForStart ? (
        <div className="space-y-6">
          <TerminalPanel title="standby.exe">
            <div className="space-y-3 py-6 text-center">
              <GlitchTitle text="STANDBY" className="text-2xl" as="h2" />
              <p className="caret-blink text-sm text-neon-100/70">
                Waiting for Game Master to start OP Day CTF
              </p>
              <p className="text-xs text-neon-100/40">
                Decode the physical whiteboard cipher once the countdown ends. It holds your Level 1 password.
              </p>
            </div>
          </TerminalPanel>
          <GameRules />
        </div>
      ) : (
        <div className="space-y-3">
          {hintError && (
            <p className="rounded-md border border-danger-400/40 bg-danger-400/10 px-3 py-2 text-sm text-danger-400">
              {hintError}
            </p>
          )}
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
                cipherMessage={clue?.cipherMessage}
                hintAvailable={status.hintAvailable}
                helpCreditsRemaining={status.helpCreditsRemaining}
                onRequestHint={requestHint}
                requestingHint={requestingHint}
                onVerifyWord={verifyWord}
                onClick={() => setActiveModalLevel(levelNumber)}
              />
            );
          })}

          <div
            onClick={() => status.finalUnlocked && !status.gameFinished && router.push("/final")}
            data-sfx-nav={status.finalUnlocked && !status.gameFinished ? true : undefined}
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
      </div>

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

      <aside className="lg:sticky lg:top-8 lg:order-3">
        <TeamStatsPanel highlightTeamNumber={status.team.teamNumber} />
        <ActiveSessionPanel selfName={getPlayerName()} />
      </aside>
    </main>
  );
}
