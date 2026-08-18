"use client";

import { useSyncExternalStore } from "react";
import { Volume2, VolumeX, Video, VideoOff, Music, Music4, Play } from "lucide-react";
import { getSettings, setSettings, subscribeToSettingsStore, DEFAULT_SETTINGS, type OpDaySettings } from "@/lib/settings";
import { playRightPasswordSound } from "@/lib/sfx";

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

/** Shared by /settings (players) and the admin dashboard's Sound tab — same device-local prefs either way. */
export default function AudioVideoSettings() {
  const settings: OpDaySettings = useSyncExternalStore(subscribeToSettingsStore, getSettings, () => DEFAULT_SETTINGS);

  function update(patch: Partial<OpDaySettings>) {
    setSettings(patch);
  }

  return (
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
          <Slider value={settings.sfxVolume} onChange={(v) => update({ sfxVolume: v })} disabled={!settings.sfxEnabled} />
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
        <Slider value={settings.musicVolume} onChange={(v) => update({ musicVolume: v })} disabled={!settings.musicEnabled} />
      </div>
    </div>
  );
}
