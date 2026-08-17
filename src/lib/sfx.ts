"use client";

// Sound effects are segregated by moment, and auto-discovered from disk —
// just drop an .mp3 into the matching folder and it starts playing, no
// filename to register anywhere:
// public/sounds/wrong_pass/  — an incorrect password
// public/sounds/right_pass/  — a level unlocking correctly
// public/sounds/help/        — the Game Master releasing a hint
// public/sounds/winning/     — a team finishing the whole hunt
//
// Discovery happens via GET /api/sounds/<category>, which lists whatever
// audio files actually exist in that folder (src/app/api/sounds/[category]).
// A category with no files falls back to a small synthesized chime, so the
// feature works with zero assets.

type Category = "wrong_pass" | "right_pass" | "help" | "winning";

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

export function playRandomWrongPasswordSound(volume = 0.6) {
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

export function playRightPasswordSound(volume = 0.5) {
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

export function playWinningSound(volume = 0.4) {
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

export function playHelpSound(volume = 0.5) {
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
