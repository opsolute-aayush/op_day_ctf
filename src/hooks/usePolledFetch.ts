"use client";

import { useEffect, useState } from "react";

/**
 * Fetches `url` immediately, then again every `intervalMs`, returning the
 * parsed JSON body (or `null` before the first successful response). Used
 * across the player and admin dashboards for "keep this panel live" panels.
 * Pass whatever mutable values the URL/behavior depends on as `deps` (e.g. a
 * `nonce` bumped after a mutation to force an immediate reload, same as
 * passing it to a plain useEffect's dependency array).
 *
 * A non-ok response is treated the same as "no update yet" (keeps the last
 * good value) rather than clearing to null. That matches how every call site
 * already handled it before this was extracted.
 */
export function usePolledFetch<T>(url: string, intervalMs: number, deps: React.DependencyList = []): T | null {
  const [data, setData] = useState<T | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok || cancelled) return;
      const json = await res.json();
      if (!cancelled) setData(json);
    }

    load();
    const interval = setInterval(load, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, intervalMs, ...deps]);

  return data;
}
