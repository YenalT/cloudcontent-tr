"use server"

import { revalidatePath } from "next/cache"
import { AiProvider } from "@prisma/client"

import { encryptSecret } from "@/lib/crypto/encryption"
import { testAzureOpenAiConnection } from "@/lib/ai/azure-openai-client"
import { AiConfigurationError } from "@/lib/ai/errors"
import {
  buildRuntimeConfigFromInput,
  getAzureOpenAiSettingsPublic,
  getDecryptedAzureApiKeyForTest,
} from "@/lib/data/ai-provider-config"
import { clearArticleGenerationServiceCache } from "@/lib/ai/article-generation-service"
import { prisma } from "@/lib/prisma"
import { azureOpenAiSettingsSchema } from "@/lib/validations/ai-provider"

export type SettingsActionState = {
  ok: boolean
  message?: string
  fieldErrors?: Record<string, string[]>
  latencyMs?: number
}

function fieldErrors(error: { flatten: () => { fieldErrors: Record<string, string[]> } }) {
  return error.flatten().fieldErrors
}

async function upsertAzureRow() {
  return prisma.aiProviderConfig.upsert({
    where: { provider: AiProvider.AZURE_OPENAI },
    create: {
      provider: AiProvider.AZURE_OPENAI,
      displayName: "Azure OpenAI",
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
  return getDecryptedAzureApiKeyForTest()
}

export async function saveAzureOpenAiSettings(
  input: unknown
): Promise<SettingsActionState> {
  const parsed = azureOpenAiSettingsSchema.safeParse(input)
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
        await tx.aiProviderConfig.updateMany({
          where: { provider: { not: AiProvider.AZURE_OPENAI } },
          data: { isActive: false },
        })
      }

      await tx.aiProviderConfig.update({
        where: { provider: AiProvider.AZURE_OPENAI },
        data: {
          endpoint: data.endpoint.trim(),
          deploymentName: data.deploymentName.trim(),
          apiVersion: data.apiVersion.trim(),
          temperature: data.temperature,
          maxTokens: data.maxTokens,
          timeoutMs: data.timeoutMs,
          isActive: data.isActive,
          ...(keyFields ?? {}),
        },
      })
    })

    clearArticleGenerationServiceCache()
    revalidatePath("/settings")
    revalidatePath("/articles/new")

    return { ok: true, message: "Azure OpenAI ayarları kaydedildi." }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ayarlar kaydedilemedi."
    return { ok: false, message }
  }
}

export async function testAzureOpenAiSettingsConnection(
  input: unknown
): Promise<SettingsActionState> {
  const parsed = azureOpenAiSettingsSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      message: "Bağlantı testi için alanları doğrulayın.",
      fieldErrors: fieldErrors(parsed.error),
    }
  }

  const data = parsed.data
  const publicSettings = await getAzureOpenAiSettingsPublic()

  try {
    const apiKey = await resolveApiKeyForTest(data.apiKey, publicSettings.hasApiKey)
    const runtime = buildRuntimeConfigFromInput({
      endpoint: data.endpoint,
      deploymentName: data.deploymentName,
      apiVersion: data.apiVersion,
      temperature: data.temperature,
      maxTokens: data.maxTokens,
      timeoutMs: data.timeoutMs,
      apiKey,
    })
    const result = await testAzureOpenAiConnection(runtime)
    return { ok: true, message: result.message, latencyMs: result.latencyMs }
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof AiConfigurationError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Bağlantı testi başarısız.",
    }
  }
}
