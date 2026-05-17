"use server"

import { revalidatePath } from "next/cache"

import { encryptSecret } from "@/lib/crypto/encryption"
import {
  getDecryptedConnectionStringForTest,
  getStorageProviderSettingsPublic,
} from "@/lib/data/storage-provider-config"
import { prisma } from "@/lib/prisma"
import {
  AzureBlobStorageError,
  toAdminAzureBlobErrorMessage,
} from "@/lib/storage/azure-blob-errors"
import { getAzureBlobStorageService } from "@/lib/storage/azure-blob-storage-service"
import { resetSocialImageStorageCache } from "@/lib/storage/social-image-storage"
import {
  storageProviderPublicUrlTestSchema,
  storageProviderSettingsSchema,
  storageProviderTestSchema,
} from "@/lib/validations/storage-provider"

export type StorageProviderSettingsActionState = {
  ok: boolean
  message?: string
  fieldErrors?: Record<string, string[]>
  latencyMs?: number
}

const CONFIG_ID = "azure_blob"

function fieldErrors(error: { flatten: () => { fieldErrors: Record<string, string[]> } }) {
  return error.flatten().fieldErrors
}

function hasEnvConnectionString(): boolean {
  return Boolean(process.env.AZURE_STORAGE_CONNECTION_STRING?.trim())
}

async function upsertStorageRow() {
  return prisma.storageProviderConfig.upsert({
    where: { id: CONFIG_ID },
    create: {
      id: CONFIG_ID,
      providerName: "azure_blob",
      containerName: "instagram-assets",
    },
    update: {},
  })
}

async function resolveConnectionStringForTest(
  fromForm: string | undefined,
  hasStored: boolean
): Promise<string> {
  if (fromForm?.trim()) return fromForm.trim()
  if (!hasStored && !hasEnvConnectionString()) {
    throw new AzureBlobStorageError("Test için bağlantı dizesi girin veya önce kaydedin.")
  }
  return getDecryptedConnectionStringForTest()
}

export async function saveStorageProviderSettings(
  input: unknown
): Promise<StorageProviderSettingsActionState> {
  const parsed = storageProviderSettingsSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      message: "Ayarlar doğrulanamadı.",
      fieldErrors: fieldErrors(parsed.error),
    }
  }

  const data = parsed.data
  const existing = await upsertStorageRow()

  const shouldUpdateCs =
    data.updateConnectionString === true &&
    Boolean(data.connectionString && data.connectionString.length > 0)

  if (!existing.connectionStringCiphertext && !shouldUpdateCs && !hasEnvConnectionString()) {
    return {
      ok: false,
      message:
        "İlk kurulum için bağlantı dizesi gereklidir (form veya AZURE_STORAGE_CONNECTION_STRING).",
    }
  }

  try {
    let csFields: {
      connectionStringCiphertext: string
      connectionStringIv: string
      connectionStringAuthTag: string
    } | null = null

    if (shouldUpdateCs && data.connectionString) {
      const encrypted = encryptSecret(data.connectionString)
      csFields = {
        connectionStringCiphertext: encrypted.ciphertext,
        connectionStringIv: encrypted.iv,
        connectionStringAuthTag: encrypted.authTag,
      }
    }

    await prisma.storageProviderConfig.update({
      where: { id: CONFIG_ID },
      data: {
        storageAccountName: data.storageAccountName?.trim() || null,
        containerName: data.containerName,
        publicBaseUrl: data.publicBaseUrl?.trim() || null,
        enablePublicUrls: data.enablePublicUrls,
        isActive: data.isActive,
        ...(csFields ?? {}),
      },
    })

    resetSocialImageStorageCache()
    getAzureBlobStorageService().resetClient()

    revalidatePath("/settings")
    revalidatePath("/instagram")

    return { ok: true, message: "Azure Blob Storage ayarları kaydedildi." }
  } catch (error) {
    return {
      ok: false,
      message: toAdminAzureBlobErrorMessage(error),
    }
  }
}

export async function testAzureBlobConnection(
  input: unknown
): Promise<StorageProviderSettingsActionState> {
  const parsed = storageProviderTestSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      message: "Bağlantı testi için alanları doğrulayın.",
      fieldErrors: fieldErrors(parsed.error),
    }
  }

  const publicSettings = await getStorageProviderSettingsPublic()
  const started = Date.now()

  try {
    const connectionString = await resolveConnectionStringForTest(
      parsed.data.connectionString,
      publicSettings.hasConnectionString
    )
    const result = await getAzureBlobStorageService().testConnection(connectionString)
    return {
      ok: true,
      message: `Azure Blob bağlantısı başarılı (hesap: ${result.accountName}).`,
      latencyMs: Date.now() - started,
    }
  } catch (error) {
    return {
      ok: false,
      message: toAdminAzureBlobErrorMessage(error),
    }
  }
}

export async function createAzureBlobContainerIfMissing(
  input: unknown
): Promise<StorageProviderSettingsActionState> {
  const parsed = storageProviderTestSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: "Konteyner oluşturmak için ayarları doğrulayın." }
  }

  const publicSettings = await getStorageProviderSettingsPublic()

  try {
    const connectionString = await resolveConnectionStringForTest(
      parsed.data.connectionString,
      publicSettings.hasConnectionString
    )
    await getAzureBlobStorageService().ensureContainerExists(
      connectionString,
      parsed.data.containerName
    )
    return { ok: true, message: `Konteyner «${parsed.data.containerName}» hazır.` }
  } catch (error) {
    return { ok: false, message: toAdminAzureBlobErrorMessage(error) }
  }
}

export async function testAzureBlobPublicUrlAccess(
  input: unknown
): Promise<StorageProviderSettingsActionState> {
  const parsed = storageProviderPublicUrlTestSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      message: "Geçerli bir public URL girin.",
      fieldErrors: fieldErrors(parsed.error),
    }
  }

  const started = Date.now()
  try {
    const result = await getAzureBlobStorageService().testPublicUrlAccess(parsed.data.publicUrl)
    return {
      ok: true,
      message: `Public URL erişilebilir (HTTP ${result.httpStatus}).`,
      latencyMs: Date.now() - started,
    }
  } catch (error) {
    return { ok: false, message: toAdminAzureBlobErrorMessage(error) }
  }
}
