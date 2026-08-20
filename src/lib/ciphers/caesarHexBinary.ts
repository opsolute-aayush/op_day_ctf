// Easy-level cipher technique. Spec: cipher/easy/cipher_BBHC.md
// 4 layers, innermost to outermost: Caesar shift +5 -> ASCII hex ->
// shuffle + 8-bit binary -> Base64.

import type { CipherMethod } from "./types";
import { fromBase64, resolveWords, shuffle, toBase64 } from "./shared";

const CAESAR_SHIFT = 5;

function caesarEncode(str: string, shift: number): string {
  return str.replace(/[a-zA-Z]/g, (ch) => {
    const base = ch <= "Z" ? 65 : 97;
    const code = ch.charCodeAt(0) - base;
    return String.fromCharCode(((code + shift) % 26) + base);
  });
}

function textToHex(str: string): string {
  return Array.from(str)
    .map((ch) => ch.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("");
}

function hexToBinary(hex: string): string {
  let out = "";
  for (let i = 0; i < hex.length; i += 2) {
    out += parseInt(hex.slice(i, i + 2), 16).toString(2).padStart(8, "0");
  }
  return out;
}

function binaryToHex(binary: string): string {
  let out = "";
  for (let i = 0; i < binary.length; i += 8) {
    out += parseInt(binary.slice(i, i + 8), 2).toString(16).padStart(2, "0");
  }
  return out;
}

function hexToText(hex: string): string {
  let out = "";
  for (let i = 0; i < hex.length; i += 2) {
    out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
  }
  return out;
}

export const caesarHexBinaryCipher: CipherMethod = {
  id: "caesar-hex-binary",
  label: "Caesar +5 -> Hex -> Shuffle+Binary -> Base64",
  layers: [
    "Layer 4: Caesar shift +5 (A -> F), case preserved",
    "Layer 3: ASCII hex per word",
    "Layer 2: Shuffle 5 words, then 8-bit binary per hex byte",
    "Layer 1: Base64 over the space-joined binary strings",
  ],
  encode(target, decoys) {
    const words = resolveWords(target, decoys);
    const hexed = words.map((w) => textToHex(caesarEncode(w, CAESAR_SHIFT)));

    const order = shuffle([0, 1, 2, 3, 4]);
    const answerIndex = order.indexOf(0) + 1;
    const binaries = order.map((i) => hexToBinary(hexed[i]));

    const base64 = toBase64(binaries.join(" "));

    return { base64, answerIndex, decoys: words.slice(1) };
  },
  decode({ base64, answerIndex }) {
    const binaries = fromBase64(base64).split(" ");
    const hex = binaryToHex(binaries[answerIndex - 1]);
    const shifted = hexToText(hex);
    return caesarEncode(shifted, 26 - CAESAR_SHIFT);
  },
};
