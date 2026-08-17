"use client";

// Meme sound effects that fire on a wrong password attempt. One is picked at
// random each time, weighted so nothing over-repeats back-to-back.
const WRONG_PASSWORD_SOUNDS = [
  "/sounds/bruh.mp3",
  "/sounds/dramatic-fart.mp3",
  "/sounds/fahhh.mp3",
  "/sounds/goat-scream.mp3",
  "/sounds/roblox-oof.mp3",
  "/sounds/yeet.mp3",
];

let lastPlayed: string | null = null;

export function playRandomWrongPasswordSound(volume = 0.6) {
  if (typeof Audio === "undefined") return;

  const pool = WRONG_PASSWORD_SOUNDS.length > 1 ? WRONG_PASSWORD_SOUNDS.filter((s) => s !== lastPlayed) : WRONG_PASSWORD_SOUNDS;
  const src = pool[Math.floor(Math.random() * pool.length)];
  lastPlayed = src;

  try {
    const audio = new Audio(src);
    audio.volume = volume;
    void audio.play().catch(() => {
      // Autoplay can be blocked before any user gesture has landed — safe to ignore.
    });
  } catch {
    // ignore
  }
}
