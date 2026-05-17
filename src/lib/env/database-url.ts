/**
 * DATABASE_URL validation — shared by CLI scripts, startup, and production runtime.
 * Never hardcode connection strings here; read only from process.env.
 */

export const DATABASE_URL_ENV = "DATABASE_URL"

export type DatabaseUrlContext = "migrate" | "runtime" | "ci"

function isProductionContext(): boolean {
  if (process.env.NODE_ENV === "production") return true
  return Boolean(process.env.WEBSITE_SITE_NAME?.trim())
}

/**
 * Reads DATABASE_URL from the environment. Whitespace-only values are treated as missing.
 */
export function readDatabaseUrl(): string | null {
  const raw = process.env[DATABASE_URL_ENV]
  if (raw === undefined || raw === null) return null
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function isDatabaseUrlConfigured(): boolean {
  return readDatabaseUrl() !== null
}

/**
 * User-safe error text — no secrets, no env dumps.
 */
export function formatMissingDatabaseUrlMessage(context: DatabaseUrlContext = "runtime"): string {
  const lines = [
    "DATABASE_URL is missing or empty.",
    "",
    "Prisma requires a PostgreSQL connection string in the DATABASE_URL environment variable.",
  ]

  if (context === "migrate" || context === "ci") {
    lines.push(
      "",
      "GitHub Actions:",
      "  1. GitHub → your repository → Settings → Secrets and variables → Actions",
      "  2. New repository secret → Name: DATABASE_URL",
      "  3. Value: postgresql://USER:PASSWORD@HOST:5432/cloudcontent_tr?schema=public&sslmode=require",
      "  4. Re-run the workflow (an unset secret is passed as an empty string and will fail here)",
    )
  }

  lines.push(
    "",
    "Azure App Service:",
    "  1. Azure Portal → App Services → your app → Settings → Environment variables",
    "     (or Configuration → Application settings)",
    "  2. + Add → Name: DATABASE_URL",
    "  3. Value: postgresql://USER:PASSWORD@HOST.postgres.database.azure.com:5432/cloudcontent_tr?schema=public&sslmode=require",
    "  4. Apply → Confirm (app restarts)",
    "  5. Ensure the setting is not present with a blank value — that overrides a valid .env locally",
    "",
    "Local development:",
    "  cp .env.example .env  then set DATABASE_URL in .env (file is gitignored).",
    "",
    "Do not commit connection strings to git.",
  )

  return lines.join("\n")
}

export class MissingDatabaseUrlError extends Error {
  constructor(context: DatabaseUrlContext = "runtime") {
    super(formatMissingDatabaseUrlMessage(context))
    this.name = "MissingDatabaseUrlError"
  }
}

export type RequireDatabaseUrlOptions = {
  /** When true, only enforce in production / App Service (default: false). */
  productionOnly?: boolean
  /** Context for error message (migrate deploy, CI, app runtime). */
  context?: DatabaseUrlContext
}

/**
 * Returns a non-empty DATABASE_URL or throws MissingDatabaseUrlError.
 */
export function requireDatabaseUrl(options: RequireDatabaseUrlOptions = {}): string {
  const { productionOnly = false, context = "runtime" } = options

  if (productionOnly && !isProductionContext()) {
    const optional = readDatabaseUrl()
    if (optional) return optional
    return ""
  }

  const url = readDatabaseUrl()
  if (url) return url

  throw new MissingDatabaseUrlError(context)
}

/** Enforce DATABASE_URL when NODE_ENV=production or running on Azure App Service. */
export function requireDatabaseUrlInProduction(): string {
  if (!isProductionContext()) return readDatabaseUrl() ?? ""
  return requireDatabaseUrl({ context: "runtime" })
}
