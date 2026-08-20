// Maps each difficulty to its pool of implemented cipher techniques (see
// cipher/<difficulty>/*.md for the specs) and picks one at random on every
// call, so the admin dashboard never encodes the same passphrase the same
// way twice. Medium/Hard/Intense stay empty until their specs land in
// cipher/medium, cipher/hard, cipher/intense.

import type { CipherMethod, CipherOutput } from "./types";
import { caesarHexBinaryCipher } from "./caesarHexBinary";
import { atbashReverseAsciiCipher } from "./atbashReverseAscii";

export type Difficulty = "easy" | "medium" | "hard" | "intense";

export const CIPHER_METHODS: Record<Difficulty, CipherMethod[]> = {
  easy: [caesarHexBinaryCipher, atbashReverseAsciiCipher],
  medium: [],
  hard: [],
  intense: [],
};

export interface CipherRunResult extends CipherOutput {
  methodId: string;
  methodLabel: string;
  layers: string[];
}

/** Runs a randomly chosen technique from `difficulty`'s pool against `target` (+4 decoys). */
export function generateCipherForDifficulty(
  difficulty: Difficulty,
  target: string,
  decoys?: string[]
): CipherRunResult {
  const methods = CIPHER_METHODS[difficulty];
  if (!methods || methods.length === 0) {
    throw new Error(`No cipher techniques implemented for "${difficulty}" yet.`);
  }
  const method = methods[Math.floor(Math.random() * methods.length)];
  const result = method.encode(target, decoys);
  return { ...result, methodId: method.id, methodLabel: method.label, layers: method.layers };
}

export type { CipherMethod, CipherOutput } from "./types";
