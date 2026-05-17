import "server-only"

import { AiProvider } from "@prisma/client"

import { decryptSecret, maskApiKey } from "@/lib/crypto/encryption"
import { AiConfigurationError } from "@/lib/ai/errors"
import { isSettingsEncryptionConfigured } from "@/lib/env/settings-encryption"
import type { AzureOpenAiRuntimeConfig } from "@/lib/ai/azure-openai-types"
import { prisma } from "@/lib/prisma"

export type AzureOpenAiSettingsPublic = {
  provider: "AZURE_OPENAI"
  displayName: string
  isActive: boolean
  endpoint: string
  deploymentName: string
  apiVersion: string
  temperature: number
  maxTokens: number
  timeoutMs: number
  hasApiKey: boolean
  apiKeyMasked: string | null
  encryptionConfigured: boolean
}

export async function getAzureOpenAiSettingsPublic(): Promise<AzureOpenAiSettingsPublic> {
  const row = await prisma.aiProviderConfig.findUnique({
    where: { provider: AiProvider.AZURE_OPENAI },
  })

  if (!row) {
    return {
      provider: "AZURE_OPENAI",
      displayName: "Azure OpenAI",
      isActive: false,
      endpoint: "",
      deploymentName: "",
      apiVersion: "2024-08-01-preview",
      temperature: 0.7,
      maxTokens: 4096,
      timeoutMs: 120000,
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
    provider: "AZURE_OPENAI",
    displayName: row.displayName,
    isActive: row.isActive,
    endpoint: row.endpoint ?? "",
    deploymentName: row.deploymentName ?? "",
    apiVersion: row.apiVersion,
    temperature: row.temperature,
    maxTokens: row.maxTokens,
    timeoutMs: row.timeoutMs,
    hasApiKey: Boolean(row.apiKeyCiphertext),
    apiKeyMasked,
    encryptionConfigured: isSettingsEncryptionConfigured(),
  }
}

export async function getActiveProvider(): Promise<AiProvider | null> {
  const active = await prisma.aiProviderConfig.findFirst({
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
    throw new AiConfigurationError("Azure OpenAI API Key kayıtlı değil.")
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

export async function getDecryptedAzureApiKeyForTest(): Promise<string> {
  const row = await prisma.aiProviderConfig.findUnique({
    where: { provider: AiProvider.AZURE_OPENAI },
  })
  if (!row) throw new AiConfigurationError("Azure OpenAI yapılandırması bulunamadı.")
  return decryptStoredApiKey(row)
}

export async function resolveAzureOpenAiRuntimeConfig(): Promise<AzureOpenAiRuntimeConfig> {
  if (!isSettingsEncryptionConfigured()) {
    throw new AiConfigurationError(
      "SETTINGS_ENCRYPTION_KEY sunucu ortam değişkeni yapılandırılmamış. API anahtarları şifrelenemez."
    )
  }

  const row = await prisma.aiProviderConfig.findUnique({
    where: { provider: AiProvider.AZURE_OPENAI },
  })

  if (!row) {
    throw new AiConfigurationError(
      "Azure OpenAI yapılandırması bulunamadı. Ayarlar sayfasından yapılandırın."
    )
  }

  if (!row.isActive) {
    throw new AiConfigurationError(
      "Azure OpenAI sağlayıcısı pasif. Ayarlar sayfasından etkinleştirin."
    )
  }

  if (!row.endpoint?.trim()) {
    throw new AiConfigurationError("Azure OpenAI Endpoint eksik.")
  }
  if (!row.deploymentName?.trim()) {
    throw new AiConfigurationError("Azure OpenAI Deployment Name eksik.")
  }
  const apiKey = await decryptStoredApiKey(row)

  return {
    endpoint: row.endpoint.trim(),
    apiKey,
    deploymentName: row.deploymentName.trim(),
    apiVersion: row.apiVersion,
    temperature: row.temperature,
    maxTokens: row.maxTokens,
    timeoutMs: row.timeoutMs,
  }
}

/** Build runtime config from form values (test connection before save). */
export function buildRuntimeConfigFromInput(
  input: Omit<AzureOpenAiRuntimeConfig, "apiKey"> & { apiKey: string }
): AzureOpenAiRuntimeConfig {
  return {
    endpoint: input.endpoint.trim(),
    apiKey: input.apiKey,
    deploymentName: input.deploymentName.trim(),
    apiVersion: input.apiVersion.trim(),
    temperature: input.temperature,
    maxTokens: input.maxTokens,
    timeoutMs: input.timeoutMs,
  }
}
