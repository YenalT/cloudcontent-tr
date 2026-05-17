import "server-only"

import { ImageGenerationProvider } from "@prisma/client"

import { AiConfigurationError } from "@/lib/ai/errors"
import type {
  OpenAiImageOutputFormat,
  OpenAiImageQuality,
  OpenAiImageRuntimeConfig,
} from "@/lib/ai/openai-image-types"
import { decryptSecret, maskApiKey } from "@/lib/crypto/encryption"
import { isSettingsEncryptionConfigured } from "@/lib/env/settings-encryption"
import { assertAsciiApiKeyHeaderValue } from "@/lib/http/header-utils"
import { prisma } from "@/lib/prisma"

export type OpenAiImageSettingsPublic = {
  provider: "OPENAI"
  displayName: string
  isActive: boolean
  model: string
  quality: string
  outputFormat: string
  timeoutMs: number
  hasApiKey: boolean
  apiKeyMasked: string | null
  hasEnvApiKey: boolean
  encryptionConfigured: boolean
}

const QUALITIES: OpenAiImageQuality[] = ["low", "medium", "high", "auto"]
const FORMATS: OpenAiImageOutputFormat[] = ["png", "jpeg", "webp"]

function parseQuality(value: string): OpenAiImageQuality {
  return QUALITIES.includes(value as OpenAiImageQuality)
    ? (value as OpenAiImageQuality)
    : "high"
}

function parseOutputFormat(value: string): OpenAiImageOutputFormat {
  return FORMATS.includes(value as OpenAiImageOutputFormat)
    ? (value as OpenAiImageOutputFormat)
    : "png"
}

function hasEnvOpenAiApiKey(): boolean {
  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) return false
  try {
    assertAsciiApiKeyHeaderValue(key, "OPENAI_API_KEY")
    return true
  } catch {
    return false
  }
}

export async function getOpenAiImageSettingsPublic(): Promise<OpenAiImageSettingsPublic> {
  const row = await prisma.imageProviderConfig.findUnique({
    where: { provider: ImageGenerationProvider.OPENAI },
  })

  if (!row) {
    return {
      provider: "OPENAI",
      displayName: "OpenAI GPT Image",
      isActive: false,
      model: "gpt-image-1",
      quality: "medium",
      outputFormat: "png",
      timeoutMs: 120000,
      hasApiKey: false,
      apiKeyMasked: null,
      hasEnvApiKey: hasEnvOpenAiApiKey(),
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
    provider: "OPENAI",
    displayName: row.displayName,
    isActive: row.isActive,
    model: row.model,
    quality: row.quality,
    outputFormat: row.outputFormat,
    timeoutMs: row.timeoutMs,
    hasApiKey: Boolean(row.apiKeyCiphertext),
    apiKeyMasked,
    hasEnvApiKey: hasEnvOpenAiApiKey(),
    encryptionConfigured: isSettingsEncryptionConfigured(),
  }
}

export async function getActiveImageGenerationProvider(): Promise<ImageGenerationProvider | null> {
  const active = await prisma.imageProviderConfig.findFirst({
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
    throw new AiConfigurationError("OpenAI API anahtarı kayıtlı değil.")
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

function resolveApiKeyFromEnv(): string | null {
  const envKey = process.env.OPENAI_API_KEY?.trim()
  if (!envKey) return null
  return assertAsciiApiKeyHeaderValue(envKey, "OPENAI_API_KEY")
}

async function resolveOpenAiApiKey(row: {
  apiKeyCiphertext: string | null
  apiKeyIv: string | null
  apiKeyAuthTag: string | null
}): Promise<string> {
  if (row.apiKeyCiphertext && row.apiKeyIv && row.apiKeyAuthTag) {
    return decryptStoredApiKey(row)
  }
  const envKey = resolveApiKeyFromEnv()
  if (envKey) return envKey
  throw new AiConfigurationError(
    "OpenAI API anahtarı yapılandırılmamış. Ayarlar’dan kaydedin veya sunucuda OPENAI_API_KEY tanımlayın."
  )
}

export async function getDecryptedOpenAiApiKeyForTest(): Promise<string> {
  const row = await prisma.imageProviderConfig.findUnique({
    where: { provider: ImageGenerationProvider.OPENAI },
  })
  if (!row) {
    throw new AiConfigurationError("OpenAI görüntü yapılandırması bulunamadı.")
  }
  return resolveOpenAiApiKey(row)
}

export async function resolveOpenAiImageRuntimeConfig(): Promise<OpenAiImageRuntimeConfig> {
  const row = await prisma.imageProviderConfig.findUnique({
    where: { provider: ImageGenerationProvider.OPENAI },
  })

  if (!row) {
    throw new AiConfigurationError(
      "OpenAI görüntü yapılandırması bulunamadı. Ayarlar sayfasından yapılandırın."
    )
  }

  if (!row.isActive) {
    throw new AiConfigurationError(
      "OpenAI görüntü sağlayıcısı pasif. Ayarlar sayfasından etkinleştirin."
    )
  }

  const apiKey = await resolveOpenAiApiKey(row)

  return {
    apiKey,
    model: row.model.trim() || "gpt-image-1",
    quality: parseQuality(row.quality),
    outputFormat: parseOutputFormat(row.outputFormat),
    timeoutMs: row.timeoutMs,
  }
}

export function buildOpenAiImageRuntimeFromInput(
  input: Omit<OpenAiImageRuntimeConfig, "apiKey"> & { apiKey: string }
): OpenAiImageRuntimeConfig {
  return {
    apiKey: assertAsciiApiKeyHeaderValue(input.apiKey, "OpenAI API key"),
    model: input.model.trim() || "gpt-image-1",
    quality: parseQuality(input.quality),
    outputFormat: parseOutputFormat(input.outputFormat),
    timeoutMs: input.timeoutMs,
  }
}
