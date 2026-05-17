import { isProductionDeployment } from "@/lib/env/deployment"
import { isAzureBlobStorageReady } from "@/lib/data/storage-provider-config"
import { AzureSocialImageStorageService } from "@/lib/storage/azure-social-image-storage"
import { LocalSocialImageStorageService } from "@/lib/storage/local-social-image-storage"
import type { SocialImageStorageService } from "@/lib/storage/social-image-types"

export type {
  SocialImageStorageService,
  SocialImageUploadInput,
  StoredSocialImage,
} from "@/lib/storage/social-image-types"
export { LocalSocialImageStorageService } from "@/lib/storage/local-social-image-storage"

let cached: SocialImageStorageService | null = null
let cachedProvider: string | null = null

export async function getSocialImageStorageProviderNameAsync(): Promise<string> {
  const ready = await isAzureBlobStorageReady()
  return ready ? "azure" : "local"
}

export function getSocialImageStorageProviderName(): string {
  if (process.env.AZURE_STORAGE_CONNECTION_STRING?.trim()) return "azure"
  if (process.env.SOCIAL_IMAGE_STORAGE_PROVIDER?.toLowerCase() === "azure") return "azure"
  return "local"
}

export async function isLocalSocialImageStorageActiveAsync(): Promise<boolean> {
  return (await getSocialImageStorageProviderNameAsync()) === "local"
}

export function isLocalSocialImageStorageActive(): boolean {
  const forced = process.env.SOCIAL_IMAGE_STORAGE_PROVIDER?.toLowerCase()
  if (forced === "azure") return false
  if (forced === "local") return true
  return !process.env.AZURE_STORAGE_CONNECTION_STRING?.trim()
}

export async function getSocialImageStorageServiceAsync(): Promise<SocialImageStorageService> {
  const forced = process.env.SOCIAL_IMAGE_STORAGE_PROVIDER?.toLowerCase()
  let useAzure = forced === "azure"
  if (!useAzure && forced !== "local") {
    useAzure = isProductionDeployment() || (await isAzureBlobStorageReady())
  }

  if (isProductionDeployment() && !useAzure) {
    throw new Error(
      "Production requires Azure Blob for Instagram images. Configure Blob Storage and set SOCIAL_IMAGE_STORAGE_PROVIDER=azure."
    )
  }

  const provider = useAzure ? "azure" : "local"
  if (cached && cachedProvider === provider) return cached

  cached = useAzure ? new AzureSocialImageStorageService() : new LocalSocialImageStorageService()
  cachedProvider = provider
  return cached
}

export function getSocialImageStorageService(): SocialImageStorageService {
  const forced = process.env.SOCIAL_IMAGE_STORAGE_PROVIDER?.toLowerCase()

  if (
    isProductionDeployment() &&
    forced === "local"
  ) {
    throw new Error("SOCIAL_IMAGE_STORAGE_PROVIDER=local is not allowed in production.")
  }

  if (forced === "azure" || (forced !== "local" && process.env.AZURE_STORAGE_CONNECTION_STRING?.trim())) {
    if (!cached || cachedProvider !== "azure") {
      cached = new AzureSocialImageStorageService()
      cachedProvider = "azure"
    }
    return cached
  }

  if (isProductionDeployment()) {
    throw new Error(
      "Azure Blob Storage is required in production for Instagram images. Set AZURE_STORAGE_CONNECTION_STRING or configure Settings."
    )
  }

  if (!cached || cachedProvider !== "local") {
    cached = new LocalSocialImageStorageService()
    cachedProvider = "local"
  }
  return cached
}

export function resetSocialImageStorageCache() {
  cached = null
  cachedProvider = null
}

export function getLocalSocialImageStorageService(): LocalSocialImageStorageService | null {
  const service = getSocialImageStorageService()
  return service instanceof LocalSocialImageStorageService ? service : null
}
