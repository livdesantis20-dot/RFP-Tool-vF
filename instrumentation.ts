// Runs once when the server starts: create tables and demo defaults.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { ensureDb } = await import("@/lib/db/client");
  try {
    await ensureDb();
  } catch (e) {
    console.error("[db] bootstrap failed:", e);
  }
}
