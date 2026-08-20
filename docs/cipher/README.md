# Cipher

[← Back to README](../../README.md)

Every level has a **Ye Lee** field: a Base64 string a team decodes to get the next level's password.

## Levels

Each difficulty has its own folder with the techniques used at that level:

- **[easy/](easy/)**: 2 techniques, no extra info needed to decode:
  - Caesar +5 → Hex → Shuffle+Binary → Base64 ([`cipher_BBHC.md`](easy/cipher_BBHC.md))
  - Atbash → Reverse → Shuffle+ASCII → Base64 ([`cipher_BARA.md`](easy/cipher_BARA.md))
- **[medium/](medium/)**: 1 technique, needs a grid to decode:
  - Polybius Bifid → Hex → Shuffle+Base64 ([`cipher_BHFC.md`](medium/cipher_BHFC.md))
- **[hard/](hard/)**: 1 technique, needs a key + formula to decode:
  - Vigenère → Rail Fence → XOR/Hex → Shuffle+Base64 ([`cipher_BXRV.md`](hard/cipher_BXRV.md))
- **intense**: not built yet.

If a level has more than one technique, one is picked **at random** each time. Same word, different encoding each time.

## When a team needs more than the code

Some techniques use a grid or key a team has no way to guess (Medium's Polybius grid, Hard's Vigenère key). That material gets auto-attached under the Base64 payload, so copying the whole Encoded Password box into Ye Lee gives the team everything they need. Easy's techniques are standard and self-describing, so they need nothing extra.

## Generating one

Admin dashboard → Team Management → **cipher-selector.sh**. Type the word, hit a difficulty. It picks a random technique for that level and decodes its own output to double-check it works. It also shows which technique it used, right below the Encoded Password box. That's admin only, never shown to teams.

## Code

`src/lib/ciphers/`
- `caesarHexBinary.ts`, `atbashReverseAscii.ts`, `polybiusBifidHex.ts`, `vigenereRailXor.ts`: one file per technique, each with an `encode()` and a matching `decode()`
- `shared.ts`: shared helpers (decoys, shuffle, Base64)
- `registry.ts`: which techniques belong to which level, the random pick, and the self-check (encode then decode, compare to the original word)

To add a technique: write the spec here, add the file in `src/lib/ciphers/` (with both `encode()` and `decode()`), register it in `registry.ts`.

[← Back to README](../../README.md)
