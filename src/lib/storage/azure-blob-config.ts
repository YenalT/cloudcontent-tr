import "server-only"

import { isAzureBlobStorageReady } from "@/lib/data/storage-provider-config"

const DEFAULT_CONTAINER = "instagram-assets"

export type AzureBlobConfig = {
  connectionString: string
  containerName: string
  accountName: string
  maxUploadRetries: number
}

/** @deprecated Use resolveAzureBlobRuntimeConfig from storage-provider-config */
export function isAzureBlobConfigured(): boolean {
  const env = Boolean(process.env.AZURE_STORAGE_CONNECTION_STRING?.trim())
  if (env) return true
  return false
}

export async function isAzureBlobConfiguredAsync(): Promise<boolean> {
  try {
    return await isAzureBlobStorageReady()
  } catch {
    const env = Boolean(process.env.AZURE_STORAGE_CONNECTION_STRING?.trim())
    return env
  }
}

/** https://<account>.blob.core.windows.net/<container>/<blobPath> */
export function buildAzureBlobPublicUrl(
  accountName: string,
  containerName: string,
  blobPath: string
): string {
  const encodedPath = blobPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")
  return `https://${accountName}.blob.core.windows.net/${containerName}/${encodedPath}`
}

export function usesLocalSocialImageFallback(): boolean {
  const forced = process.env.SOCIAL_IMAGE_STORAGE_PROVIDER?.toLowerCase()
  if (forced === "azure") return false
  if (forced === "local") return true
  return !process.env.AZURE_STORAGE_CONNECTION_STRING?.trim()
}

export async function usesLocalSocialImageFallbackAsync(): Promise<boolean> {
  const forced = process.env.SOCIAL_IMAGE_STORAGE_PROVIDER?.toLowerCase()
  if (forced === "azure") return false
  if (forced === "local") return true
  return !(await isAzureBlobConfiguredAsync())
}

export { DEFAULT_CONTAINER }
