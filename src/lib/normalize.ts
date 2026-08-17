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
