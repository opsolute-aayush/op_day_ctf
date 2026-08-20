# Cipher

[← Back to README](../README.md)

Every level has a **Ye Lee** field: a Base64 string a team decodes to get the next level's password.

## Levels

Each difficulty has its own folder with the techniques used at that level:

- **[easy/](easy/)** — 2 techniques:
  - Caesar +5 → Hex → Shuffle+Binary → Base64 ([`cipher_BBHC.md`](easy/cipher_BBHC.md))
  - Atbash → Reverse → Shuffle+ASCII → Base64 ([`cipher_BARA.md`](easy/cipher_BARA.md))
- **medium / hard / intense** — not built yet.

If a level has more than one technique, one is picked **at random** each time. Same word, different encoding each time.

## Generating one

Admin dashboard → Team Management → **cipher-selector.sh**. Type the word, hit a difficulty. It picks a random technique for that level and shows which one it used right below the Encoded Password box — admin only, never shown to teams.

## Code

`src/lib/ciphers/`
- `caesarHexBinary.ts`, `atbashReverseAscii.ts` — one file per technique
- `shared.ts` — shared helpers (decoys, shuffle, Base64)
- `registry.ts` — which techniques belong to which level, and the random pick

To add a technique: write the spec here, add the file in `src/lib/ciphers/`, register it in `registry.ts`.

[← Back to README](../README.md)
