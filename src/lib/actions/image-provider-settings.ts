"use server"

import { revalidatePath } from "next/cache"
import { ImageGenerationProvider } from "@prisma/client"

import {
  AiConfigurationError,
  isAiConfigurationError,
  isOpenAiImageError,
} from "@/lib/ai/errors"
import { testOpenAiImageConnection } from "@/lib/ai/openai-image-client"
import { encryptSecret } from "@/lib/crypto/encryption"
import {
  buildOpenAiImageRuntimeFromInput,
  getDecryptedOpenAiApiKeyForTest,
  getOpenAiImageSettingsPublic,
} from "@/lib/data/image-provider-config"
import { clearImageGenerationServiceCache } from "@/lib/image-generation/image-generation-service"
import { prisma } from "@/lib/prisma"
import { openAiImageSettingsSchema } from "@/lib/validations/image-provider"

export type ImageSettingsActionState = {
  ok: boolean
  message?: string
  fieldErrors?: Record<string, string[]>
  latencyMs?: number
}

function fieldErrors(error: { flatten: () => { fieldErrors: Record<string, string[]> } }) {
  return error.flatten().fieldErrors
}

function hasEnvOpenAiApiKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim())
}

async function upsertOpenAiRow() {
  return prisma.imageProviderConfig.upsert({
    where: { provider: ImageGenerationProvider.OPENAI },
    create: {
      provider: ImageGenerationProvider.OPENAI,
      displayName: "OpenAI GPT Image",
    },
    update: {},
  })
}

async function resolveApiKeyForTest(
  apiKeyFromForm: string | undefined,
  hasStoredKey: boolean
): Promise<string> {
  if (apiKeyFromForm?.trim()) return apiKeyFromForm.trim()
  if (!hasStoredKey && !hasEnvOpenAiApiKey()) {
    throw new AiConfigurationError("Test için API anahtarı girin veya önce kaydedin.")
  }
  return getDecryptedOpenAiApiKeyForTest()
}

export async function saveOpenAiImageSettings(
  input: unknown
): Promise<ImageSettingsActionState> {
  const parsed = openAiImageSettingsSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      message: "Ayarlar doğrulanamadı.",
      fieldErrors: fieldErrors(parsed.error),
    }
  }

  const data = parsed.data
  const existing = await upsertOpenAiRow()

  const shouldUpdateKey =
    data.updateApiKey === true && Boolean(data.apiKey && data.apiKey.trim().length > 0)

  if (!existing.apiKeyCiphertext && !shouldUpdateKey && !hasEnvOpenAiApiKey()) {
    return {
      ok: false,
      message:
        "İlk kurulum için API anahtarı gereklidir (form veya OPENAI_API_KEY ortam değişkeni).",
    }
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
        await tx.imageProviderConfig.updateMany({
          where: { provider: { not: ImageGenerationProvider.OPENAI } },
          data: { isActive: false },
        })
      }

      await tx.imageProviderConfig.update({
        where: { provider: ImageGenerationProvider.OPENAI },
        data: {
          model: data.model.trim(),
          quality: data.quality,
          outputFormat: data.outputFormat,
          timeoutMs: data.timeoutMs,
          isActive: data.isActive,
          ...(keyFields ?? {}),
        },
      })
    })

    clearImageGenerationServiceCache()
    revalidatePath("/settings")
    revalidatePath("/instagram")

    return { ok: true, message: "OpenAI görüntü ayarları kaydedildi." }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ayarlar kaydedilemedi."
    return { ok: false, message }
  }
}

export async function testOpenAiImageSettingsConnection(
  input: unknown
): Promise<ImageSettingsActionState> {
  const parsed = openAiImageSettingsSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      message: "Bağlantı testi için alanları doğrulayın.",
      fieldErrors: fieldErrors(parsed.error),
    }
  }

  const data = parsed.data
  const publicSettings = await getOpenAiImageSettingsPublic()

  try {
    const apiKey = await resolveApiKeyForTest(data.apiKey, publicSettings.hasApiKey)
    const runtime = buildOpenAiImageRuntimeFromInput({
      model: data.model,
      quality: data.quality,
      outputFormat: data.outputFormat,
      timeoutMs: data.timeoutMs,
      apiKey,
    })
    const result = await testOpenAiImageConnection(runtime)
    return { ok: true, message: result.message, latencyMs: result.latencyMs }
  } catch (error) {
    return {
      ok: false,
      message: isAiConfigurationError(error)
        ? error.message
        : isOpenAiImageError(error)
          ? error.message
          : error instanceof Error
            ? error.message
            : "Bağlantı testi başarısız.",
    }
  }
}
