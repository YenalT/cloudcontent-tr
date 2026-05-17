import { isProductionDeployment, requireAzureStorageInProduction } from "@/lib/env/deployment"
import { isAzureBlobStorageReady } from "@/lib/data/storage-provider-config"
import { AzureBlobStorageService } from "@/lib/storage/azure-blob-storage"
import { LocalStorageService } from "@/lib/storage/local-storage"
import type { StorageService } from "@/lib/storage/types"

export type { StorageService, StoredFile, UploadFileInput } from "@/lib/storage/types"
export { LocalStorageService } from "@/lib/storage/local-storage"
export { AzureBlobStorageService } from "@/lib/storage/azure-blob-storage"

let cached: StorageService | null = null

function resolveStorageProvider(): "azure" | "local" {
  const explicit = (process.env.STORAGE_PROVIDER ?? "").toLowerCase()
  if (explicit === "azure" || explicit === "local") {
    return explicit
  }
  if (isProductionDeployment()) {
    return "azure"
  }
  if (process.env.AZURE_STORAGE_CONNECTION_STRING?.trim()) {
    return "azure"
  }
  return "local"
}

export function getStorageService(): StorageService {
  requireAzureStorageInProduction()

  if (cached) return cached

  const provider = resolveStorageProvider()

  if (provider === "azure") {
    cached = new AzureBlobStorageService()
    return cached
  }

  if (isProductionDeployment()) {
    throw new Error(
      "Production requires Azure Blob Storage for document uploads. Set STORAGE_PROVIDER=azure and AZURE_STORAGE_CONNECTION_STRING."
    )
  }

  cached = new LocalStorageService()
  return cached
}

export async function getStorageServiceAsync(): Promise<StorageService> {
  requireAzureStorageInProduction()

  const explicit = (process.env.STORAGE_PROVIDER ?? "").toLowerCase()
  let useAzure = explicit === "azure"

  if (!useAzure && explicit !== "local") {
    if (isProductionDeployment()) {
      useAzure = true
    } else {
      useAzure = await isAzureBlobStorageReady()
    }
  }

  if (useAzure) {
    if (!cached || cached.provider !== "azure") {
      cached = new AzureBlobStorageService()
    }
    return cached
  }

  if (isProductionDeployment()) {
    throw new Error("Azure Blob Storage is required in production for document uploads.")
  }

  if (!cached || cached.provider !== "local") {
    cached = new LocalStorageService()
  }
  return cached
}

export function getLocalStorageService(): LocalStorageService | null {
  const service = getStorageService()
  return service instanceof LocalStorageService ? service : null
}

export function resetStorageServiceCache() {
  cached = null
}
