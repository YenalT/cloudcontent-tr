import "server-only"

import { decryptSecret, maskApiKey } from "@/lib/crypto/encryption"
import { isSettingsEncryptionConfigured } from "@/lib/env/settings-encryption"
import { assertValidZapierWebhookUrl } from "@/lib/zapier/zapier-webhook-errors"
import type { ZapierWebhookRuntimeConfig } from "@/lib/zapier/zapier-webhook-types"
import { prisma } from "@/lib/prisma"

export type ZapierSettingsPublic = {
  displayName: string
  isActive: boolean
  hasWebhookUrl: boolean
  webhookUrlMasked: string | null
  hasEnvWebhookUrl: boolean
  timeoutMs: number
  maxRetries: number
  encryptionConfigured: boolean
}

export function maskWebhookUrl(url: string): string {
  try {
    const parsed = new URL(url)
    const parts = parsed.pathname.split("/").filter(Boolean)
    const tail = parts.slice(-2).join("/")
    return `https://${parsed.hostname}/…/${tail || "…"}`
  } catch {
    return maskApiKey(url)
  }
}

function hasEnvWebhookUrl(): boolean {
  const url = process.env.ZAPIER_WEBHOOK_URL?.trim()
  if (!url) return false
  try {
    assertValidZapierWebhookUrl(url)
    return true
  } catch {
    return false
  }
}

export async function getZapierSettingsPublic(): Promise<ZapierSettingsPublic> {
  const row = await prisma.zapierIntegrationConfig.findUnique({
    where: { id: "default" },
  })

  if (!row) {
    return {
      displayName: "Zapier Integration",
      isActive: false,
      hasWebhookUrl: false,
      webhookUrlMasked: null,
      hasEnvWebhookUrl: hasEnvWebhookUrl(),
      timeoutMs: 30000,
      maxRetries: 3,
      encryptionConfigured: isSettingsEncryptionConfigured(),
    }
  }

  let webhookUrlMasked: string | null = null
  if (row.webhookUrlCiphertext && row.webhookUrlIv && row.webhookUrlAuthTag) {
    try {
      const plain = decryptSecret({
        ciphertext: row.webhookUrlCiphertext,
        iv: row.webhookUrlIv,
        authTag: row.webhookUrlAuthTag,
      })
      webhookUrlMasked = maskWebhookUrl(plain)
    } catch {
      webhookUrlMasked = "https://hooks.zapier.com/…"
    }
  }

  return {
    displayName: row.displayName,
    isActive: row.isActive,
    hasWebhookUrl: Boolean(row.webhookUrlCiphertext),
    webhookUrlMasked,
    hasEnvWebhookUrl: hasEnvWebhookUrl(),
    timeoutMs: row.timeoutMs,
    maxRetries: row.maxRetries,
    encryptionConfigured: isSettingsEncryptionConfigured(),
  }
}

async function decryptStoredWebhookUrl(row: {
  webhookUrlCiphertext: string | null
  webhookUrlIv: string | null
  webhookUrlAuthTag: string | null
}): Promise<string> {
  if (!row.webhookUrlCiphertext || !row.webhookUrlIv || !row.webhookUrlAuthTag) {
    throw new Error("Zapier webhook URL kayıtlı değil.")
  }
  try {
    return decryptSecret({
      ciphertext: row.webhookUrlCiphertext,
      iv: row.webhookUrlIv,
      authTag: row.webhookUrlAuthTag,
    })
  } catch {
    throw new Error("Webhook URL çözülemedi. SETTINGS_ENCRYPTION_KEY değişmiş olabilir.")
  }
}

function resolveWebhookUrlFromEnv(): string | null {
  const envUrl = process.env.ZAPIER_WEBHOOK_URL?.trim()
  if (!envUrl) return null
  return assertValidZapierWebhookUrl(envUrl)
}

async function resolveWebhookUrl(row: {
  webhookUrlCiphertext: string | null
  webhookUrlIv: string | null
  webhookUrlAuthTag: string | null
}): Promise<string> {
  if (row.webhookUrlCiphertext && row.webhookUrlIv && row.webhookUrlAuthTag) {
    return assertValidZapierWebhookUrl(await decryptStoredWebhookUrl(row))
  }
  const envUrl = resolveWebhookUrlFromEnv()
  if (envUrl) return envUrl
  throw new Error(
    "Zapier webhook URL yapılandırılmamış. Ayarlar’dan kaydedin veya ZAPIER_WEBHOOK_URL tanımlayın."
  )
}

export async function getDecryptedZapierWebhookUrlForTest(): Promise<string> {
  const row = await prisma.zapierIntegrationConfig.findUnique({
    where: { id: "default" },
  })
  if (!row) {
    throw new Error("Zapier yapılandırması bulunamadı.")
  }
  return resolveWebhookUrl(row)
}

export async function resolveZapierWebhookRuntimeConfig(): Promise<ZapierWebhookRuntimeConfig> {
  const row = await prisma.zapierIntegrationConfig.findUnique({
    where: { id: "default" },
  })

  if (!row) {
    throw new Error("Zapier yapılandırması bulunamadı.")
  }

  if (!row.isActive) {
    throw new Error("Zapier entegrasyonu pasif. Ayarlar sayfasından etkinleştirin.")
  }

  const webhookUrl = await resolveWebhookUrl(row)

  return {
    webhookUrl,
    timeoutMs: row.timeoutMs,
    maxRetries: row.maxRetries,
  }
}

export function buildZapierRuntimeFromInput(input: {
  webhookUrl: string
  timeoutMs: number
  maxRetries: number
}): ZapierWebhookRuntimeConfig {
  return {
    webhookUrl: assertValidZapierWebhookUrl(input.webhookUrl),
    timeoutMs: input.timeoutMs,
    maxRetries: input.maxRetries,
  }
}

export async function getLatestZapierWebhookLog(socialPostId: string) {
  return prisma.zapierWebhookLog.findFirst({
    where: { socialPostId },
    orderBy: { sentAt: "desc" },
    select: {
      id: true,
      success: true,
      responseStatus: true,
      responseBody: true,
      sentAt: true,
      retryCount: true,
      errorMessage: true,
      errorCode: true,
      suggestedAction: true,
      durationMs: true,
      postImageUrl: true,
      webhookUrlMasked: true,
      requestPayloadPreview: true,
      responseHeaders: true,
    },
  })
}
