import "server-only"

import { DocumentExtractionProvider } from "@prisma/client"

import { AiConfigurationError } from "@/lib/ai/errors"
import { isSettingsEncryptionConfigured } from "@/lib/env/settings-encryption"
import type { AzureDocumentIntelligenceRuntimeConfig } from "@/lib/document-intelligence/azure-document-intelligence-types"
import { decryptSecret, maskApiKey } from "@/lib/crypto/encryption"
import { validateDocumentIntelligenceEndpoint } from "@/lib/document-intelligence/endpoint-utils"
import { prisma } from "@/lib/prisma"

export type AzureDocumentIntelligenceSettingsPublic = {
  provider: "AZURE_DOCUMENT_INTELLIGENCE"
  displayName: string
  isActive: boolean
  endpoint: string
  apiVersion: string
  timeoutMs: number
  pollIntervalMs: number
  maxPollAttempts: number
  hasApiKey: boolean
  apiKeyMasked: string | null
  encryptionConfigured: boolean
}

export async function getAzureDocumentIntelligenceSettingsPublic(): Promise<AzureDocumentIntelligenceSettingsPublic> {
  const row = await prisma.documentExtractionConfig.findUnique({
    where: { provider: DocumentExtractionProvider.AZURE_DOCUMENT_INTELLIGENCE },
  })

  if (!row) {
    return {
      provider: "AZURE_DOCUMENT_INTELLIGENCE",
      displayName: "Azure Document Intelligence",
      isActive: false,
      endpoint: "",
      apiVersion: "2024-11-30",
      timeoutMs: 120000,
      pollIntervalMs: 2000,
      maxPollAttempts: 90,
      hasApiKey: false,
      apiKeyMasked: null,
      encryptionConfigured: isSettingsEncryptionConfigured(),
    }
  }

  let apiKeyMasked: string | null = null
  if (row.apiKeyCiphertext && row.apiKeyIv && row.apiKeyAuthTag) {
    try {
      const plain = decryptSecret({
        ciphertext: row.apiKeyCiphertext,
        iv: row.apiKeyIv,
        authTag: row.apiKeyAuthTag,
      })
      apiKeyMasked = maskApiKey(plain)
    } catch {
      apiKeyMasked = "••••"
    }
  }

  return {
    provider: "AZURE_DOCUMENT_INTELLIGENCE",
    displayName: row.displayName,
    isActive: row.isActive,
    endpoint: row.endpoint ?? "",
    apiVersion: row.apiVersion,
    timeoutMs: row.timeoutMs,
    pollIntervalMs: row.pollIntervalMs,
    maxPollAttempts: row.maxPollAttempts,
    hasApiKey: Boolean(row.apiKeyCiphertext),
    apiKeyMasked,
    encryptionConfigured: isSettingsEncryptionConfigured(),
  }
}

export async function getActiveDocumentExtractionProvider(): Promise<DocumentExtractionProvider | null> {
  const active = await prisma.documentExtractionConfig.findFirst({
    where: { isActive: true },
  })
  return active?.provider ?? null
}

async function decryptStoredApiKey(row: {
  apiKeyCiphertext: string | null
  apiKeyIv: string | null
  apiKeyAuthTag: string | null
}) {
  if (!row.apiKeyCiphertext || !row.apiKeyIv || !row.apiKeyAuthTag) {
    throw new AiConfigurationError("Azure Document Intelligence API Key kayıtlı değil.")
  }
  try {
    return decryptSecret({
      ciphertext: row.apiKeyCiphertext,
      iv: row.apiKeyIv,
      authTag: row.apiKeyAuthTag,
    })
  } catch {
    throw new AiConfigurationError(
      "API anahtarı çözülemedi. SETTINGS_ENCRYPTION_KEY değişmiş olabilir."
    )
  }
}

export async function getDecryptedDocumentIntelligenceApiKeyForTest(): Promise<string> {
  const row = await prisma.documentExtractionConfig.findUnique({
    where: { provider: DocumentExtractionProvider.AZURE_DOCUMENT_INTELLIGENCE },
  })
  if (!row) {
    throw new AiConfigurationError("Azure Document Intelligence yapılandırması bulunamadı.")
  }
  return decryptStoredApiKey(row)
}

export async function resolveAzureDocumentIntelligenceRuntimeConfig(): Promise<AzureDocumentIntelligenceRuntimeConfig> {
  if (!isSettingsEncryptionConfigured()) {
    throw new AiConfigurationError(
      "SETTINGS_ENCRYPTION_KEY sunucu ortam değişkeni yapılandırılmamış."
    )
  }

  const row = await prisma.documentExtractionConfig.findUnique({
    where: { provider: DocumentExtractionProvider.AZURE_DOCUMENT_INTELLIGENCE },
  })

  if (!row) {
    throw new AiConfigurationError(
      "Azure Document Intelligence yapılandırması bulunamadı. Ayarlar sayfasından yapılandırın."
    )
  }

  if (!row.isActive) {
    throw new AiConfigurationError(
      "Azure Document Intelligence sağlayıcısı pasif. Ayarlar sayfasından etkinleştirin."
    )
  }

  if (!row.endpoint?.trim()) {
    throw new AiConfigurationError("Azure Document Intelligence Endpoint eksik.")
  }

  const endpointValidation = validateDocumentIntelligenceEndpoint(row.endpoint)
  if (!endpointValidation.ok) {
    throw new AiConfigurationError(endpointValidation.message)
  }

  const apiKey = await decryptStoredApiKey(row)

  return {
    endpoint: endpointValidation.normalized,
    apiKey,
    apiVersion: row.apiVersion,
    timeoutMs: row.timeoutMs,
    pollIntervalMs: row.pollIntervalMs,
    maxPollAttempts: row.maxPollAttempts,
  }
}

export function buildDocumentIntelligenceRuntimeFromInput(
  input: Omit<AzureDocumentIntelligenceRuntimeConfig, "apiKey"> & { apiKey: string }
): AzureDocumentIntelligenceRuntimeConfig {
  const endpointValidation = validateDocumentIntelligenceEndpoint(input.endpoint)
  if (!endpointValidation.ok) {
    throw new AiConfigurationError(endpointValidation.message)
  }

  return {
    endpoint: endpointValidation.normalized,
    apiKey: input.apiKey,
    apiVersion: input.apiVersion.trim(),
    timeoutMs: input.timeoutMs,
    pollIntervalMs: input.pollIntervalMs,
    maxPollAttempts: input.maxPollAttempts,
  }
}
