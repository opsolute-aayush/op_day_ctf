// Helpers shared by every cipher technique script — decoy generation,
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

function randomPronounceableWord(length: number, avoid: string[]): string {
  const consonants = "BCDFGHJKLMNPQRSTVWXYZ";
  const vowels = "AEIOU";
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

/** Picks `count` decoys matching `target`'s length — real words from the bank first, then generated filler. */
export function generateDecoys(target: string, count: number): string[] {
  const targetUpper = target.toUpperCase();
  const pool = shuffle(DECOY_BANK.filter((w) => w.length === target.length && w !== targetUpper));
  const picked: string[] = pool.slice(0, count);
  while (picked.length < count) {
    picked.push(randomPronounceableWord(target.length, [targetUpper, ...picked]));
  }
  return picked;
}

/** Resolves the caller-supplied decoys (if valid) or generates 4 fresh ones, and validates the target itself. */
export function resolveWords(target: string, decoys?: string[]): string[] {
  const word = target.trim();
  if (!word) throw new Error("Passphrase is required");
  const chosenDecoys = decoys && decoys.length === 4 ? decoys : generateDecoys(word, 4);
  return [word, ...chosenDecoys];
}
