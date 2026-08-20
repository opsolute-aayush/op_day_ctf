// Helpers shared by every cipher technique script: decoy generation,
// shuffling, and Base64 encoding. Kept here instead of duplicated per file.

// Same cyber-ops theming as lib/sabotage.ts's CHALLENGE_WORDS, just spread
// across more lengths so decoys can match whatever length the admin's real
// passphrase happens to be.
const DECOY_BANK = [
  "GLITCH", "SIGNAL", "CIPHER", "BEACON", "SHADOW", "VECTOR", "BUNKER", "EMBER",
  "FIREWALL", "OVERRIDE", "BLACKOUT", "PAYLOAD", "INTRUDER", "DECRYPT", "SANDBOX", "ROOTKIT",
  "PHANTOM", "OUTPOST", "ENCLAVE", "WARHEAD", "HORIZON", "GAUNTLET",
  "BACKDOOR", "MALWARE", "CATALYST", "FRACTURE", "ANOMALY", "CROSSFIRE", "DEADBOLT",
  "SABOTAGE", "BLUEPRINT", "FREQUENCY", "OVERWATCH", "PERIMETER", "TRIPWIRE", "STOWAWAY",
  "SENTINEL", "CHECKPOINT", "BEACHHEAD",
];

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function toBase64(str: string): string {
  if (typeof btoa === "function") return btoa(str);
  return Buffer.from(str, "utf8").toString("base64");
}

export function fromBase64(b64: string): string {
  if (typeof atob === "function") return atob(b64);
  return Buffer.from(b64, "base64").toString("utf8");
}

function randomPronounceableWord(length: number, avoid: string[], excludeLetters: string[] = []): string {
  const consonants = "BCDFGHJKLMNPQRSTVWXYZ".split("").filter((c) => !excludeLetters.includes(c)).join("");
  const vowels = "AEIOU".split("").filter((c) => !excludeLetters.includes(c)).join("");
  let word = "";
  for (let attempt = 0; attempt < 20; attempt++) {
    word = "";
    for (let i = 0; i < length; i++) {
      const set = i % 2 === 0 ? consonants : vowels;
      word += set[Math.floor(Math.random() * set.length)];
    }
    if (!avoid.includes(word)) break;
  }
  return word;
}

/** Picks `count` decoys matching `target`'s length: real words from the bank first, then generated filler. */
export function generateDecoys(target: string, count: number, excludeLetters: string[] = []): string[] {
  const targetUpper = target.toUpperCase();
  const pool = shuffle(
    DECOY_BANK.filter(
      (w) => w.length === target.length && w !== targetUpper && !excludeLetters.some((l) => w.includes(l))
    )
  );
  const picked: string[] = pool.slice(0, count);
  while (picked.length < count) {
    picked.push(randomPronounceableWord(target.length, [targetUpper, ...picked], excludeLetters));
  }
  return picked;
}

/**
 * Resolves the caller-supplied decoys (if valid) or generates 4 fresh ones, and validates the target itself.
 * `excludeLetters` rejects a target containing them (e.g. Polybius has no "J") and keeps generated decoys clean.
 */
export function resolveWords(target: string, decoys?: string[], excludeLetters: string[] = []): string[] {
  const word = target.trim();
  if (!word) throw new Error("Passphrase is required");
  const badLetter = excludeLetters.find((l) => word.toUpperCase().includes(l));
  if (badLetter) {
    throw new Error(`This technique can't encode the letter "${badLetter}". Pick a different word or difficulty.`);
  }
  const chosenDecoys = decoys && decoys.length === 4 ? decoys : generateDecoys(word, 4, excludeLetters);
  return [word, ...chosenDecoys];
}

/** Throws if any word has a character outside A-Z. Several techniques' math only holds for plain letters. */
export function assertLettersOnly(words: string[], techniqueLabel: string): void {
  const bad = words.find((w) => !/^[A-Za-z]+$/.test(w));
  if (bad) {
    throw new Error(`${techniqueLabel} only supports letters A-Z. "${bad}" has a non-letter character.`);
  }
}
