# Easy Cipher: Atbash + Reverse + ASCII

[← Back to Cipher overview](../README.md)

One of two Easy techniques. Randomly picked against [Caesar + Hex + Binary](cipher_BBHC.md).

Code: `src/lib/ciphers/atbashReverseAscii.ts`.

## Original spec

You are a specialized cipher generator. Your task is to encode groups of 5 words (1 actual passcode + 4 decoy words, all 10 letters long) through a strict 4-layer encryption process.

Follow these steps sequentially for each set of 5 words:

### Input Format
You will receive 5 ten-letter words per set: 1 target word and 4 decoy words.

### Pipeline Execution Order

1. Layer 4 (Atbash Mirror Cipher - Innermost Layer):
   - Replace every character of all 5 words with its alphabet mirror opposite:
     A <-> Z, B <-> Y, C <-> X, D <-> W, E <-> V, F <-> U, G <-> T, H <-> S, I <-> R, J <-> Q, K <-> P, L <-> O, M <-> N
   - Preserve uppercase letters.

2. Layer 3 (String Reversal):
   - Reverse the sequence of characters in each of the 5 mirrored words completely from end to start (e.g., "ABCD" becomes "DCBA").

3. Layer 2 (Shuffle & ASCII Decimal Conversion):
   - Randomly shuffle the order of the 5 words so the target word's position (index 1 through 5) is completely randomized among the decoys.
   - Convert every character in each word into its 2-digit or 3-digit ASCII decimal number, separated by spaces.
   - Join the 5 word groups together into a single string using a pipe character ("|") with surrounding spaces as the delimiter.

4. Layer 1 (Base64 Outer Encoding):
   - Encode the entire pipe-separated ASCII integer string into standard Base64.

### Output Standard
For each 5-word group provided, output ONLY:
1. The final Base64 string payload.
2. A hidden key indicator (specifying which index 1–5 contains the real passcode after the Layer 2 shuffle).

---
Input Words:
[Insert 1 target word + 4 decoy words here]