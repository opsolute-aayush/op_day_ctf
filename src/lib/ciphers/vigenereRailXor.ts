// Hard-level cipher technique. Spec: cipher/hard/cipher_BXRV.md
// 4 layers, innermost to outermost: keyed Vigenere shift -> 2-rail rail fence
// -> positional XOR + hex -> shuffle + Base64.
//
// The Vigenere keyword and the XOR key formula are arbitrary choices a team
// has no way to guess, so both are exposed as `teamReference` and folded
// into the Ye Lee text alongside the payload.

import type { CipherMethod } from "./types";
import { assertLettersOnly, fromBase64, resolveWords, shuffle, toBase64 } from "./shared";

const VIGENERE_KEY = "VECTOR";

function vigenereEncode(word: string, key: string): string {
  return Array.from(word.toUpperCase())
    .map((ch, i) => {
      const p = ch.charCodeAt(0) - 65;
      const k = key.charCodeAt(i % key.length) - 65;
      return String.fromCharCode(((p + k) % 26) + 65);
    })
    .join("");
}

function vigenereDecode(word: string, key: string): string {
  return Array.from(word)
    .map((ch, i) => {
      const c = ch.charCodeAt(0) - 65;
      const k = key.charCodeAt(i % key.length) - 65;
      return String.fromCharCode(((c - k + 26) % 26) + 65);
    })
    .join("");
}

function railFenceEncode(word: string): string {
  const chars = Array.from(word);
  const rail1 = chars.filter((_, i) => i % 2 === 0).join("");
  const rail2 = chars.filter((_, i) => i % 2 === 1).join("");
  return rail1 + rail2;
}

function railFenceDecode(word: string): string {
  const len = word.length;
  const rail1Len = Math.ceil(len / 2);
  const rail1 = word.slice(0, rail1Len);
  const rail2 = word.slice(rail1Len);
  const out: string[] = new Array(len);
  for (let i = 0; i < rail1.length; i++) out[i * 2] = rail1[i];
  for (let i = 0; i < rail2.length; i++) out[i * 2 + 1] = rail2[i];
  return out.join("");
}

function xorKeyAt(i: number): number {
  return (i * 11 + 63) % 256;
}

function xorHexEncode(word: string): string {
  return Array.from(word)
    .map((ch, i) => (ch.charCodeAt(0) ^ xorKeyAt(i)).toString(16).padStart(2, "0"))
    .join("");
}

function xorHexDecode(hex: string): string {
  let out = "";
  for (let i = 0; i * 2 < hex.length; i++) {
    const byte = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    out += String.fromCharCode(byte ^ xorKeyAt(i));
  }
  return out;
}

function encodeWord(word: string): string {
  return xorHexEncode(railFenceEncode(vigenereEncode(word, VIGENERE_KEY)));
}

function decodeWord(hex: string): string {
  return vigenereDecode(railFenceDecode(xorHexDecode(hex)), VIGENERE_KEY);
}

const TEAM_REFERENCE = [
  "Vigenere key: VECTOR (repeats every 6 letters)",
  "Rail Fence: 2 rails, even positions first then odd",
  "XOR byte key at 0-indexed position i: (i * 11 + 63) mod 256",
].join("\n");

export const vigenereRailXorCipher: CipherMethod = {
  id: "vigenere-rail-xor",
  label: "Vigenere -> Rail Fence -> XOR/Hex -> Shuffle+Base64",
  layers: [
    "Layer 4: Vigenere shift, key VECTOR",
    "Layer 3: 2-rail rail fence transposition (even indices, then odd)",
    "Layer 2: Positional XOR per character, then hex",
    "Layer 1: Shuffle 5 words, join with '::', Base64",
  ],
  teamReference: TEAM_REFERENCE,
  encode(target, decoys) {
    const words = resolveWords(target, decoys);
    assertLettersOnly(words, "Vigenere Rail XOR");

    const hexed = words.map(encodeWord);

    const order = shuffle([0, 1, 2, 3, 4]);
    const answerIndex = order.indexOf(0) + 1;
    const shuffled = order.map((i) => hexed[i]);

    const base64 = toBase64(shuffled.join("::"));

    return { base64, answerIndex, decoys: words.slice(1) };
  },
  decode({ base64, answerIndex }) {
    const hexGroups = fromBase64(base64).split("::");
    return decodeWord(hexGroups[answerIndex - 1]);
  },
};
