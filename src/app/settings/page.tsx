"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowLeft, User, Check, Hash } from "lucide-react";
import GlitchTitle from "@/components/GlitchTitle";
import TerminalPanel from "@/components/TerminalPanel";
import InputField from "@/components/InputField";
import NeonButton from "@/components/NeonButton";
import AsciiOperative from "@/components/AsciiOperative";
import AudioVideoSettings from "@/components/AudioVideoSettings";
import { getPlayerName, setPlayerName, subscribeToPlayerNameStore } from "@/lib/playerIdentity";
import { getSavedSessionCode, subscribeToSessionCodeStore } from "@/lib/sessionIdentity";
import { startSettingsMusic, stopSettingsMusic } from "@/lib/sfx";

export default function SettingsPage() {
  // useSyncExternalStore (not an effect) so SSR/first-hydration (no
  // localStorage) and the real client value reconcile without a
  // setState-after-mount flash. nameOverride only kicks in once the user
  // actually edits the field.
  const persistedName = useSyncExternalStore(subscribeToPlayerNameStore, getPlayerName, () => "");
  const [nameOverride, setNameOverride] = useState<string | null>(null);
  const nameDraft = nameOverride ?? persistedName;
  const [nameError, setNameError] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const sessionCode = useSyncExternalStore(subscribeToSessionCodeStore, getSavedSessionCode, () => "");

  // Loops for as long as this page is open, and stops the moment it's left.
  useEffect(() => {
    startSettingsMusic();
    return () => stopSettingsMusic();
  }, []);

  async function saveName() {
    const trimmed = nameDraft.trim();
    if (trimmed.length < 1) {
      setNameError("Enter a name.");
      return;
    }
    setNameError(null);
    setSavingName(true);
    setPlayerName(trimmed);
    setNameOverride(null);
    try {
      // 404/401 here just means this device isn't currently joined to a
      // team. The local name above is still the source of truth and will
      // be used the next time they join.
      await fetch("/api/team/member-name", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
    } catch {
      // Offline: local name is still saved.
    } finally {
      setSavingName(false);
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2000);
    }
  }

  return (
    <>
      {/* AsciiOperative is a fixed background layer, independent of this
          content's own centering below. */}
      <AsciiOperative />

      <main className="flex w-full flex-1 flex-col gap-6 px-4 py-8">
        <div className="mx-auto w-full max-w-4xl space-y-6 lg:max-w-md lg:-translate-x-6 lg:translate-y-4">
          <header className="flex items-center gap-3">
            <Link href="/play" className="text-neon-100/40 hover:text-neon-400" aria-label="Back to play">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <GlitchTitle text="Settings" className="text-2xl" as="h1" />
          </header>

          {sessionCode && (
            <TerminalPanel title="session.cfg">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-neon-100/80">
                  <Hash className="h-4 w-4 text-neon-500" /> Session Code
                </span>
                <span className="font-display text-lg tracking-widest text-neon-500">{sessionCode}</span>
              </div>
            </TerminalPanel>
          )}

          <TerminalPanel title="identity.cfg">
            <div className="space-y-2">
              <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-neon-100/80">
                <User className="h-4 w-4 text-neon-500" /> Display Name
              </span>
              <p className="text-xs text-neon-100/40">
                Used everywhere you show up: your squad roster and the active-agents list.
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <InputField
                    value={nameDraft}
                    onChange={(e) => setNameOverride(e.target.value)}
                    maxLength={40}
                    autoComplete="off"
                    className="text-center font-display text-lg tracking-wide"
                  />
                </div>
                <NeonButton onClick={saveName} disabled={savingName} className="shrink-0">
                  {savingName ? "Saving…" : nameSaved ? <Check className="h-4 w-4" /> : "Save"}
                </NeonButton>
              </div>
              {nameError && <p className="text-xs text-danger-400">{nameError}</p>}
            </div>
          </TerminalPanel>

          <TerminalPanel title="audio-video.cfg">
            <AudioVideoSettings />
          </TerminalPanel>

          <p className="text-center text-xs text-neon-100/30">
            Saved on this device only. Every teammate sets their own.
          </p>
        </div>
      </main>
    </>
  );
}
