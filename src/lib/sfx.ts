"use client";

// Sound effects are segregated by moment so they're easy to swap out:
// public/sounds/wrong_pass/  — an incorrect password
// public/sounds/right_pass/  — a level unlocking correctly
// public/sounds/winning/     — a team finishing the whole hunt
// public/sounds/help/        — the Game Master releasing a hint
//
// Drop your own .mp3 files into a folder and list the filenames below
// (bare filename only — spaces/punctuation are fine, they get URL-encoded
// automatically). Any category left empty falls back to a small synthesized
// chime instead, so the feature works with zero assets.

const WRONG_PASSWORD_SOUNDS = [
  "Ack Meme Sound Effect.mp3",
  "Chicken on tree screaming viral sound effect  Meme sound.mp3",
  "Huh sound effect.mp3",
  "bruh.mp3",
  "dramatic-fart.mp3",
  "fahhh.mp3",
  "goat-scream.mp3",
  "roblox-oof.mp3",
];

const RIGHT_PASSWORD_SOUNDS = ["Chalo Meme Sound Effect.mp3", "Wow sound effect.mp3", "YOOOOOO SOUND EFFECT.mp3"];

const WINNING_SOUNDS: string[] = [];

const HELP_SOUNDS = ["Help, Help Me! Sound effect from tiktok..mp3"];

const lastPlayed: Record<string, string | null> = {};

function playRandomFile(folder: string, filenames: string[], category: string, volume: number) {
  if (typeof Audio === "undefined" || filenames.length === 0) return false;

  const candidates = filenames.length > 1 ? filenames.filter((s) => s !== lastPlayed[category]) : filenames;
  const filename = candidates[Math.floor(Math.random() * candidates.length)];
  lastPlayed[category] = filename;

  try {
    const audio = new Audio(`/sounds/${folder}/${encodeURIComponent(filename)}`);
    audio.volume = volume;
    void audio.play().catch(() => {
      // Autoplay can be blocked before any user gesture has landed — safe to ignore.
    });
    return true;
  } catch {
    return false;
  }
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

export function playRandomWrongPasswordSound(volume = 0.6) {
  playRandomFile("wrong_pass", WRONG_PASSWORD_SOUNDS, "wrong", volume);
}

export function playRightPasswordSound(volume = 0.5) {
  if (playRandomFile("right_pass", RIGHT_PASSWORD_SOUNDS, "right", volume)) return;
  // Two quick rising blips — a satisfying "unlocked" chirp.
  playSynthChime(
    [
      [880, 0, 0.12],
      [1318.5, 0.08, 0.18],
    ],
    volume
  );
}

export function playWinningSound(volume = 0.4) {
  if (playRandomFile("winning", WINNING_SOUNDS, "winning", volume)) return;
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
}

export function playHelpSound(volume = 0.5) {
  if (playRandomFile("help", HELP_SOUNDS, "help", volume)) return;
  // A short two-note "attention" chime.
  playSynthChime(
    [
      [660, 0, 0.15],
      [660, 0.2, 0.15],
    ],
    volume
  );
}
