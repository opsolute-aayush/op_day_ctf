export function parseIntArray(json: string): number[] {
  try {
    const val = JSON.parse(json);
    return Array.isArray(val) ? val.filter((v) => typeof v === "number") : [];
  } catch {
    return [];
  }
}

export function parseStringArray(json: string): string[] {
  try {
    const val = JSON.parse(json);
    return Array.isArray(val) ? val.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}
