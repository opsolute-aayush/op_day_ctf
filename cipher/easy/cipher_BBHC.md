# Cipher — Easy: Caesar + Hex + Binary

[← Back to Cipher overview](../README.md)

One of two Easy techniques. Randomly picked against [Atbash + Reverse + ASCII](cipher_BARA.md).

## Pipeline (inner to outer)

1. **Caesar +5** — shift each letter 5 places (`A → F`), case kept. Applied to the real word + 4 same-length decoys.
2. **Hex** — each word becomes ASCII hex.
3. **Shuffle + binary** — shuffle the 5 words, then each hex becomes 8-bit binary.
4. **Base64** — join the 5 binary strings with a space, Base64 the result. That's the Ye Lee string.

Which shuffled slot holds the real word is admin-only info, never shown to teams.

Code: `src/lib/ciphers/caesarHexBinary.ts`.

[← Back to Cipher overview](../README.md)
