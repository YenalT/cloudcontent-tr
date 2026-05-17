import "server-only"

import {
  buildPublicBlobUrl,
  resolveAzureBlobRuntimeConfig,
  type AzureBlobRuntimeConfig,
} from "@/lib/data/storage-provider-config"

const DEFAULT_DOCUMENTS_CONTAINER = "documents"

/** Blob config for uploaded documents (separate container from instagram-assets). */
export async function resolveAzureDocumentsBlobConfig(options?: {
  requireActive?: boolean
}): Promise<AzureBlobRuntimeConfig> {
  const base = await resolveAzureBlobRuntimeConfig(options)
  const containerName =
    process.env.AZURE_DOCUMENTS_CONTAINER_NAME?.trim() ||
    process.env.AZURE_STORAGE_DOCUMENTS_CONTAINER_NAME?.trim() ||
    DEFAULT_DOCUMENTS_CONTAINER

  return {
    ...base,
    containerName,
  }
}

export function buildDocumentPublicBlobUrl(
  config: AzureBlobRuntimeConfig,
  blobPath: string
): string {
  return buildPublicBlobUrl(config, blobPath)
}
