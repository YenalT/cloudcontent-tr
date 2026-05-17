/**
 * Exits 1 with a clear message when DATABASE_URL is missing or empty.
 * Used before `prisma migrate deploy` in npm scripts and CI.
 *
 * Usage:
 *   npx tsx scripts/ensure-database-url.ts           # always require (migrate)
 *   npx tsx scripts/ensure-database-url.ts --production-only
 */

import { isDatabaseUrlConfigured, formatMissingDatabaseUrlMessage } from "../src/lib/env/database-url"

const productionOnly = process.argv.includes("--production-only")
const ci = process.argv.includes("--ci")
const context = ci ? "ci" : "migrate"

function isProductionContext(): boolean {
  if (process.env.NODE_ENV === "production") return true
  return Boolean(process.env.WEBSITE_SITE_NAME?.trim())
}

function main(): void {
  if (productionOnly && !isProductionContext()) {
    process.exit(0)
  }

  if (isDatabaseUrlConfigured()) {
    console.log("[ensure-database-url] DATABASE_URL is set.")
    process.exit(0)
  }

  console.error("[ensure-database-url] ERROR")
  console.error(formatMissingDatabaseUrlMessage(context))
  process.exit(1)
}

main()
