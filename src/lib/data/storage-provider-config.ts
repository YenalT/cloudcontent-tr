import "server-only"

import { decryptSecret } from "@/lib/crypto/encryption"
import { isSettingsEncryptionConfigured } from "@/lib/env/settings-encryption"
import { prisma } from "@/lib/prisma"
import {
  AzureBlobStorageError,
  maskConnectionString,
} from "@/lib/storage/azure-blob-errors"
import { buildAzureBlobPublicUrl } from "@/lib/storage/azure-blob-config"

export type StorageProviderSettingsPublic = {
  providerName: string
  storageAccountName: string
  containerName: string
  publicBaseUrl: string
  enablePublicUrls: boolean
  isActive: boolean
  hasConnectionString: boolean
  connectionStringMasked: string | null
  hasEnvConnectionString: boolean
  encryptionConfigured: boolean
}

export type AzureBlobRuntimeConfig = {
  connectionString: string
  storageAccountName: string
  containerName: string
  publicBaseUrl: string | null
  enablePublicUrls: boolean
  maxUploadRetries: number
  source: "database" | "environment"
}

const CONFIG_ID = "azure_blob"
const DEFAULT_CONTAINER = "instagram-assets"

function parseAccountNameFromConnectionString(connectionString: string): string {
  const match = connectionString.match(/AccountName=([^;]+)/i)
  const name = match?.[1]?.trim()
  if (!name) {
    throw new AzureBlobStorageError(
      "Geçersiz bağlantı dizesi: AccountName bulunamadı.",
      { code: "invalid_connection_string" }
    )
  }
  return name
}

function hasEnvConnectionString(): boolean {
  return Boolean(process.env.AZURE_STORAGE_CONNECTION_STRING?.trim())
}

export async function getStorageProviderSettingsPublic(): Promise<StorageProviderSettingsPublic> {
  const row = await prisma.storageProviderConfig.findUnique({
    where: { id: CONFIG_ID },
  })

  if (!row) {
    return {
      providerName: "azure_blob",
      storageAccountName: "",
      containerName: DEFAULT_CONTAINER,
      publicBaseUrl: "",
      enablePublicUrls: true,
      isActive: false,
      hasConnectionString: false,
      connectionStringMasked: null,
      hasEnvConnectionString: hasEnvConnectionString(),
      encryptionConfigured: isSettingsEncryptionConfigured(),
    }
  }

  let connectionStringMasked: string | null = null
  if (
    row.connectionStringCiphertext &&
    row.connectionStringIv &&
    row.connectionStringAuthTag
  ) {
    try {
      const plain = decryptSecret({
        ciphertext: row.connectionStringCiphertext,
        iv: row.connectionStringIv,
        authTag: row.connectionStringAuthTag,
      })
      connectionStringMasked = maskConnectionString(plain)
    } catch {
      connectionStringMasked = "DefaultEndpointsProtocol=https;AccountName=••••;AccountKey=••••••••"
    }
  }

  return {
    providerName: row.providerName,
    storageAccountName: row.storageAccountName ?? "",
    containerName: row.containerName,
    publicBaseUrl: row.publicBaseUrl ?? "",
    enablePublicUrls: row.enablePublicUrls,
    isActive: row.isActive,
    hasConnectionString: Boolean(row.connectionStringCiphertext),
    connectionStringMasked,
    hasEnvConnectionString: hasEnvConnectionString(),
    encryptionConfigured: isSettingsEncryptionConfigured(),
  }
}

async function decryptStoredConnectionString(row: {
  connectionStringCiphertext: string | null
  connectionStringIv: string | null
  connectionStringAuthTag: string | null
}): Promise<string> {
  if (
    !row.connectionStringCiphertext ||
    !row.connectionStringIv ||
    !row.connectionStringAuthTag
  ) {
    throw new AzureBlobStorageError("Azure Blob bağlantı dizesi kayıtlı değil.", {
      code: "missing_connection_string",
    })
  }
  try {
    return decryptSecret({
      ciphertext: row.connectionStringCiphertext,
      iv: row.connectionStringIv,
      authTag: row.connectionStringAuthTag,
    })
  } catch {
    throw new AzureBlobStorageError(
      "Bağlantı dizesi çözülemedi. SETTINGS_ENCRYPTION_KEY değişmiş olabilir.",
      { code: "decrypt_failed" }
    )
  }
}

function resolveFromEnvironment(): AzureBlobRuntimeConfig | null {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim()
  if (!connectionString) return null

  const containerName =
    process.env.AZURE_BLOB_CONTAINER_NAME?.trim() ||
    process.env.AZURE_STORAGE_CONTAINER_NAME?.trim() ||
    DEFAULT_CONTAINER

  const accountName = parseAccountNameFromConnectionString(connectionString)
  const publicBaseUrl =
    process.env.AZURE_STORAGE_PUBLIC_BASE_URL?.trim().replace(/\/+$/, "") || null

  const maxUploadRetries = Number(process.env.AZURE_BLOB_UPLOAD_MAX_RETRIES ?? "3")

  return {
    connectionString,
    storageAccountName: accountName,
    containerName,
    publicBaseUrl,
    enablePublicUrls: true,
    maxUploadRetries: Number.isFinite(maxUploadRetries) ? maxUploadRetries : 3,
    source: "environment",
  }
}

export async function resolveAzureBlobRuntimeConfig(options?: {
  requireActive?: boolean
}): Promise<AzureBlobRuntimeConfig> {
  const row = await prisma.storageProviderConfig.findUnique({
    where: { id: CONFIG_ID },
  })

  if (row?.connectionStringCiphertext && row.connectionStringIv && row.connectionStringAuthTag) {
    if (options?.requireActive && !row.isActive) {
      throw new AzureBlobStorageError(
        "Azure Blob Storage pasif. Ayarlar sayfasından etkinleştirin.",
        { code: "inactive" }
      )
    }

    const connectionString = await decryptStoredConnectionString(row)
    const accountFromCs = parseAccountNameFromConnectionString(connectionString)

    const maxUploadRetries = Number(process.env.AZURE_BLOB_UPLOAD_MAX_RETRIES ?? "3")

    return {
      connectionString,
      storageAccountName: row.storageAccountName?.trim() || accountFromCs,
      containerName: row.containerName?.trim() || DEFAULT_CONTAINER,
      publicBaseUrl: row.publicBaseUrl?.trim().replace(/\/+$/, "") || null,
      enablePublicUrls: row.enablePublicUrls,
      maxUploadRetries: Number.isFinite(maxUploadRetries) ? maxUploadRetries : 3,
      source: "database",
    }
  }

  const envConfig = resolveFromEnvironment()
  if (envConfig) {
    if (options?.requireActive && row && !row.isActive) {
      throw new AzureBlobStorageError(
        "Azure Blob Storage pasif. Ayarlar sayfasından etkinleştirin.",
        { code: "inactive" }
      )
    }
    return envConfig
  }

  throw new AzureBlobStorageError(
    "Azure Blob Storage yapılandırılmamış. Ayarlar’dan bağlantı dizesini kaydedin.",
    { code: "not_configured" }
  )
}

export async function isAzureBlobStorageReady(): Promise<boolean> {
  const row = await prisma.storageProviderConfig.findUnique({
    where: { id: CONFIG_ID },
  })

  if (row) {
    if (!row.isActive) return false
    if (
      row.connectionStringCiphertext &&
      row.connectionStringIv &&
      row.connectionStringAuthTag
    ) {
      try {
        await decryptStoredConnectionString(row)
        return true
      } catch {
        return false
      }
    }
  }

  return hasEnvConnectionString()
}

export function buildPublicBlobUrl(
  config: AzureBlobRuntimeConfig,
  blobPath: string
): string {
  if (config.publicBaseUrl && config.enablePublicUrls) {
    return `${config.publicBaseUrl}/${blobPath}`
  }
  return buildAzureBlobPublicUrl(
    config.storageAccountName,
    config.containerName,
    blobPath
  )
}

export async function getDecryptedConnectionStringForTest(): Promise<string> {
  const config = await resolveAzureBlobRuntimeConfig()
  return config.connectionString
}

let cachedRuntimeConfig: AzureBlobRuntimeConfig | null = null

export function setCachedAzureBlobRuntimeConfig(config: AzureBlobRuntimeConfig | null) {
  cachedRuntimeConfig = config
}

/** Sync public URL build when runtime was resolved recently (e.g. after upload). */
export function getCachedOrEnvAzureBlobRuntimeConfig(): AzureBlobRuntimeConfig | null {
  if (cachedRuntimeConfig) return cachedRuntimeConfig
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim()
  if (!connectionString) return null
  try {
    const accountName = parseAccountNameFromConnectionString(connectionString)
    const containerName =
      process.env.AZURE_BLOB_CONTAINER_NAME?.trim() ||
      process.env.AZURE_STORAGE_CONTAINER_NAME?.trim() ||
      DEFAULT_CONTAINER
    return {
      connectionString,
      storageAccountName: accountName,
      containerName,
      publicBaseUrl: process.env.AZURE_STORAGE_PUBLIC_BASE_URL?.trim().replace(/\/+$/, "") || null,
      enablePublicUrls: true,
      maxUploadRetries: 3,
      source: "environment",
    }
  } catch {
    return null
  }
}
