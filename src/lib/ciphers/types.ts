// Shared shapes for every cipher technique script in this folder. Each
// technique (one file per script) implements CipherMethod so the registry
// can pick between them without knowing their internals.

export interface CipherOutput {
  base64: string;
  /** 1-5, which shuffled slot holds the real passphrase — admin reference only, never share with teams. */
  answerIndex: number;
  decoys: string[];
}

export interface CipherMethod {
  id: string;
  /** Short name shown to the admin, e.g. "Caesar + Hex + Binary". */
  label: string;
  /** Human-readable layers, innermost to outermost — shown to the admin so they know what a team must undo. */
  layers: string[];
  encode: (target: string, decoys?: string[]) => CipherOutput;
}
