# Medium Cipher: Polybius Bifid + Hex

[← Back to Cipher overview](../README.md)

The only Medium technique so far. Needs a grid a team can't guess. That grid is auto-attached to the Ye Lee text.

Code: `src/lib/ciphers/polybiusBifidHex.ts`.

## Original spec

You are a specialized cipher generator. Your task is to encode groups of 5 words (1 actual passcode + 4 decoy words, all 10 letters long) using Polybius Grid Fractionation (Bifid Cipher) and Base64.

### 5x5 Polybius Grid Reference (I and J share coordinate 2,4):
Row 1: A B C D E
Row 2: F G H I K
Row 3: L M N O P
Row 4: Q R S T U
Row 5: V W X Y Z

Follow these steps sequentially for each set of 5 words:

1. Layer 4 (Coordinate Extraction):
   - Convert each letter of the 10-letter word into its 2-digit (Row, Column) Polybius coordinate.
   - Example: 'F' -> Row 2, Col 1.

2. Layer 3 (Bifid Fractionation & Recombination):
   - Separate the 10 coordinates into a list of 10 Rows and 10 Columns.
   - Append all 10 Columns directly after all 10 Rows to form a single 20-digit stream.
   - Group the 20 digits back into 10 pairs of (Row, Column) coordinates.
   - Convert each new pair back into a letter using the Polybius grid to produce a 10-letter fractionated word.

3. Layer 2 (Hex Encoding):
   - Convert each character of the fractionated 10-letter word into its 2-digit Hexadecimal string.

4. Layer 1 (Shuffle & Base64 Output):
   - Shuffle the order of the 5 hex strings so the target word's index (1 to 5) is randomized among the decoys.
   - Join all 5 hex strings with a forward slash ("/").
   - Encode the joined string in Base64.

### Output Standard
Output ONLY:
1. The final Base64 payload.
2. The index (1–5) containing the real passcode.

---
Input Words:
[Insert 1 target word + 4 decoy words here]

[← Back to Cipher overview](../README.md)