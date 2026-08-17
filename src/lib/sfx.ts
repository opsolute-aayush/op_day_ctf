"use client";

// Sounds auto-discover from public/sounds/<category>/ (wrong_pass, right_pass,
// help, winning, intro, outro) via GET /api/sounds/<category> — drop a file
// in, no registration needed. The four one-shot categories fall back to a
// synthesized chime when empty; intro/outro (full music) just stay silent.

import { getSettings, subscribeToSettings } from "@/lib/settings";

type Category = "wrong_pass" | "right_pass" | "help" | "winning" | "intro" | "outro";

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

function playSynthChime(notes: Array<[freq: number, offset: number, duration: number]>, volume: number) {
  const ctx = getAudioContext();
  if (!ctx) return;
  for (const [freq, offset, duration] of notes) {
    tone(ctx, freq, offset, duration, volume);
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

let introAudio: HTMLAudioElement | null = null;
let introBaseVolume = 0.35;

function applyMusicSettingsToIntro() {
  if (!introAudio) return;
  const settings = getSettings();
  if (!settings.musicEnabled) {
    introAudio.pause();
    return;
  }
  introAudio.volume = introBaseVolume * settings.musicVolume;
  if (introAudio.paused) {
    void introAudio.play().catch(() => {
      // Still blocked (no user gesture yet) — the next status poll retries.
    });
  }
}

if (typeof window !== "undefined") {
  subscribeToSettings(applyMusicSettingsToIntro);
}

/**
 * Loops background music while a team waits on the Game Master to start the
 * hunt. Idempotent — safe to call on every status poll without restarting
 * the track, since it no-ops while a track is already playing.
 */
export async function startIntroMusic(baseVolume = 0.35) {
  introBaseVolume = baseVolume;
  if (introAudio) {
    applyMusicSettingsToIntro();
    return;
  }
  const settings = getSettings();
  if (!settings.musicEnabled) return;

  const files = await getFileList("intro");
  if (files.length === 0) return;
  const filename = files[Math.floor(Math.random() * files.length)];
  try {
    const audio = new Audio(`/sounds/intro/${encodeURIComponent(filename)}`);
    audio.loop = true;
    audio.volume = introBaseVolume * settings.musicVolume;
    introAudio = audio;
    void audio.play().catch(() => {
      // Autoplay blocked before any user gesture landed — safe to ignore.
      introAudio = null;
    });
  } catch {
    introAudio = null;
  }
}

export function stopIntroMusic() {
  if (!introAudio) return;
  introAudio.pause();
  introAudio.currentTime = 0;
  introAudio = null;
}

/** Fire-and-forget, plays once — call ~7s after a team fully completes the hunt. */
export function playOutroMusic(baseVolume = 0.5) {
  const settings = getSettings();
  if (!settings.musicEnabled) return;
  const volume = baseVolume * settings.musicVolume;
  void playRandomFromCategory("outro", volume, () => {
    // No outro track dropped in yet — nothing meaningful to synthesize.
  });
}
