"use client";

// Sounds auto-discover from public/sounds/<category>/ (wrong_pass, right_pass,
// help, winning, intro, outro, button, settings, hacking, alert, resolve, art) via
// GET /api/sounds/<category> — drop a file in, no registration needed. The
// one-shot categories fall back to a synthesized chime when empty; the
// full-track categories (intro, outro, settings) just stay silent with no assets.

import { getSettings, subscribeToSettings } from "@/lib/settings";

type Category =
  | "wrong_pass"
  | "right_pass"
  | "help"
  | "winning"
  | "intro"
  | "outro"
  | "button"
  | "settings"
  | "hacking"
  | "alert"
  | "resolve"
  | "art";

const fileListCache = new Map<Category, string[]>();
const fileListInFlight = new Map<Category, Promise<string[]>>();

async function getFileList(category: Category): Promise<string[]> {
  const cached = fileListCache.get(category);
  if (cached) return cached;

  const pending = fileListInFlight.get(category);
  if (pending) return pending;

  const promise = fetch(`/api/sounds/${category}`, { cache: "no-store" })
    .then((res) => (res.ok ? res.json() : { files: [] }))
    .then((data: { files?: string[] }) => {
      const files = data.files ?? [];
      fileListCache.set(category, files);
      fileListInFlight.delete(category);
      return files;
    })
    .catch(() => {
      fileListInFlight.delete(category);
      return [];
    });

  fileListInFlight.set(category, promise);
  return promise;
}

const lastPlayed: Record<Category, string | null> = {
  wrong_pass: null,
  right_pass: null,
  help: null,
  winning: null,
  intro: null,
  outro: null,
  button: null,
  settings: null,
  hacking: null,
  alert: null,
  resolve: null,
  art: null,
};

function playFile(category: Category, filename: string, volume: number) {
  try {
    const audio = new Audio(`/sounds/${category}/${encodeURIComponent(filename)}`);
    audio.volume = volume;
    void audio.play().catch(() => {
      // Autoplay can be blocked before any user gesture has landed — safe to ignore.
    });
  } catch {
    // ignore
  }
}

async function playRandomFromCategory(category: Category, volume: number, fallback: () => void) {
  const files = await getFileList(category);
  if (files.length === 0) {
    fallback();
    return;
  }
  const candidates = files.length > 1 ? files.filter((f) => f !== lastPlayed[category]) : files;
  const filename = candidates[Math.floor(Math.random() * candidates.length)];
  lastPlayed[category] = filename;
  playFile(category, filename, volume);
}

let sharedContext: AudioContext | null = null;
function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedContext) sharedContext = new Ctor();
  if (sharedContext.state === "suspended") void sharedContext.resume();
  return sharedContext;
}

/** Plays a single synthesized note with a short attack/decay envelope. */
function tone(ctx: AudioContext, freq: number, startOffset: number, duration: number, volume: number, type: OscillatorType = "sine") {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const startAt = ctx.currentTime + startOffset;
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(volume, startAt + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.02);
}

function playSynthChime(
  notes: Array<[freq: number, offset: number, duration: number]>,
  volume: number,
  type: OscillatorType = "sine"
) {
  const ctx = getAudioContext();
  if (!ctx) return;
  for (const [freq, offset, duration] of notes) {
    tone(ctx, freq, offset, duration, volume, type);
  }
}

export function playRandomWrongPasswordSound(baseVolume = 0.6) {
  const settings = getSettings();
  if (!settings.sfxEnabled) return;
  const volume = baseVolume * settings.sfxVolume;
  void playRandomFromCategory("wrong_pass", volume, () => {
    // No files dropped in yet — a low, jarring double-buzz.
    playSynthChime(
      [
        [180, 0, 0.15],
        [140, 0.1, 0.2],
      ],
      volume
    );
  });
}

export function playRightPasswordSound(baseVolume = 0.5) {
  const settings = getSettings();
  if (!settings.sfxEnabled) return;
  const volume = baseVolume * settings.sfxVolume;
  void playRandomFromCategory("right_pass", volume, () => {
    // Two quick rising blips — a satisfying "unlocked" chirp.
    playSynthChime(
      [
        [880, 0, 0.12],
        [1318.5, 0.08, 0.18],
      ],
      volume
    );
  });
}

export function playWinningSound(baseVolume = 0.4) {
  const settings = getSettings();
  if (!settings.sfxEnabled) return;
  const volume = baseVolume * settings.sfxVolume;
  void playRandomFromCategory("winning", volume, () => {
    // A short ascending arpeggio fanfare.
    playSynthChime(
      [
        [523.25, 0, 0.2],
        [659.25, 0.15, 0.2],
        [783.99, 0.3, 0.2],
        [1046.5, 0.45, 0.5],
      ],
      volume
    );
  });
}

export function playHelpSound(baseVolume = 0.5) {
  const settings = getSettings();
  if (!settings.sfxEnabled) return;
  const volume = baseVolume * settings.sfxVolume;
  void playRandomFromCategory("help", volume, () => {
    // A short two-note "attention" chime.
    playSynthChime(
      [
        [660, 0, 0.15],
        [660, 0.2, 0.15],
      ],
      volume
    );
  });
}

/** For the team that just launched a sabotage or executed a swap. */
export function playHackingSound(baseVolume = 0.5) {
  const settings = getSettings();
  if (!settings.sfxEnabled) return;
  const volume = baseVolume * settings.sfxVolume;
  void playRandomFromCategory("hacking", volume, () => {
    // A fast descending run of digital blips.
    playSynthChime(
      [
        [900, 0, 0.05],
        [700, 0.05, 0.05],
        [500, 0.1, 0.05],
        [350, 0.15, 0.09],
      ],
      volume,
      "square"
    );
  });
}

/** For the team that just got sabotaged, or whose board just got swapped by someone else. */
export function playAlertSound(baseVolume = 0.55) {
  const settings = getSettings();
  if (!settings.sfxEnabled) return;
  const volume = baseVolume * settings.sfxVolume;
  void playRandomFromCategory("alert", volume, () => {
    // A two-tone klaxon.
    playSynthChime(
      [
        [1000, 0, 0.18],
        [700, 0.18, 0.18],
        [1000, 0.36, 0.18],
        [700, 0.54, 0.22],
      ],
      volume,
      "sawtooth"
    );
  });
}

/** For the team that just cleared a sabotage — their own decode, or an admin bypass/revert. */
export function playResolveSound(baseVolume = 0.5) {
  const settings = getSettings();
  if (!settings.sfxEnabled) return;
  const volume = baseVolume * settings.sfxVolume;
  void playRandomFromCategory("resolve", volume, () => {
    // A short settling two-note "all clear" chime.
    playSynthChime(
      [
        [520, 0, 0.16],
        [780, 0.12, 0.22],
      ],
      volume
    );
  });
}

/**
 * A looping background-music channel for one category — start() is
 * idempotent (safe to call repeatedly, e.g. on every status poll, without
 * restarting an already-playing track) and reacts live to the Music
 * setting (mute/volume) without needing to be restarted.
 */
function createLoopingMusicChannel(category: Category) {
  let audio: HTMLAudioElement | null = null;
  let baseVolume = 0.35;

  function applySettings() {
    if (!audio) return;
    const settings = getSettings();
    if (!settings.musicEnabled) {
      audio.pause();
      return;
    }
    audio.volume = baseVolume * settings.musicVolume;
    if (audio.paused) {
      void audio.play().catch(() => {
        // Still blocked (no user gesture yet) — the next start() call retries.
      });
    }
  }

  if (typeof window !== "undefined") {
    subscribeToSettings(applySettings);
  }

  async function start(volume = 0.35) {
    baseVolume = volume;
    if (audio) {
      applySettings();
      return;
    }
    const settings = getSettings();
    if (!settings.musicEnabled) return;

    const files = await getFileList(category);
    if (files.length === 0) return;
    const filename = files[Math.floor(Math.random() * files.length)];
    try {
      const el = new Audio(`/sounds/${category}/${encodeURIComponent(filename)}`);
      el.loop = true;
      el.volume = baseVolume * settings.musicVolume;
      audio = el;
      void el.play().catch(() => {
        // Autoplay blocked before any user gesture landed — safe to ignore.
        audio = null;
      });
    } catch {
      audio = null;
    }
  }

  function stop() {
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    audio = null;
  }

  return { start, stop };
}

const introChannel = createLoopingMusicChannel("intro");
/** Loops while a team waits on the Game Master to start the hunt. */
export const startIntroMusic = introChannel.start;
export const stopIntroMusic = introChannel.stop;

const settingsChannel = createLoopingMusicChannel("settings");
/** Loops while a player has /settings open. */
export const startSettingsMusic = settingsChannel.start;
export const stopSettingsMusic = settingsChannel.stop;

/** Fire-and-forget, plays once — call ~7s after a team fully completes the hunt. */
export function playOutroMusic(baseVolume = 0.5) {
  const settings = getSettings();
  if (!settings.musicEnabled) return;
  const volume = baseVolume * settings.musicVolume;
  void playRandomFromCategory("outro", volume, () => {
    // No outro track dropped in yet — nothing meaningful to synthesize.
  });
}

/** A tap/click on an interactive ASCII portrait (e.g. the winner page's ripple effect). */
export function playArtTouchSound(baseVolume = 0.4) {
  const settings = getSettings();
  if (!settings.sfxEnabled) return;
  const volume = baseVolume * settings.sfxVolume;
  void playRandomFromCategory("art", volume, () => {
    // No file dropped in yet — a quick glitchy tick.
    playSynthChime([[1200, 0, 0.05], [900, 0.04, 0.06]], volume, "square");
  });
}

/** Generic UI click feedback — see ClickSound.tsx for where this fires globally. */
export function playButtonClickSound(baseVolume = 0.3) {
  const settings = getSettings();
  if (!settings.sfxEnabled) return;
  const volume = baseVolume * settings.sfxVolume;
  void playRandomFromCategory("button", volume, () => {
    playSynthChime([[1400, 0, 0.045]], volume);
  });
}
