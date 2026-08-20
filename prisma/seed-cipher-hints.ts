import { PrismaClient } from "@prisma/client";
import { ALL_CIPHER_METHODS } from "../src/lib/ciphers";

const prisma = new PrismaClient();

// Pre-written help.tpl content for each technique in src/lib/ciphers/, keyed by CipherMethod.id.
// Progressive: weakest hint first, strongest (nearly a walkthrough) last, so the admin can hand
// out only as much as a stuck team needs. Review before running: `npx tsx prisma/seed-cipher-hints.ts`.
const HINTS: Record<string, string[]> = {
  "caesar-hex-binary": [
    "Base64-decode the whole string first. You'll get 5 groups of 1s and 0s separated by spaces.",
    "Split each group into 8-bit chunks. Each chunk is one letter's ASCII code in binary.",
    "Convert each chunk to a letter. You'll get 5 scrambled words, all the same length.",
    "One of the 5 is the real password, the rest are decoys. Look for the one that reads like a word once unshifted.",
    "Every letter was shifted forward 5 spots (A became F). Shift each one back by 5 to read it.",
  ],
  "atbash-reverse-ascii": [
    "Base64-decode first. You'll see 5 groups of numbers separated by '|', each number is a letter's ASCII code.",
    "Turn each number back into a letter using a standard ASCII table.",
    "The letters in each word are reversed. Flip each word end to end.",
    "Still wrong? The alphabet was mirrored (A to Z, B to Y, and so on) before it was reversed.",
    "Mirror every letter back after reversing. One of the 5 results will be a real word.",
  ],
  "polybius-bifid-hex": [
    "Base64-decode the string, then split it on '/'. You'll get 5 chunks of hex.",
    "Each pair of hex digits is one letter's ASCII code. Convert them back to letters.",
    "Now use the 5x5 grid that came with this puzzle. Every letter has a row and column on it.",
    "Write down the row and column for every letter in order: 10 rows, then 10 columns.",
    "Read out all the rows first, then all the columns. Re-pair them from the start and look each new pair up on the grid again to get the real letters.",
  ],
  "vigenere-rail-xor": [
    "Base64-decode first, then split on '::'. That gives 5 separate hex payloads.",
    "Each pair of hex digits is one byte. Undo the XOR using the formula given, one position at a time, to get a letter string back.",
    "That string still won't read right. Its letters were split into two halves and glued back together, a 'rail fence'.",
    "Put the first half of the letters back into the even positions, the second half into the odd positions.",
    "Undo the shift using the key word given. For each letter, subtract the matching key letter's position, wrapping A to Z, to get the real word.",
  ],
};

async function main() {
  const knownIds = new Set(ALL_CIPHER_METHODS.map((m) => m.id));
  for (const id of Object.keys(HINTS)) {
    if (!knownIds.has(id)) throw new Error(`HINTS has entry "${id}" but no CipherMethod with that id exists.`);
  }
  for (const method of ALL_CIPHER_METHODS) {
    if (!HINTS[method.id]) console.warn(`No hints defined for "${method.id}" (${method.label}). Skipping.`);
  }

  for (const [methodId, hints] of Object.entries(HINTS)) {
    if (hints.length !== 5) throw new Error(`"${methodId}" has ${hints.length} hints, expected exactly 5.`);
    await prisma.cipherHint.upsert({
      where: { methodId },
      update: { hints: JSON.stringify(hints) },
      create: { methodId, hints: JSON.stringify(hints) },
    });
    console.log(`Seeded ${methodId} (${hints.length} hints).`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
