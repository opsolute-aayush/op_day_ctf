// Starts the idle-session cleanup sweep once when the server boots. See
// lib/sessionLifecycle.ts. Node-only: the SQLite/Prisma-backed sweep has no
// business running under the Edge runtime.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startSessionLifecycleSweep } = await import("@/lib/sessionLifecycle");
    startSessionLifecycleSweep();
  }
}

