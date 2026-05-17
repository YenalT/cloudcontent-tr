"use server"

import { revalidatePath } from "next/cache"

import { encryptSecret } from "@/lib/crypto/encryption"
import {
  buildZapierRuntimeFromInput,
  getDecryptedZapierWebhookUrlForTest,
  getZapierSettingsPublic,
} from "@/lib/data/zapier-config"
import { prisma } from "@/lib/prisma"
import { ZapierWebhookService } from "@/lib/zapier/zapier-webhook-service"
import { isZapierWebhookError, toAdminZapierErrorMessage } from "@/lib/zapier/zapier-webhook-errors"
import { zapierSettingsSchema, zapierSettingsTestSchema } from "@/lib/validations/zapier"

export type ZapierSettingsActionState = {
  ok: boolean
  message?: string
  fieldErrors?: Record<string, string[]>
  latencyMs?: number
}

function fieldErrors(error: { flatten: () => { fieldErrors: Record<string, string[]> } }) {
  return error.flatten().fieldErrors
}

function hasEnvWebhookUrl(): boolean {
  return Boolean(process.env.ZAPIER_WEBHOOK_URL?.trim())
}

async function upsertZapierRow() {
  return prisma.zapierIntegrationConfig.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      displayName: "Zapier Integration",
    },
    update: {},
  })
}

async function resolveWebhookUrlForTest(
  webhookUrlFromForm: string | undefined,
  hasStoredUrl: boolean
): Promise<string> {
  if (webhookUrlFromForm?.trim()) return webhookUrlFromForm.trim()
  if (!hasStoredUrl && !hasEnvWebhookUrl()) {
    throw new Error("Test için webhook URL girin veya önce kaydedin.")
  }
  return getDecryptedZapierWebhookUrlForTest()
}

export async function saveZapierSettings(input: unknown): Promise<ZapierSettingsActionState> {
  const parsed = zapierSettingsSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      message: "Ayarlar doğrulanamadı.",
      fieldErrors: fieldErrors(parsed.error),
    }
  }

  const data = parsed.data
  const existing = await upsertZapierRow()

  const shouldUpdateUrl =
    data.updateWebhookUrl === true && Boolean(data.webhookUrl && data.webhookUrl.length > 0)

  if (!existing.webhookUrlCiphertext && !shouldUpdateUrl && !hasEnvWebhookUrl()) {
    return {
      ok: false,
      message:
        "İlk kurulum için webhook URL gereklidir (form veya ZAPIER_WEBHOOK_URL ortam değişkeni).",
    }
  }

  try {
    let urlFields: {
      webhookUrlCiphertext: string
      webhookUrlIv: string
      webhookUrlAuthTag: string
    } | null = null

    if (shouldUpdateUrl && data.webhookUrl) {
      const encrypted = encryptSecret(data.webhookUrl)
      urlFields = {
        webhookUrlCiphertext: encrypted.ciphertext,
        webhookUrlIv: encrypted.iv,
        webhookUrlAuthTag: encrypted.authTag,
      }
    }

    await prisma.zapierIntegrationConfig.update({
      where: { id: "default" },
      data: {
        isActive: data.isActive,
        timeoutMs: data.timeoutMs,
        maxRetries: data.maxRetries,
        ...(urlFields ?? {}),
      },
    })

    revalidatePath("/settings")
    revalidatePath("/instagram")

    return { ok: true, message: "Zapier ayarları kaydedildi." }
  } catch (error) {
    const message =
      isZapierWebhookError(error) || error instanceof Error
        ? toAdminZapierErrorMessage(error)
        : "Ayarlar kaydedilemedi."
    return { ok: false, message }
  }
}

export async function testZapierWebhookConnection(
  input: unknown
): Promise<ZapierSettingsActionState> {
  const parsed = zapierSettingsTestSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      message: "Bağlantı testi için alanları doğrulayın.",
      fieldErrors: fieldErrors(parsed.error),
    }
  }

  const data = parsed.data
  const publicSettings = await getZapierSettingsPublic()
  const started = Date.now()

  try {
    const webhookUrl = await resolveWebhookUrlForTest(
      data.webhookUrl,
      publicSettings.hasWebhookUrl
    )
    const runtime = buildZapierRuntimeFromInput({
      webhookUrl,
      timeoutMs: data.timeoutMs,
      maxRetries: 0,
    })
    const service = new ZapierWebhookService(runtime)
    const result = await service.testConnection()

    if (!result.success) {
      return {
        ok: false,
        message: result.errorMessage ?? "Zapier test webhook başarısız.",
      }
    }

    return {
      ok: true,
      message: `Zapier test webhook başarılı (HTTP ${result.httpStatus ?? 200}).`,
      latencyMs: Date.now() - started,
    }
  } catch (error) {
    return {
      ok: false,
      message: toAdminZapierErrorMessage(error),
    }
  }
}
