import {
  buildPublicBlobUrl,
  getCachedOrEnvAzureBlobRuntimeConfig,
} from "@/lib/data/storage-provider-config"
import { getAzureBlobStorageService } from "@/lib/storage/azure-blob-storage-service"
import type {
  SocialImageStorageService,
  SocialImageUploadInput,
  StoredSocialImage,
} from "@/lib/storage/social-image-types"
import { buildAzureBlobPublicUrl } from "@/lib/storage/azure-blob-config"

/** Azure Blob storage for Instagram images — configured via admin Settings or env fallback. */
export class AzureSocialImageStorageService implements SocialImageStorageService {
  readonly provider = "azure"
  private readonly blob = getAzureBlobStorageService()

  async upload(input: SocialImageUploadInput): Promise<StoredSocialImage> {
    return this.blob.upload(input)
  }

  async delete(storageKey: string): Promise<void> {
    return this.blob.delete(storageKey)
  }

  getPublicUrl(storageKey: string): string {
    const cached = getCachedOrEnvAzureBlobRuntimeConfig()
    if (cached) {
      return buildPublicBlobUrl(cached, storageKey)
    }
    return buildAzureBlobPublicUrl("account", "instagram-assets", storageKey)
  }
}
