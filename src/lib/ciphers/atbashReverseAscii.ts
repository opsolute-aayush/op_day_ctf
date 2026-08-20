// Easy-level cipher technique. Spec: cipher/easy/cipher_BARA.md
// 4 layers, innermost to outermost: Atbash mirror -> string reversal ->
// shuffle + ASCII decimal -> Base64.

import type { CipherMethod } from "./types";
import { resolveWords, shuffle, toBase64 } from "./shared";

const ATBASH_UPPER = "ZYXWVUTSRQPONMLKJIHGFEDCBA";
const ATBASH_LOWER = "zyxwvutsrqponmlkjihgfedcba";

function atbashEncode(str: string): string {
  return str.replace(/[a-zA-Z]/g, (ch) => {
    if (ch >= "A" && ch <= "Z") return ATBASH_UPPER[ch.charCodeAt(0) - 65];
    return ATBASH_LOWER[ch.charCodeAt(0) - 97];
  });
}

function reverseWord(str: string): string {
  return Array.from(str).reverse().join("");
}

function wordToAsciiDecimal(str: string): string {
  return Array.from(str)
    .map((ch) => ch.charCodeAt(0).toString(10))
    .join(" ");
}

export const atbashReverseAsciiCipher: CipherMethod = {
  id: "atbash-reverse-ascii",
  label: "Atbash Mirror -> Reverse -> Shuffle+ASCII -> Base64",
  layers: [
    "Layer 4: Atbash mirror cipher (A<->Z, B<->Y, ...), case preserved",
    "Layer 3: Full string reversal per word",
    "Layer 2: Shuffle 5 words, then ASCII decimal per character",
    "Layer 1: Base64 over the ' | '-joined ASCII groups",
  ],
  encode(target, decoys) {
    const words = resolveWords(target, decoys);
    const mirrored = words.map((w) => reverseWord(atbashEncode(w)));

    const order = shuffle([0, 1, 2, 3, 4]);
    const answerIndex = order.indexOf(0) + 1;
    const asciiGroups = order.map((i) => wordToAsciiDecimal(mirrored[i]));

    const base64 = toBase64(asciiGroups.join(" | "));

    return { base64, answerIndex, decoys: words.slice(1) };
  },
};
