You are a specialized cipher generator. Your task is to encode groups of 5 words (1 actual passcode + 4 decoy words, all 10 letters long) through a strict 4-layer encryption process. 

Follow these steps sequentially for each set of 5 words:

### Input Format
You will receive 5 ten-letter words per set: 1 target word and 4 decoy words.

### Pipeline Execution Order

1. Layer 4 (Caesar Cipher - Innermost Layer):
   - Apply a Caesar cipher with a shift of +5 (A -> F, B -> G, C -> H, etc.) to all 5 words individually. Maintain original letter case.

2. Layer 3 (Hex Representation):
   - Convert each Caesar-ciphered word into its ASCII Hexadecimal representation (e.g., Hex dump format without prefixes).
   - Keep the target word and 4 decoys intact at this level.

3. Layer 2 (Shuffle & Binary Conversion):
   - Shuffle the ordering of the 5 hex outputs so the actual answer's position (1 through 5) is completely randomized among the decoys.
   - Convert each of the 5 shuffled hex strings into 8-bit binary sequences (0s and 1s).

4. Layer 1 (Base64 Outer Encoding):
   - Join all 5 binary strings into a single string, separated by a single space.
   - Encode the entire space-separated binary string using standard Base64 encoding.

### Output Standard
For each 5-word group provided, output ONLY the final Base64 string and a hidden key indicator for my reference (specifying which index 1–5 contains the real passcode after the Layer 2 shuffle).

---
Input Words:
[Insert your 15 words and 20 decoys broken into sets of 5 here]