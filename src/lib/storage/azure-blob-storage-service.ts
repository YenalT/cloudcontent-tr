import "server-only"

import {
  buildPublicBlobUrl,
  resolveAzureBlobRuntimeConfig,
  setCachedAzureBlobRuntimeConfig,
  type AzureBlobRuntimeConfig,
} from "@/lib/data/storage-provider-config"
import { buildInstagramBlobPath } from "@/lib/storage/instagram-blob-paths"
import {
  AzureBlobStorageError,
  toAdminAzureBlobErrorMessage,
} from "@/lib/storage/azure-blob-errors"
import type { SocialImageUploadInput, StoredSocialImage } from "@/lib/storage/social-image-types"

type BlobModule = typeof import("@azure/storage-blob")

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function loadBlobSdk(): Promise<BlobModule> {
  return import("@azure/storage-blob")
}

type ContainerHandle = Awaited<ReturnType<AzureBlobStorageService["getContainer"]>>

export class AzureBlobStorageService {
  private clientPromise: Promise<ContainerHandle> | null = null

  private async getContainer(config?: AzureBlobRuntimeConfig) {
    const runtime = config ?? (await resolveAzureBlobRuntimeConfig({ requireActive: true }))
    setCachedAzureBlobRuntimeConfig(runtime)
    const { BlobServiceClient } = await loadBlobSdk()
    const service = BlobServiceClient.fromConnectionString(runtime.connectionString)
    const container = service.getContainerClient(runtime.containerName)
    return { container, config: runtime }
  }

  resetClient() {
    this.clientPromise = null
  }

  async testConnection(connectionString?: string): Promise<{ ok: true; accountName: string }> {
    try {
      const { BlobServiceClient } = await loadBlobSdk()
      const cs =
        connectionString?.trim() ??
        (await resolveAzureBlobRuntimeConfig()).connectionString
      const service = BlobServiceClient.fromConnectionString(cs)
      await service.getProperties()
      const accountMatch = cs.match(/AccountName=([^;]+)/i)
      return { ok: true, accountName: accountMatch?.[1]?.trim() ?? "unknown" }
    } catch (error) {
      throw new AzureBlobStorageError(toAdminAzureBlobErrorMessage(error), {
        code: "connection_failed",
        cause: error,
      })
    }
  }

  async ensureContainerExists(connectionString?: string, containerName?: string): Promise<void> {
    try {
      const { BlobServiceClient } = await loadBlobSdk()
      let cs: string
      let name: string

      if (connectionString?.trim()) {
        cs = connectionString.trim()
        name = containerName?.trim() || DEFAULT_CONTAINER_NAME
      } else {
        const config = await resolveAzureBlobRuntimeConfig({ requireActive: true })
        cs = config.connectionString
        name = config.containerName
      }

      const service = BlobServiceClient.fromConnectionString(cs)
      const container = service.getContainerClient(name)
      await container.createIfNotExists()
    } catch (error) {
      throw new AzureBlobStorageError(
        error instanceof AzureBlobStorageError
          ? error.message
          : "Konteyner oluşturulamadı.",
        { code: "container_create_failed", cause: error }
      )
    }
  }

  async upload(input: SocialImageUploadInput): Promise<StoredSocialImage> {
    const { container, config } = await this.getContainer()
    const blobPath = buildInstagramBlobPath(input.postId, input.assetKey, input.mimeType)
    const blockBlob = container.getBlockBlobClient(blobPath)

    let lastError: Error | null = null
    const maxAttempts = Math.max(1, config.maxUploadRetries)

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        await sleep(Math.min(1000 * 2 ** (attempt - 1), 8000))
      }
      try {
        await blockBlob.upload(input.buffer, input.buffer.length, {
          blobHTTPHeaders: {
            blobContentType: input.mimeType,
            blobCacheControl: "public, max-age=31536000",
          },
        })
        lastError = null
        break
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Azure Blob yükleme başarısız.")
        if (attempt === maxAttempts - 1) {
          throw new AzureBlobStorageError(toAdminAzureBlobErrorMessage(lastError), {
            code: "upload_failed",
            retryable: true,
            cause: lastError,
          })
        }
      }
    }

    const publicUrl = buildPublicBlobUrl(config, blobPath)

    if (!publicUrl.startsWith("https://")) {
      throw new AzureBlobStorageError("Public URL HTTPS olmalı.", { code: "invalid_public_url" })
    }

    return {
      storageKey: blobPath,
      publicUrl,
      provider: "azure",
      mimeType: input.mimeType,
      uploadedAt: new Date(),
    }
  }

  async delete(storageKey: string): Promise<void> {
    const { container } = await this.getContainer()
    await container.getBlockBlobClient(storageKey).deleteIfExists()
  }

  getPublicUrl(storageKey: string, config: AzureBlobRuntimeConfig): string {
    return buildPublicBlobUrl(config, storageKey)
  }

  async testPublicUrlAccess(publicUrl: string): Promise<{ ok: true; httpStatus: number }> {
    if (!publicUrl.startsWith("https://")) {
      throw new AzureBlobStorageError("Public URL https:// ile başlamalı.", {
        code: "invalid_url",
      })
    }

    try {
      const response = await fetch(publicUrl, {
        method: "HEAD",
        signal: AbortSignal.timeout(15000),
      })

      if (response.status === 403 || response.status === 401) {
        throw new AzureBlobStorageError(
          "Konteyner veya blob özel (private). Public erişim veya Public Base URL ayarlayın.",
          { code: "container_private" }
        )
      }

      if (!response.ok && response.status !== 405) {
        throw new AzureBlobStorageError(
          `Public URL erişilemedi (HTTP ${response.status}).`,
          { code: "public_url_unreachable" }
        )
      }

      return { ok: true, httpStatus: response.status }
    } catch (error) {
      if (error instanceof AzureBlobStorageError) throw error
      throw new AzureBlobStorageError(
        "Public URL’ye erişilemedi. Konteynerin public read olduğundan emin olun.",
        { code: "public_url_unreachable", cause: error }
      )
    }
  }
}

const DEFAULT_CONTAINER_NAME = "instagram-assets"

let singleton: AzureBlobStorageService | null = null

export function getAzureBlobStorageService(): AzureBlobStorageService {
  if (!singleton) singleton = new AzureBlobStorageService()
  return singleton
}
