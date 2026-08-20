// Medium-level cipher technique. Spec: cipher/medium/cipher_BHFC.md
// 4 layers, innermost to outermost: Polybius coordinate extraction -> Bifid
// fractionation/recombination -> hex -> shuffle + Base64.
//
// Requires a fixed 5x5 grid the target/decoys are looked up against (I and J
// share a cell, so this technique rejects "J" rather than silently mangling
// it). Unlike the Easy techniques, a team can't reconstruct that grid on
// their own. It's exposed as `teamReference` and folded into the Ye Lee
// text so teams actually receive what they need to decode.

import type { CipherMethod } from "./types";
import { assertLettersOnly, fromBase64, resolveWords, shuffle, toBase64 } from "./shared";

const GRID = ["ABCDE", "FGHIK", "LMNOP", "QRSTU", "VWXYZ"];

function letterToCoord(ch: string): [number, number] {
  const c = ch.toUpperCase();
  for (let r = 0; r < 5; r++) {
    const col = GRID[r].indexOf(c);
    if (col !== -1) return [r + 1, col + 1];
  }
  throw new Error(`"${ch}" is not on the Polybius grid.`);
}

function coordToLetter(row: number, col: number): string {
  return GRID[row - 1][col - 1];
}

function bifidFractionate(word: string): string {
  const coords = Array.from(word.toUpperCase()).map(letterToCoord);
  const digitStream = [...coords.map(([r]) => r), ...coords.map(([, c]) => c)];
  let out = "";
  for (let i = 0; i < digitStream.length; i += 2) {
    out += coordToLetter(digitStream[i], digitStream[i + 1]);
  }
  return out;
}

function bifidDefractionate(fractionated: string): string {
  const pairs = Array.from(fractionated).map(letterToCoord);
  const digitStream: number[] = [];
  pairs.forEach(([r, c]) => digitStream.push(r, c));
  const len = fractionated.length;
  let out = "";
  for (let i = 0; i < len; i++) {
    out += coordToLetter(digitStream[i], digitStream[len + i]);
  }
  return out;
}

function textToHex(str: string): string {
  return Array.from(str)
    .map((ch) => ch.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("");
}

function hexToText(hex: string): string {
  let out = "";
  for (let i = 0; i < hex.length; i += 2) {
    out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
  }
  return out;
}

const GRID_REFERENCE = [
  "Polybius grid (I and J share a cell, use I):",
  "    1  2  3  4  5",
  " 1  A  B  C  D  E",
  " 2  F  G  H  I  K",
  " 3  L  M  N  O  P",
  " 4  Q  R  S  T  U",
  " 5  V  W  X  Y  Z",
].join("\n");

export const polybiusBifidHexCipher: CipherMethod = {
  id: "polybius-bifid-hex",
  label: "Polybius Bifid -> Hex -> Shuffle+Base64",
  layers: [
    "Layer 4: Polybius (row,col) coordinate per letter, 5x5 grid, no J",
    "Layer 3: Bifid fractionation: all rows then all cols, regrouped into new letters",
    "Layer 2: Hex per fractionated letter",
    "Layer 1: Shuffle 5 words, join with '/', Base64",
  ],
  teamReference: GRID_REFERENCE,
  encode(target, decoys) {
    const words = resolveWords(target, decoys, ["J"]);
    assertLettersOnly(words, "Polybius Bifid");

    const hexed = words.map((w) => textToHex(bifidFractionate(w)));

    const order = shuffle([0, 1, 2, 3, 4]);
    const answerIndex = order.indexOf(0) + 1;
    const shuffled = order.map((i) => hexed[i]);

    const base64 = toBase64(shuffled.join("/"));

    return { base64, answerIndex, decoys: words.slice(1) };
  },
  decode({ base64, answerIndex }) {
    const hexGroups = fromBase64(base64).split("/");
    const fractionated = hexToText(hexGroups[answerIndex - 1]);
    return bifidDefractionate(fractionated);
  },
};
