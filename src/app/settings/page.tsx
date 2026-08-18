"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowLeft, Volume2, VolumeX, Video, VideoOff, Music, Music4, Play, User, Check } from "lucide-react";
import GlitchTitle from "@/components/GlitchTitle";
import TerminalPanel from "@/components/TerminalPanel";
import InputField from "@/components/InputField";
import NeonButton from "@/components/NeonButton";
import AsciiOperative from "@/components/AsciiOperative";
import { getSettings, setSettings, subscribeToSettingsStore, DEFAULT_SETTINGS, type OpDaySettings } from "@/lib/settings";
import { getPlayerName, setPlayerName, subscribeToPlayerNameStore } from "@/lib/playerIdentity";
import { playRightPasswordSound, startSettingsMusic, stopSettingsMusic } from "@/lib/sfx";

function Toggle({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${
        on ? "border-neon-500 bg-neon-500/30" : "border-panel-border bg-void-2"
      }`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full transition-all ${
          on ? "left-6 bg-neon-500" : "left-0.5 bg-neon-100/40"
        }`}
      />
    </button>
  );
}

function Slider({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <input
      type="range"
      min={0}
      max={1}
      step={0.05}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-panel-border accent-neon-500 disabled:cursor-not-allowed disabled:opacity-30"
    />
  );
}

export default function SettingsPage() {
  const settings: OpDaySettings = useSyncExternalStore(subscribeToSettingsStore, getSettings, () => DEFAULT_SETTINGS);

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

  function update(patch: Partial<OpDaySettings>) {
    setSettings(patch);
  }

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
      // team — the local name above is still the source of truth and will
      // be used the next time they join.
      await fetch("/api/team/member-name", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
    } catch {
      // Offline — local name is still saved.
    } finally {
      setSavingName(false);
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2000);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex items-center gap-3">
        <Link href="/play" className="text-neon-100/40 hover:text-neon-400" aria-label="Back to play">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <GlitchTitle text="Settings" className="text-2xl" as="h1" />
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_260px] lg:items-start">
      <div className="space-y-6 lg:order-1">
      <TerminalPanel title="identity.cfg">
        <div className="space-y-2">
          <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-neon-100/80">
            <User className="h-4 w-4 text-neon-500" /> Display Name
          </span>
          <p className="text-xs text-neon-100/40">
            Used everywhere you show up — your squad roster and the active-agents list.
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
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-neon-100/80">
                {settings.sfxEnabled ? (
                  <Volume2 className="h-4 w-4 text-neon-500" />
                ) : (
                  <VolumeX className="h-4 w-4 text-neon-100/30" />
                )}
                Sound Effects
              </span>
              <Toggle on={settings.sfxEnabled} onToggle={() => update({ sfxEnabled: !settings.sfxEnabled })} label="Toggle sound effects" />
            </div>
            <p className="text-xs text-neon-100/40">Password results, hints, and the winning stinger.</p>
            <div className="flex items-center gap-3">
              <Slider
                value={settings.sfxVolume}
                onChange={(v) => update({ sfxVolume: v })}
                disabled={!settings.sfxEnabled}
              />
              <button
                type="button"
                onClick={() => playRightPasswordSound()}
                disabled={!settings.sfxEnabled}
                data-sfx-exempt
                className="flex shrink-0 items-center gap-1 rounded-md border border-neon-500/40 px-2 py-1 text-[11px] uppercase tracking-widest text-neon-400 hover:bg-neon-500/10 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Play className="h-3 w-3" /> Test
              </button>
            </div>
          </div>

          <div className="h-px bg-panel-border" />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-neon-100/80">
                {settings.videoEnabled ? (
                  <Video className="h-4 w-4 text-neon-500" />
                ) : (
                  <VideoOff className="h-4 w-4 text-neon-100/30" />
                )}
                Video Clips
              </span>
              <Toggle on={settings.videoEnabled} onToggle={() => update({ videoEnabled: !settings.videoEnabled })} label="Toggle video clips" />
            </div>
            <p className="text-xs text-neon-100/40">
              The pop-up clip in the corner (and the green-screen winning clip) on password/hint/win events.
            </p>
          </div>

          <div className="h-px bg-panel-border" />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-neon-100/80">
                {settings.musicEnabled ? (
                  <Music className="h-4 w-4 text-neon-500" />
                ) : (
                  <Music4 className="h-4 w-4 text-neon-100/30" />
                )}
                Background Music
              </span>
              <Toggle on={settings.musicEnabled} onToggle={() => update({ musicEnabled: !settings.musicEnabled })} label="Toggle background music" />
            </div>
            <p className="text-xs text-neon-100/40">
              Standby-screen intro loop, the post-victory outro track, and this page&apos;s own ambient loop.
            </p>
            <Slider
              value={settings.musicVolume}
              onChange={(v) => update({ musicVolume: v })}
              disabled={!settings.musicEnabled}
            />
          </div>
        </div>
      </TerminalPanel>

      <p className="text-center text-xs text-neon-100/30">Saved on this device only — every teammate sets their own.</p>
      </div>

      <aside className="lg:sticky lg:top-8 lg:order-2">
        <AsciiOperative />
      </aside>
      </div>
    </main>
  );
}
