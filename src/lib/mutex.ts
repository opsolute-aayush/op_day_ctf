const tails = new Map<string, Promise<unknown>>();

// Queues async work per key so concurrent callers (e.g. two teammates joining,
// or two status polls sending presence heartbeats) never read-modify-write
// the same row at once and clobber each other's changes.
export function withKeyLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const tail = tails.get(key) ?? Promise.resolve();
  const result = tail.then(fn, fn);
  tails.set(key, result.catch(() => undefined));
  return result;
}
