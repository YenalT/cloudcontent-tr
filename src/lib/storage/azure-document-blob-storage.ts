import "server-only"

import {
  buildDocumentPublicBlobUrl,
  resolveAzureDocumentsBlobConfig,
} from "@/lib/storage/azure-documents-config"
import {
  AzureBlobStorageError,
  toAdminAzureBlobErrorMessage,
} from "@/lib/storage/azure-blob-errors"
import type { StorageService, StoredFile, UploadFileInput } from "@/lib/storage/types"

type BlobModule = typeof import("@azure/storage-blob")

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_")
}

async function loadBlobSdk(): Promise<BlobModule> {
  return import("@azure/storage-blob")
}

export class AzureDocumentBlobStorageService implements StorageService {
  readonly provider = "azure"

  async upload(input: UploadFileInput): Promise<StoredFile> {
    const config = await resolveAzureDocumentsBlobConfig({ requireActive: true })
    const { BlobServiceClient } = await loadBlobSdk()
    const service = BlobServiceClient.fromConnectionString(config.connectionString)
    const container = service.getContainerClient(config.containerName)
    await container.createIfNotExists()

    const safeName = sanitizeFileName(input.fileName)
    const blobPath = `documents/${input.documentId}/${safeName}`
    const blockBlob = container.getBlockBlobClient(blobPath)

    try {
      await blockBlob.upload(input.buffer, input.buffer.length, {
        blobHTTPHeaders: {
          blobContentType: input.mimeType,
          blobCacheControl: "private, max-age=3600",
        },
      })
    } catch (error) {
      throw new AzureBlobStorageError(toAdminAzureBlobErrorMessage(error), {
        code: "upload_failed",
        cause: error,
      })
    }

    const publicUrl = buildDocumentPublicBlobUrl(config, blobPath)
    if (!publicUrl.startsWith("https://")) {
      throw new AzureBlobStorageError("Document blob URL must be HTTPS.", {
        code: "invalid_public_url",
      })
    }

    return {
      storageKey: blobPath,
      publicUrl,
    }
  }

  async delete(storageKey: string): Promise<void> {
    const config = await resolveAzureDocumentsBlobConfig()
    const { BlobServiceClient } = await loadBlobSdk()
    const service = BlobServiceClient.fromConnectionString(config.connectionString)
    const container = service.getContainerClient(config.containerName)
    await container.getBlockBlobClient(storageKey).deleteIfExists()
  }

  getPublicUrl(storageKey: string): string {
    throw new Error(
      "getPublicUrl is async for Azure documents; use stored fileUrl from upload result."
    )
  }

  async resolvePublicUrl(storageKey: string): Promise<string> {
    const config = await resolveAzureDocumentsBlobConfig()
    return buildDocumentPublicBlobUrl(config, storageKey)
  }

  async download(storageKey: string): Promise<Buffer> {
    const config = await resolveAzureDocumentsBlobConfig()
    const { BlobServiceClient } = await loadBlobSdk()
    const service = BlobServiceClient.fromConnectionString(config.connectionString)
    const container = service.getContainerClient(config.containerName)
    const blob = container.getBlockBlobClient(storageKey)
    const downloaded = await blob.download(0)
    const chunks: Buffer[] = []
    if (!downloaded.readableStreamBody) {
      throw new AzureBlobStorageError("Blob indirilemedi.", { code: "download_failed" })
    }
    for await (const chunk of downloaded.readableStreamBody) {
      chunks.push(Buffer.from(chunk))
    }
    return Buffer.concat(chunks)
  }
}
