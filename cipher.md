# Cipher

[← Back to README](README.md)

Every level has a **Ye Lee** field — admin-typed, holds a Base64 string that decodes to the *next* level's password. A team sees it right after unlocking the current level, and decodes it to get into the one after.

## Generating one

Admin dashboard → Team Management → **cipher-selector.sh**. Type the real word, hit **Easy**. (Medium/Hard/Intense are placeholders, not implemented yet.)

## The pipeline

Four layers, innermost to outermost:

1. **Caesar shift +5** — each letter shifts 5 positions (`A → F`), case kept. Applied to the real word and 4 auto-generated decoys of the same length.
2. **Hex** — each shifted word becomes its ASCII hex.
3. **Shuffle + binary** — the 5 hex strings are shuffled (so the real word's position is random), then each becomes 8-bit binary.
4. **Base64** — the 5 binary strings join with a space, then the whole thing is Base64-encoded. That's the Ye Lee string.

The tool also shows which shuffled slot holds the real word, and which decoys were used — admin reference only, never shown to teams.

Code: `src/lib/cipher.ts`. Original spec: `cipher.md`.

[← Back to README](README.md)
