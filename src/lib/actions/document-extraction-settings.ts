"use server"

import { revalidatePath } from "next/cache"
import { DocumentExtractionProvider } from "@prisma/client"

import {
  AiConfigurationError,
  isAiConfigurationError,
  isDocumentIntelligenceError,
} from "@/lib/ai/errors"
import { testAzureDocumentIntelligenceConnection } from "@/lib/document-intelligence/azure-document-intelligence-client"
import { clearDocumentExtractionServiceCache } from "@/lib/document-intelligence/document-extraction-service"
import {
  buildDocumentIntelligenceRuntimeFromInput,
  getAzureDocumentIntelligenceSettingsPublic,
  getDecryptedDocumentIntelligenceApiKeyForTest,
} from "@/lib/data/document-extraction-config"
import { encryptSecret } from "@/lib/crypto/encryption"
import { prisma } from "@/lib/prisma"
import { azureDocumentIntelligenceSettingsSchema } from "@/lib/validations/document-extraction"

export type DocumentSettingsActionState = {
  ok: boolean
  message?: string
  fieldErrors?: Record<string, string[]>
  latencyMs?: number
}

function fieldErrors(error: { flatten: () => { fieldErrors: Record<string, string[]> } }) {
  return error.flatten().fieldErrors
}

async function upsertAzureRow() {
  return prisma.documentExtractionConfig.upsert({
    where: { provider: DocumentExtractionProvider.AZURE_DOCUMENT_INTELLIGENCE },
    create: {
      provider: DocumentExtractionProvider.AZURE_DOCUMENT_INTELLIGENCE,
      displayName: "Azure Document Intelligence",
    },
    update: {},
  })
}

async function resolveApiKeyForTest(
  apiKeyFromForm: string | undefined,
  hasStoredKey: boolean
): Promise<string> {
  if (apiKeyFromForm?.trim()) return apiKeyFromForm.trim()
  if (!hasStoredKey) {
    throw new AiConfigurationError("Test için API anahtarı girin veya önce kaydedin.")
  }
  return getDecryptedDocumentIntelligenceApiKeyForTest()
}

export async function saveAzureDocumentIntelligenceSettings(
  input: unknown
): Promise<DocumentSettingsActionState> {
  const parsed = azureDocumentIntelligenceSettingsSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      message: "Ayarlar doğrulanamadı.",
      fieldErrors: fieldErrors(parsed.error),
    }
  }

  const data = parsed.data
  const existing = await upsertAzureRow()

  const shouldUpdateKey =
    data.updateApiKey === true && Boolean(data.apiKey && data.apiKey.trim().length > 0)

  if (!existing.apiKeyCiphertext && !shouldUpdateKey) {
    return { ok: false, message: "İlk kurulum için API anahtarı gereklidir." }
  }

  try {
    let keyFields: {
      apiKeyCiphertext: string
      apiKeyIv: string
      apiKeyAuthTag: string
    } | null = null

    if (shouldUpdateKey && data.apiKey) {
      const encrypted = encryptSecret(data.apiKey.trim())
      keyFields = {
        apiKeyCiphertext: encrypted.ciphertext,
        apiKeyIv: encrypted.iv,
        apiKeyAuthTag: encrypted.authTag,
      }
    }

    await prisma.$transaction(async (tx) => {
      if (data.isActive) {
        await tx.documentExtractionConfig.updateMany({
          where: {
            provider: { not: DocumentExtractionProvider.AZURE_DOCUMENT_INTELLIGENCE },
          },
          data: { isActive: false },
        })
      }

      await tx.documentExtractionConfig.update({
        where: { provider: DocumentExtractionProvider.AZURE_DOCUMENT_INTELLIGENCE },
        data: {
          endpoint: data.endpoint,
          apiVersion: data.apiVersion.trim(),
          timeoutMs: data.timeoutMs,
          pollIntervalMs: data.pollIntervalMs,
          maxPollAttempts: data.maxPollAttempts,
          isActive: data.isActive,
          ...(keyFields ?? {}),
        },
      })
    })

    clearDocumentExtractionServiceCache()
    revalidatePath("/settings")
    revalidatePath("/uploads")
    revalidatePath("/articles/new")

    return { ok: true, message: "Azure Document Intelligence ayarları kaydedildi." }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ayarlar kaydedilemedi."
    return { ok: false, message }
  }
}

export async function testAzureDocumentIntelligenceSettingsConnection(
  input: unknown
): Promise<DocumentSettingsActionState> {
  const parsed = azureDocumentIntelligenceSettingsSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      message: "Bağlantı testi için alanları doğrulayın.",
      fieldErrors: fieldErrors(parsed.error),
    }
  }

  const data = parsed.data
  const publicSettings = await getAzureDocumentIntelligenceSettingsPublic()

  try {
    const apiKey = await resolveApiKeyForTest(data.apiKey, publicSettings.hasApiKey)
    const runtime = buildDocumentIntelligenceRuntimeFromInput({
      endpoint: data.endpoint,
      apiVersion: data.apiVersion,
      timeoutMs: data.timeoutMs,
      pollIntervalMs: data.pollIntervalMs,
      maxPollAttempts: data.maxPollAttempts,
      apiKey,
    })
    const result = await testAzureDocumentIntelligenceConnection(runtime)
    return { ok: true, message: result.message, latencyMs: result.latencyMs }
  } catch (error) {
    return {
      ok: false,
      message: isAiConfigurationError(error)
        ? error.message
        : isDocumentIntelligenceError(error)
          ? error.message
          : error instanceof Error
            ? error.message
            : "Bağlantı testi başarısız.",
    }
  }
}
