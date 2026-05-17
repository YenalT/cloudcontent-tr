import "server-only"

/**
 * True when running in a deployed production runtime (not during `next build`).
 * WEBSITE_SITE_NAME is set by Azure App Service.
 */
export function isProductionDeployment(): boolean {
  if (process.env.NEXT_PHASE === "phase-production-build") return false
  if (process.env.WEBSITE_SITE_NAME?.trim()) return true
  if (process.env.NODE_ENV === "production") return true
  return false
}

export function requireAzureStorageInProduction(): void {
  if (!isProductionDeployment()) return

  const hasConnectionString = Boolean(process.env.AZURE_STORAGE_CONNECTION_STRING?.trim())
  const storageProvider = (process.env.STORAGE_PROVIDER ?? "").toLowerCase()
  const socialProvider = (process.env.SOCIAL_IMAGE_STORAGE_PROVIDER ?? "").toLowerCase()

  if (storageProvider === "local") {
    throw new Error(
      "STORAGE_PROVIDER=local is not allowed in production. Set STORAGE_PROVIDER=azure and configure Azure Blob Storage."
    )
  }

  if (socialProvider === "local") {
    throw new Error(
      "SOCIAL_IMAGE_STORAGE_PROVIDER=local is not allowed in production. Set azure or configure Blob in Settings."
    )
  }

  if (!hasConnectionString && storageProvider !== "azure" && socialProvider !== "azure") {
    // DB-backed blob config may still work; social layer checks isAzureBlobStorageReady separately.
    if (process.env.FORCE_AZURE_STORAGE_CHECK === "true" && !hasConnectionString) {
      throw new Error(
        "AZURE_STORAGE_CONNECTION_STRING is required in production when FORCE_AZURE_STORAGE_CHECK=true."
      )
    }
  }
}
