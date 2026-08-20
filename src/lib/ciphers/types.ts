// Shared shapes for every cipher technique script in this folder. Each
// technique (one file per script) implements CipherMethod so the registry
// can pick between them without knowing their internals.

export interface CipherOutput {
  base64: string;
  /** 1-5, which shuffled slot holds the real passphrase. Admin reference only, never share with teams. */
  answerIndex: number;
  decoys: string[];
}

export interface CipherMethod {
  id: string;
  /** Short name shown to the admin, e.g. "Caesar + Hex + Binary". */
  label: string;
  /** Human-readable layers, innermost to outermost. Shown to the admin so they know what a team must undo. */
  layers: string[];
  /**
   * Material a TEAM needs to decode this technique that they can't be expected to know or guess
   * (a lookup grid, a key word, a formula). Folded into the Ye Lee text handed to teams. Omit when
   * the technique is self-describing (plain Caesar/Atbash need no extra reference).
   */
  teamReference?: string;
  encode: (target: string, decoys?: string[]) => CipherOutput;
  /** Reverses encode() to recover the real passphrase from its own output. Used to self-verify every generation. */
  decode: (output: CipherOutput) => string;
}
