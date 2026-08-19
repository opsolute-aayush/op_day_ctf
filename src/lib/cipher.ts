// Implements the 4-layer encoding pipeline described in cipher.md, used by
// the admin panel to turn a level's real passphrase into a decoy-padded,
// shuffled, Base64-wrapped "encrypted message" the admin can hand out as a
// physical clue. The real passphrase itself still becomes the team's actual
// unlock password (bcrypt-hashed) — this module only produces the puzzle text.

const CAESAR_SHIFT = 5;

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

function caesarEncode(str: string, shift: number): string {
  return str.replace(/[a-zA-Z]/g, (ch) => {
    const base = ch <= "Z" ? 65 : 97;
    const code = ch.charCodeAt(0) - base;
    return String.fromCharCode(((code + shift) % 26) + base);
  });
}

function textToHex(str: string): string {
  return Array.from(str)
    .map((ch) => ch.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("");
}

function hexToBinary(hex: string): string {
  let out = "";
  for (let i = 0; i < hex.length; i += 2) {
    out += parseInt(hex.slice(i, i + 2), 16).toString(2).padStart(8, "0");
  }
  return out;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function toBase64(str: string): string {
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

function generateDecoys(target: string, count: number): string[] {
  const targetUpper = target.toUpperCase();
  const pool = shuffle(DECOY_BANK.filter((w) => w.length === target.length && w !== targetUpper));
  const picked: string[] = pool.slice(0, count);
  while (picked.length < count) {
    picked.push(randomPronounceableWord(target.length, [targetUpper, ...picked]));
  }
  return picked;
}

export interface CipherResult {
  base64: string;
  /** 1-5, which shuffled slot holds the real passphrase — admin reference only, never share with teams. */
  answerIndex: number;
  decoys: string[];
}

/** Runs cipher.md's 4-layer pipeline (Caesar +5 -> hex -> shuffle+binary -> Base64) on the real word plus 4 decoys. */
export function generateCipher(target: string, decoys?: string[]): CipherResult {
  const word = target.trim();
  if (!word) throw new Error("Passphrase is required");

  const chosenDecoys = decoys && decoys.length === 4 ? decoys : generateDecoys(word, 4);
  const words = [word, ...chosenDecoys];

  const hexed = words.map((w) => textToHex(caesarEncode(w, CAESAR_SHIFT)));

  const order = shuffle([0, 1, 2, 3, 4]);
  const answerIndex = order.indexOf(0) + 1;
  const binaries = order.map((i) => hexToBinary(hexed[i]));

  const base64 = toBase64(binaries.join(" "));

  return { base64, answerIndex, decoys: chosenDecoys };
}
