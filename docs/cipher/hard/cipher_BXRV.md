# Hard Cipher: Vigenère + Rail Fence + XOR

[← Back to Cipher overview](../README.md)

The only Hard technique so far. The Vigenère key and XOR formula are arbitrary, so both are auto-attached to the Ye Lee text, giving a team what they need to decode it.

Code: `src/lib/ciphers/vigenereRailXor.ts`.

## Original spec

You are a specialized cipher generator. Your task is to encode groups of 5 words (1 actual passcode + 4 decoy words, all 10 letters long) through a 4-layer encryption process combining Vigenère shifts, Rail Fence transpositions, positional XOR, and Base64 output.

Follow these steps sequentially for each set of 5 words:

### Input Format
You will receive 5 ten-letter words per set: 1 target word and 4 decoy words.

### Pipeline Execution Order

1. Layer 4 (Keyed Vigenère Shift - Innermost Layer):
   - Shift each character of all 5 words using the repeating word key "VECTOR".
   - Formula: C_i = (P_i + K_(i mod 6)) mod 26 (Uppercase A-Z).

2. Layer 3 (2-Rail Rail Fence Transposition):
   - Transpose each 10-letter word into two 5-letter rails:
     * Rail 1: Even character indices (0, 2, 4, 6, 8)
     * Rail 2: Odd character indices (1, 3, 5, 7, 9)
   - Concatenate Rail 1 + Rail 2 to form the transposed 10-character string.

3. Layer 2 (Positional Bitwise XOR & Hex Encoding):
   - For each character at zero-based index i (0 to 9), calculate a dynamic XOR byte key:
     Key_i = (i * 11 + 63) mod 256
   - XOR the character's ASCII value with Key_i: Byte_out = ASCII_val ^ Key_i.
   - Convert the 10 resulting byte values into a contiguous 20-character Hexadecimal string.

4. Layer 1 (Shuffle & Base64 Outer Encoding):
   - Randomly shuffle the position of the 5 hex strings so the target word's position (index 1 to 5) is randomized.
   - Join all 5 hex strings using a double-colon delimiter ("::").
   - Encode the combined string using standard Base64 encoding.

### Output Standard
For each 5-word group provided, output ONLY:
1. The final Base64 string payload.
2. A hidden key indicator (specifying index 1–5 containing the real passcode after Layer 1 shuffle).

---
Input Words:
[Insert 1 target word + 4 decoy words here]

[← Back to Cipher overview](../README.md)