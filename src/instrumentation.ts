/**
 * Runs once when the Next.js Node.js server starts (not during `next build`).
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return

  const { assertProductionEnvironment } = await import("@/lib/env/validate-production-env")
  assertProductionEnvironment()
}
