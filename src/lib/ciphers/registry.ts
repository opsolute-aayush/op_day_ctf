// Maps each difficulty to its pool of implemented cipher techniques (see
// cipher/<difficulty>/*.md for the specs) and picks one at random on every
// call, so the admin dashboard never encodes the same passphrase the same
// way twice. Intense stays empty until its spec lands in cipher/intense.

import type { CipherMethod, CipherOutput } from "./types";
import { caesarHexBinaryCipher } from "./caesarHexBinary";
import { atbashReverseAsciiCipher } from "./atbashReverseAscii";
import { polybiusBifidHexCipher } from "./polybiusBifidHex";
import { vigenereRailXorCipher } from "./vigenereRailXor";

export type Difficulty = "easy" | "medium" | "hard" | "intense";

export const CIPHER_METHODS: Record<Difficulty, CipherMethod[]> = {
  easy: [caesarHexBinaryCipher, atbashReverseAsciiCipher],
  medium: [polybiusBifidHexCipher],
  hard: [vigenereRailXorCipher],
  intense: [],
};

/** Every implemented technique's id and admin-facing label, flattened across difficulties. Single
 *  source of truth for anything that needs to enumerate techniques (the hint seed script, the hint API route). */
export const ALL_CIPHER_METHODS: CipherMethod[] = Object.values(CIPHER_METHODS).flat();

export interface CipherRunResult extends CipherOutput {
  methodId: string;
  methodLabel: string;
  layers: string[];
  /** Material a team needs to decode this (a grid, a key). Undefined when the technique needs none. */
  teamReference?: string;
}

/**
 * Runs a randomly chosen technique from `difficulty`'s pool against `target` (+4 decoys), then
 * immediately decodes its own output and checks it recovers `target`. A broken technique throws
 * here instead of silently handing out an unsolvable Ye Lee string.
 */
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

  const recovered = method.decode(result);
  if (recovered.toUpperCase() !== target.trim().toUpperCase()) {
    throw new Error(
      `Cipher self-check failed for "${method.label}": decoding its own output gave "${recovered}", expected "${target.trim()}". This technique has a bug, so its output was not returned.`
    );
  }

  return { ...result, methodId: method.id, methodLabel: method.label, layers: method.layers, teamReference: method.teamReference };
}

export type { CipherMethod, CipherOutput } from "./types";
