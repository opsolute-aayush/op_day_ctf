export function normalizePassword(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalizeSentence(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:'"()]/g, "")
    .replace(/\s+/g, " ");
}

// Physical word cards get transcribed with all kinds of spacing/casing —
// compare on letters/digits only so "The Secret", "THE  SECRET", and
// "THESECRET" all match the same word reward.
export function normalizeWord(input: string): string {
  return input.toUpperCase().replace(/\s+/g, "");
}
